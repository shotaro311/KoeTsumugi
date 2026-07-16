use anyhow::{anyhow, Result};
use log::{debug, info, warn};
use std::ops::Range;
use std::time::Instant;
use transcribe_cpp::{Error as TranscribeError, RunOptions, Session};

const SAMPLE_RATE: usize = 16_000;
const PRIMARY_MAX_SAMPLES: usize = 30 * SAMPLE_RATE;
const PRIMARY_SEARCH_SAMPLES: usize = 5 * SAMPLE_RATE;
const PRIMARY_MIN_TAIL_SAMPLES: usize = 5 * SAMPLE_RATE;
const RETRY_MAX_SAMPLES: usize = 20 * SAMPLE_RATE;
const RETRY_MIN_PART_SAMPLES: usize = 4 * SAMPLE_RATE;
const ENERGY_WINDOW_SAMPLES: usize = SAMPLE_RATE / 10;
const DISABLE_ENV: &str = "HANDY_DISABLE_COHERE_LONG_FORM_CHUNKING";

#[derive(Debug)]
enum ChunkFailure {
    Retryable {
        kind: &'static str,
        message: String,
        partial_chars: Option<usize>,
    },
    Fatal(String),
}

impl ChunkFailure {
    fn message(&self) -> &str {
        match self {
            Self::Retryable { message, .. } | Self::Fatal(message) => message,
        }
    }
}

pub(crate) fn transcribe(
    session: &mut Session,
    audio: &[f32],
    run_options: &RunOptions,
    language: &str,
    model_id: &str,
) -> Result<String> {
    if long_form_disabled() {
        if audio.len() > PRIMARY_MAX_SAMPLES {
            warn!(
                "Cohere long-form chunking disabled by {}: model='{}', duration={:.2}s, mode=single",
                DISABLE_ENV,
                model_id,
                samples_to_seconds(audio.len())
            );
        }
        return session
            .run(audio, run_options)
            .map(|transcript| transcript.text)
            .map_err(|error| anyhow!("transcribe-cpp transcription failed: {error}"));
    }

    let ranges = plan_ranges(
        audio,
        PRIMARY_MAX_SAMPLES,
        PRIMARY_SEARCH_SAMPLES,
        PRIMARY_MIN_TAIL_SAMPLES,
    );
    let mode = if ranges.len() == 1 {
        "single"
    } else {
        "chunked"
    };
    info!(
        "Cohere transcription plan: model='{}', mode={}, duration={:.2}s, chunks={}",
        model_id,
        mode,
        samples_to_seconds(audio.len()),
        ranges.len()
    );

    let started = Instant::now();
    let mut run = |chunk: &[f32]| match session.run(chunk, run_options) {
        Ok(transcript) => Ok(transcript.text),
        Err(error) => Err(classify_error(error)),
    };
    let text = execute_ranges(audio, &ranges, language, &mut run)?;
    let elapsed = started.elapsed();
    let duration_seconds = samples_to_seconds(audio.len());
    let real_time_factor = if duration_seconds > 0.0 {
        elapsed.as_secs_f64() / duration_seconds
    } else {
        0.0
    };
    info!(
        "Cohere transcription complete: model='{}', mode={}, chunks={}, elapsed={:.2}s, rtf={:.3}, chars={}",
        model_id,
        mode,
        ranges.len(),
        elapsed.as_secs_f64(),
        real_time_factor,
        text.chars().count()
    );
    Ok(text)
}

fn classify_error(error: TranscribeError) -> ChunkFailure {
    let partial_chars = error
        .partial()
        .map(|transcript| transcript.text.chars().count());
    let message = error.to_string();

    match error {
        TranscribeError::OutputTruncated { .. } => ChunkFailure::Retryable {
            kind: "output_truncated",
            message,
            partial_chars,
        },
        TranscribeError::InputTooLong(_) => ChunkFailure::Retryable {
            kind: "input_too_long",
            message,
            partial_chars: None,
        },
        _ => ChunkFailure::Fatal(message),
    }
}

fn execute_ranges<F>(
    audio: &[f32],
    ranges: &[Range<usize>],
    language: &str,
    run: &mut F,
) -> Result<String>
where
    F: FnMut(&[f32]) -> std::result::Result<String, ChunkFailure>,
{
    let mut fragments = Vec::with_capacity(ranges.len());

    for (index, range) in ranges.iter().enumerate() {
        debug!(
            "Cohere chunk {}/{}: start={:.2}s, end={:.2}s, duration={:.2}s",
            index + 1,
            ranges.len(),
            samples_to_seconds(range.start),
            samples_to_seconds(range.end),
            samples_to_seconds(range.len())
        );
        let started = Instant::now();

        match run(&audio[range.clone()]) {
            Ok(text) => {
                debug!(
                    "Cohere chunk {}/{} complete: elapsed={:.2}s, chars={}",
                    index + 1,
                    ranges.len(),
                    started.elapsed().as_secs_f64(),
                    text.chars().count()
                );
                fragments.push(text);
            }
            Err(ChunkFailure::Retryable {
                kind,
                message,
                partial_chars,
            }) => {
                warn!(
                    "Cohere chunk {}/{} requires retry: kind={}, duration={:.2}s, partial_chars={:?}, error={}",
                    index + 1,
                    ranges.len(),
                    kind,
                    samples_to_seconds(range.len()),
                    partial_chars,
                    message
                );
                fragments.push(retry_range(
                    audio,
                    range,
                    language,
                    index,
                    ranges.len(),
                    run,
                )?);
            }
            Err(ChunkFailure::Fatal(message)) => {
                return Err(anyhow!(
                    "transcribe-cpp Cohere chunk {}/{} failed: {}",
                    index + 1,
                    ranges.len(),
                    message
                ));
            }
        }
    }

    Ok(join_fragments(fragments, language))
}

fn retry_range<F>(
    audio: &[f32],
    range: &Range<usize>,
    language: &str,
    parent_index: usize,
    parent_count: usize,
    run: &mut F,
) -> Result<String>
where
    F: FnMut(&[f32]) -> std::result::Result<String, ChunkFailure>,
{
    let chunk = &audio[range.clone()];
    let retry_ranges = plan_retry_ranges(chunk);
    if retry_ranges.len() < 2 {
        return Err(anyhow!(
            "transcribe-cpp Cohere chunk {}/{} could not be split further after truncation",
            parent_index + 1,
            parent_count
        ));
    }

    warn!(
        "Retrying Cohere chunk {}/{} as {} smaller chunks",
        parent_index + 1,
        parent_count,
        retry_ranges.len()
    );
    let mut fragments = Vec::with_capacity(retry_ranges.len());
    for (retry_index, retry_range) in retry_ranges.iter().enumerate() {
        let absolute_start = range.start + retry_range.start;
        let absolute_end = range.start + retry_range.end;
        debug!(
            "Cohere retry chunk {}/{} for parent {}/{}: start={:.2}s, end={:.2}s, duration={:.2}s",
            retry_index + 1,
            retry_ranges.len(),
            parent_index + 1,
            parent_count,
            samples_to_seconds(absolute_start),
            samples_to_seconds(absolute_end),
            samples_to_seconds(retry_range.len())
        );

        match run(&chunk[retry_range.clone()]) {
            Ok(text) => fragments.push(text),
            Err(failure) => {
                return Err(anyhow!(
                    "transcribe-cpp Cohere retry chunk {}/{} for parent {}/{} failed: {}",
                    retry_index + 1,
                    retry_ranges.len(),
                    parent_index + 1,
                    parent_count,
                    failure.message()
                ));
            }
        }
    }

    Ok(join_fragments(fragments, language))
}

fn plan_retry_ranges(audio: &[f32]) -> Vec<Range<usize>> {
    let ranges = plan_ranges(
        audio,
        RETRY_MAX_SAMPLES,
        PRIMARY_SEARCH_SAMPLES,
        PRIMARY_MIN_TAIL_SAMPLES,
    );
    if ranges.len() >= 2 {
        return ranges;
    }

    if audio.len() < RETRY_MIN_PART_SAMPLES * 2 {
        return ranges;
    }

    let midpoint = audio.len() / 2;
    let half_search = PRIMARY_SEARCH_SAMPLES / 2;
    let search_start = midpoint
        .saturating_sub(half_search)
        .max(RETRY_MIN_PART_SAMPLES);
    let search_end = midpoint
        .saturating_add(half_search)
        .min(audio.len() - RETRY_MIN_PART_SAMPLES);
    let split = quietest_boundary(audio, search_start, search_end);
    vec![0..split, split..audio.len()]
}

fn plan_ranges(
    audio: &[f32],
    max_samples: usize,
    search_samples: usize,
    min_tail_samples: usize,
) -> Vec<Range<usize>> {
    if audio.len() <= max_samples || audio.is_empty() {
        return single_range(audio.len());
    }

    let mut ranges = Vec::new();
    let mut start = 0;
    while audio.len() - start > max_samples {
        let target_end = start + max_samples;
        let latest_split = target_end.min(audio.len().saturating_sub(min_tail_samples));
        let earliest_split = target_end.saturating_sub(search_samples).max(start + 1);
        let split = if latest_split > earliest_split {
            quietest_boundary(audio, earliest_split, latest_split)
        } else {
            start + (audio.len() - start) / 2
        }
        .clamp(start + 1, target_end);

        ranges.push(start..split);
        start = split;
    }
    ranges.push(start..audio.len());
    ranges
}

fn single_range(end: usize) -> Vec<Range<usize>> {
    std::iter::once(0..end).collect()
}

fn quietest_boundary(audio: &[f32], search_start: usize, search_end: usize) -> usize {
    let search_start = search_start.min(audio.len());
    let search_end = search_end.min(audio.len());
    if search_end <= search_start + 1 {
        return search_start + (search_end - search_start) / 2;
    }

    let mut best_energy = f64::INFINITY;
    let mut best_boundary = search_start + (search_end - search_start) / 2;
    let mut window_start = search_start;
    while window_start < search_end {
        let window_end = (window_start + ENERGY_WINDOW_SAMPLES).min(search_end);
        let energy = rms(&audio[window_start..window_end]);
        if energy <= best_energy {
            best_energy = energy;
            best_boundary = window_end;
        }
        window_start = window_end;
    }
    best_boundary
}

fn rms(audio: &[f32]) -> f64 {
    if audio.is_empty() {
        return 0.0;
    }
    let square_sum = audio
        .iter()
        .map(|sample| {
            let sample = f64::from(*sample);
            sample * sample
        })
        .sum::<f64>();
    (square_sum / audio.len() as f64).sqrt()
}

fn join_fragments(fragments: Vec<String>, language: &str) -> String {
    let fragments = fragments
        .into_iter()
        .map(|fragment| fragment.trim().to_string())
        .filter(|fragment| !fragment.is_empty())
        .collect::<Vec<_>>();
    let mut joined = String::new();
    for fragment in fragments {
        if !joined.is_empty() && needs_separator(&joined, &fragment, language) {
            joined.push(' ');
        }
        joined.push_str(&fragment);
    }
    joined
}

fn is_no_space_language(language: &str) -> bool {
    matches!(
        language
            .trim()
            .to_ascii_lowercase()
            .split(['-', '_'])
            .next(),
        Some("ja" | "zh")
    )
}

fn needs_separator(previous: &str, next: &str, language: &str) -> bool {
    if is_no_space_language(language) {
        return false;
    }

    let Some(previous_char) = previous.chars().next_back() else {
        return false;
    };
    let Some(next_char) = next.chars().next() else {
        return false;
    };

    if is_cjk_text(previous_char)
        || is_cjk_text(next_char)
        || is_opening_punctuation(previous_char)
        || is_closing_punctuation(next_char)
    {
        return false;
    }
    true
}

fn is_cjk_text(character: char) -> bool {
    matches!(
        character as u32,
        0x2E80..=0x2FDF
            | 0x3000..=0x30FF
            | 0x31F0..=0x31FF
            | 0x3400..=0x4DBF
            | 0x4E00..=0x9FFF
            | 0xF900..=0xFAFF
            | 0xFF00..=0xFFEF
            | 0x20000..=0x2FA1F
    )
}

fn is_opening_punctuation(character: char) -> bool {
    matches!(character, '(' | '[' | '{')
}

fn is_closing_punctuation(character: char) -> bool {
    matches!(
        character,
        ',' | '.' | ';' | ':' | '!' | '?' | '%' | ')' | ']' | '}'
    )
}

fn long_form_disabled() -> bool {
    env_flag_enabled(std::env::var(DISABLE_ENV).ok().as_deref())
}

fn env_flag_enabled(value: Option<&str>) -> bool {
    match value {
        Some(value) => !matches!(
            value.trim().to_ascii_lowercase().as_str(),
            "" | "0" | "false" | "no" | "off"
        ),
        None => false,
    }
}

fn samples_to_seconds(samples: usize) -> f64 {
    samples as f64 / SAMPLE_RATE as f64
}

#[cfg(test)]
mod tests {
    use super::*;

    fn assert_complete_coverage(ranges: &[Range<usize>], total: usize, max: usize) {
        assert_eq!(ranges.first().map(|range| range.start), Some(0));
        assert_eq!(ranges.last().map(|range| range.end), Some(total));
        for pair in ranges.windows(2) {
            assert_eq!(pair[0].end, pair[1].start);
        }
        assert!(ranges.iter().all(|range| !range.is_empty()));
        assert!(ranges.iter().all(|range| range.len() <= max));
        assert_eq!(ranges.iter().map(Range::len).sum::<usize>(), total);
    }

    #[test]
    fn short_audio_stays_in_one_chunk() {
        let audio = vec![0.0; PRIMARY_MAX_SAMPLES];
        assert_eq!(
            plan_ranges(
                &audio,
                PRIMARY_MAX_SAMPLES,
                PRIMARY_SEARCH_SAMPLES,
                PRIMARY_MIN_TAIL_SAMPLES
            ),
            vec![0..PRIMARY_MAX_SAMPLES]
        );
    }

    #[test]
    fn audio_over_thirty_seconds_is_split_without_holes_or_overlap() {
        let total = PRIMARY_MAX_SAMPLES + 1;
        let audio = vec![0.0; total];
        let ranges = plan_ranges(
            &audio,
            PRIMARY_MAX_SAMPLES,
            PRIMARY_SEARCH_SAMPLES,
            PRIMARY_MIN_TAIL_SAMPLES,
        );
        assert!(ranges.len() >= 2);
        assert_complete_coverage(&ranges, total, PRIMARY_MAX_SAMPLES);
        assert!(ranges.last().unwrap().len() >= PRIMARY_MIN_TAIL_SAMPLES);
    }

    #[test]
    fn long_audio_ranges_are_bounded_and_deterministic() {
        let total = 5 * 60 * SAMPLE_RATE + 1_337;
        let audio = vec![0.01; total];
        let first = plan_ranges(
            &audio,
            PRIMARY_MAX_SAMPLES,
            PRIMARY_SEARCH_SAMPLES,
            PRIMARY_MIN_TAIL_SAMPLES,
        );
        let second = plan_ranges(
            &audio,
            PRIMARY_MAX_SAMPLES,
            PRIMARY_SEARCH_SAMPLES,
            PRIMARY_MIN_TAIL_SAMPLES,
        );
        assert_eq!(first, second);
        assert_complete_coverage(&first, total, PRIMARY_MAX_SAMPLES);
    }

    #[test]
    fn low_energy_window_is_used_as_the_boundary() {
        let total = 40 * SAMPLE_RATE;
        let mut audio = vec![0.8; total];
        let quiet_start = 28 * SAMPLE_RATE;
        let quiet_end = quiet_start + ENERGY_WINDOW_SAMPLES;
        audio[quiet_start..quiet_end].fill(0.0);

        let ranges = plan_ranges(
            &audio,
            PRIMARY_MAX_SAMPLES,
            PRIMARY_SEARCH_SAMPLES,
            PRIMARY_MIN_TAIL_SAMPLES,
        );
        assert_eq!(ranges[0].end, quiet_end);
        assert_complete_coverage(&ranges, total, PRIMARY_MAX_SAMPLES);
    }

    #[test]
    fn japanese_and_chinese_fragments_join_without_added_spaces() {
        assert_eq!(
            join_fragments(
                vec!["最初です。".into(), " 次です。 ".into(), "".into()],
                "ja-JP"
            ),
            "最初です。次です。"
        );
        assert_eq!(
            join_fragments(vec!["第一段。".into(), "第二段。".into()], "zh"),
            "第一段。第二段。"
        );
    }

    #[test]
    fn auto_language_uses_unicode_boundaries_for_japanese_and_chinese() {
        assert_eq!(
            join_fragments(vec!["最初です。".into(), "次です。".into()], "auto"),
            "最初です。次です。"
        );
        assert_eq!(
            join_fragments(vec!["第一段。".into(), "第二段。".into()], "auto"),
            "第一段。第二段。"
        );
    }

    #[test]
    fn space_delimited_languages_join_with_one_space() {
        assert_eq!(
            join_fragments(
                vec![" first part ".into(), "".into(), "second part".into()],
                "en"
            ),
            "first part second part"
        );
        assert_eq!(
            join_fragments(vec!["First sentence.".into(), "Next one.".into()], "auto"),
            "First sentence. Next one."
        );
        assert_eq!(
            join_fragments(vec!["word".into(), ",".into(), "next".into()], "en"),
            "word, next"
        );
    }

    #[test]
    fn truncated_chunk_is_replaced_by_smaller_retry_results() {
        let audio = vec![0.1; 30 * SAMPLE_RATE];
        let ranges = single_range(audio.len());
        let mut calls = 0;
        let mut run = |_chunk: &[f32]| {
            calls += 1;
            if calls == 1 {
                Err(ChunkFailure::Retryable {
                    kind: "output_truncated",
                    message: "truncated".into(),
                    partial_chars: Some(12),
                })
            } else if calls == 2 {
                Ok("前半。".into())
            } else {
                Ok("後半。".into())
            }
        };

        let text = execute_ranges(&audio, &ranges, "ja", &mut run).unwrap();
        assert_eq!(text, "前半。後半。");
        assert!(calls >= 3);
    }

    #[test]
    fn failed_retry_does_not_return_a_silent_partial_success() {
        let audio = vec![0.1; 30 * SAMPLE_RATE];
        let ranges = single_range(audio.len());
        let mut calls = 0;
        let mut run = |_chunk: &[f32]| {
            calls += 1;
            Err(ChunkFailure::Retryable {
                kind: "output_truncated",
                message: format!("truncated call {calls}"),
                partial_chars: Some(12),
            })
        };

        let error = execute_ranges(&audio, &ranges, "ja", &mut run).unwrap_err();
        assert!(error.to_string().contains("retry chunk"));
        assert_eq!(calls, 2);
    }

    #[test]
    fn environment_flag_matches_existing_handy_truthy_convention() {
        for value in ["1", "true", "TRUE", " yes ", "on", "anything"] {
            assert!(env_flag_enabled(Some(value)), "{value}");
        }
        for value in ["", "0", "false", "FALSE", " no ", "off"] {
            assert!(!env_flag_enabled(Some(value)), "{value}");
        }
        assert!(!env_flag_enabled(None));
    }
}
