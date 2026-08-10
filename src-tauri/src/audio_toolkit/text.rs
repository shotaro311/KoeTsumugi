use std::collections::{HashMap, HashSet};

use crate::settings::CustomDictionaryEntry;
use natural::phonetics::soundex;
use once_cell::sync::Lazy;
use regex::Regex;
use strsim::levenshtein;

struct MatchCandidate<'a> {
    output: &'a str,
    normalized_trigger: String,
}

fn normalize_lookup_key(value: &str) -> String {
    value
        .chars()
        .filter(|c| c.is_alphanumeric())
        .flat_map(|c| c.to_lowercase())
        .collect()
}

/// Builds an n-gram string by cleaning and concatenating words
///
/// Strips punctuation from each word, lowercases, and joins without spaces.
/// This allows matching "Charge B" against "ChargeBee".
fn build_ngram(words: &[&str]) -> String {
    normalize_lookup_key(&words.concat())
}

fn build_matchers<'a>(
    entries: &'a [CustomDictionaryEntry],
) -> (HashMap<String, &'a str>, Vec<MatchCandidate<'a>>) {
    let mut ownership: HashMap<String, Option<&'a str>> = HashMap::new();
    let mut candidates = Vec::new();

    for entry in entries.iter().filter(|entry| entry.use_in_post_process) {
        let output = entry.output.trim();
        if output.is_empty() {
            continue;
        }

        let mut seen = HashSet::new();
        for trigger in std::iter::once(output).chain(entry.aliases.iter().map(String::as_str)) {
            let mut variants = vec![trigger.to_string()];
            if trigger.contains('&') {
                variants.push(trigger.replace('&', " and "));
            }

            for variant in variants {
                let normalized_trigger = normalize_lookup_key(&variant);
                if normalized_trigger.is_empty() || !seen.insert(normalized_trigger.clone()) {
                    continue;
                }

                ownership
                    .entry(normalized_trigger.clone())
                    .and_modify(|owner| {
                        if owner.is_some_and(|existing| existing != output) {
                            *owner = None;
                        }
                    })
                    .or_insert(Some(output));
                candidates.push(MatchCandidate {
                    output,
                    normalized_trigger,
                });
            }
        }
    }

    // A trigger that points at more than one output is unsafe. Ignore every
    // owner for that trigger instead of making replacement depend on entry order.
    let exact_matches = ownership
        .iter()
        .filter_map(|(trigger, output)| output.map(|output| (trigger.clone(), output)))
        .collect();
    let mut seen = HashSet::new();
    let fuzzy_candidates = candidates
        .into_iter()
        .filter(|candidate| {
            is_supported_fuzzy_key(&candidate.normalized_trigger)
                && ownership
                    .get(&candidate.normalized_trigger)
                    .is_some_and(|owner| *owner == Some(candidate.output))
                && seen.insert((candidate.normalized_trigger.clone(), candidate.output))
        })
        .collect();

    (exact_matches, fuzzy_candidates)
}

fn apply_direct_alias_replacements(text: &str, entries: &[CustomDictionaryEntry]) -> String {
    let mut ownership: HashMap<String, Option<&str>> = HashMap::new();
    let mut candidates = Vec::new();

    for entry in entries.iter().filter(|entry| entry.use_in_post_process) {
        let output = entry.output.trim();
        if output.is_empty() {
            continue;
        }

        for trigger in std::iter::once(output).chain(entry.aliases.iter().map(String::as_str)) {
            let trigger = trigger.trim();
            let normalized = normalize_lookup_key(trigger);
            if normalized.is_empty() {
                continue;
            }
            ownership
                .entry(normalized.clone())
                .and_modify(|owner| {
                    if owner.is_some_and(|existing| existing != output) {
                        *owner = None;
                    }
                })
                .or_insert(Some(output));

            if trigger != output && !trigger.is_ascii() {
                candidates.push((trigger, output, normalized));
            }
        }
    }

    candidates.retain(|(_, output, normalized)| {
        ownership
            .get(normalized)
            .is_some_and(|owner| *owner == Some(*output))
    });
    candidates.sort_by(
        |(left_alias, left_output, _), (right_alias, right_output, _)| {
            right_alias
                .chars()
                .count()
                .cmp(&left_alias.chars().count())
                .then_with(|| left_alias.cmp(right_alias))
                .then_with(|| left_output.cmp(right_output))
        },
    );
    candidates.dedup_by(|left, right| left.0 == right.0 && left.1 == right.1);

    let mut replaced = text.to_string();
    for (alias, output, _) in candidates {
        replaced = replaced.replace(alias, output);
    }

    replaced
}

fn max_ngram_len(entries: &[CustomDictionaryEntry]) -> usize {
    entries
        .iter()
        .filter(|entry| entry.use_in_post_process)
        .flat_map(|entry| {
            std::iter::once(entry.output.as_str()).chain(entry.aliases.iter().map(String::as_str))
        })
        .map(|trigger| trigger.split_whitespace().count().max(1))
        .max()
        .unwrap_or(1)
        .clamp(3, 6)
}

fn is_supported_fuzzy_key(key: &str) -> bool {
    !key.is_empty() && key.chars().all(|c| c.is_ascii_alphanumeric())
}

fn supports_soundex(key: &str) -> bool {
    !key.is_empty() && key.chars().all(|c| c.is_ascii_alphabetic())
}

/// Finds the best matching custom word for a candidate string
///
/// Uses Levenshtein distance and Soundex phonetic matching to find
/// the best match above the given threshold.
///
/// # Arguments
/// * `candidate` - The cleaned/lowercased candidate string to match
/// * `candidates` - Flattened custom dictionary triggers
/// * `threshold` - Maximum similarity score to accept
///
/// # Returns
/// The best matching custom word and its score, if any match was found
fn find_best_match<'a>(
    candidate: &str,
    candidates: &'a [MatchCandidate<'a>],
    threshold: f64,
) -> Option<(&'a str, f64)> {
    if !is_supported_fuzzy_key(candidate) || candidate.chars().count() > 50 {
        return None;
    }

    let mut best_match: Option<&str> = None;
    let mut best_score = f64::MAX;

    for entry in candidates {
        // Skip if lengths are too different (optimization + prevents over-matching)
        // Use percentage-based check: max 25% length difference (prevents n-grams from
        // matching significantly shorter custom words, e.g., "openaigpt" vs "openai")
        let candidate_len = candidate.chars().count();
        let custom_word_len = entry.normalized_trigger.chars().count();
        let len_diff = candidate_len.abs_diff(custom_word_len) as f64;
        let max_len = candidate_len.max(custom_word_len) as f64;
        let max_allowed_diff = (max_len * 0.25).max(2.0); // At least 2 chars difference allowed
        if len_diff > max_allowed_diff {
            continue;
        }

        // Calculate Levenshtein distance (normalized by length)
        let levenshtein_dist = levenshtein(candidate, &entry.normalized_trigger);
        let levenshtein_score = if max_len > 0.0 {
            levenshtein_dist as f64 / max_len
        } else {
            1.0
        };

        // Soundex is an English/ASCII phonetic algorithm. Numeric terms can
        // still use edit distance, but must not receive a phonetic boost.
        let phonetic_match = supports_soundex(candidate)
            && supports_soundex(&entry.normalized_trigger)
            && soundex(candidate, &entry.normalized_trigger);

        // Combine scores: favor phonetic matches, but also consider string similarity
        let combined_score = if phonetic_match {
            levenshtein_score * 0.3 // Give significant boost to phonetic matches
        } else {
            levenshtein_score
        };

        // Accept if the score is good enough (configurable threshold)
        if combined_score < threshold && combined_score < best_score {
            best_match = Some(entry.output);
            best_score = combined_score;
        }
    }

    best_match.map(|m| (m, best_score))
}

/// Applies custom word corrections to transcribed text using fuzzy matching
///
/// This function corrects words in the input text by finding the best matches
/// from a custom dictionary using a combination of:
/// - Exact alias/output matches (fast path)
/// - Levenshtein distance for string similarity
/// - Soundex phonetic matching for pronunciation similarity on ASCII text
/// - N-gram matching for multi-word speech artifacts (e.g., "Charge B" -> "ChargeBee")
///
/// # Arguments
/// * `text` - The input text to correct
/// * `custom_words` - List of custom dictionary entries
/// * `threshold` - Maximum similarity score to accept (0.0 = exact match, 1.0 = any match)
///
/// # Returns
/// The corrected text with custom words applied
pub fn apply_custom_words(
    text: &str,
    custom_words: &[CustomDictionaryEntry],
    threshold: f64,
) -> String {
    if !custom_words.iter().any(|entry| entry.use_in_post_process) {
        return text.to_string();
    }

    let direct_replaced = apply_direct_alias_replacements(text, custom_words);
    let (exact_matches, fuzzy_candidates) = build_matchers(custom_words);
    let max_ngram_len = max_ngram_len(custom_words);

    let words: Vec<&str> = direct_replaced.split_whitespace().collect();
    if words.is_empty() {
        return direct_replaced;
    }

    let mut result = Vec::new();
    let mut i = 0;

    while i < words.len() {
        let mut best_match: Option<(usize, &str, f64)> = None;

        // Exact aliases may be longer than three words. Fuzzy matching stays
        // capped at three words to avoid consuming unrelated trailing text.
        for n in (1..=max_ngram_len).rev() {
            if i + n > words.len() {
                continue;
            }

            let ngram_words = &words[i..i + n];
            // Do not consume across a punctuation boundary. In
            // "Charge B, che", the comma closes the candidate at "B,".
            if ngram_words[..n.saturating_sub(1)]
                .iter()
                .any(|word| !extract_punctuation(word).1.is_empty())
            {
                continue;
            }
            let ngram = build_ngram(ngram_words);
            if ngram.is_empty() {
                continue;
            }

            let replacement = exact_matches
                .get(&ngram)
                .copied()
                .map(|replacement| (replacement, 0.0))
                .or_else(|| {
                    (n <= 3)
                        .then(|| find_best_match(&ngram, &fuzzy_candidates, threshold))
                        .flatten()
                });

            if let Some((replacement, score)) = replacement {
                let is_better = best_match
                    .as_ref()
                    .is_none_or(|(_, _, best_score)| score < *best_score);
                if is_better {
                    best_match = Some((n, replacement, score));
                }
            }
        }

        if let Some((n, replacement, _)) = best_match {
            let ngram_words = &words[i..i + n];
            // Extract punctuation from first and last words of the n-gram.
            let (prefix, _) = extract_punctuation(ngram_words[0]);
            let (_, suffix) = extract_punctuation(ngram_words[n - 1]);

            // Preserve case from first word.
            let corrected = preserve_case_pattern(ngram_words[0], replacement);

            result.push(format!("{}{}{}", prefix, corrected, suffix));
            i += n;
        } else {
            result.push(words[i].to_string());
            i += 1;
        }
    }

    result.join(" ")
}

/// Preserves the case pattern of the original word when applying a replacement
fn preserve_case_pattern(original: &str, replacement: &str) -> String {
    if original.chars().all(|c| c.is_uppercase()) {
        replacement.to_uppercase()
    } else if original.chars().next().is_some_and(|c| c.is_uppercase()) {
        let mut chars: Vec<char> = replacement.chars().collect();
        if let Some(first_char) = chars.get_mut(0) {
            *first_char = first_char.to_uppercase().next().unwrap_or(*first_char);
        }
        chars.into_iter().collect()
    } else {
        replacement.to_string()
    }
}

/// Extracts punctuation prefix and suffix from a word
fn extract_punctuation(word: &str) -> (&str, &str) {
    // String slices use byte offsets. Derive both boundaries from char_indices
    // so multibyte punctuation such as `。` and `「」` can never be split.
    let prefix_end = word
        .char_indices()
        .find(|(_, c)| c.is_alphanumeric())
        .map(|(index, _)| index)
        .unwrap_or(word.len());
    let suffix_start = word
        .char_indices()
        .rev()
        .find(|(_, c)| c.is_alphanumeric())
        .map(|(index, c)| index + c.len_utf8())
        .unwrap_or(0);

    let prefix = if prefix_end > 0 {
        &word[..prefix_end]
    } else {
        ""
    };

    let suffix = if suffix_start < word.len() {
        &word[suffix_start..]
    } else {
        ""
    };

    (prefix, suffix)
}

/// Returns filler words appropriate for the given language code.
///
/// Some words like "um" and "ha" are real words in certain languages
/// (e.g., Portuguese "um" = "a/an", Spanish "ha" = "has"), so we only
/// include them as fillers for languages where they are truly fillers.
fn get_filler_words_for_language(lang: &str) -> &'static [&'static str] {
    let base_lang = lang.split(&['-', '_'][..]).next().unwrap_or(lang);

    match base_lang {
        "en" => &[
            "uh", "um", "uhm", "umm", "uhh", "uhhh", "ah", "hmm", "hm", "mmm", "mm", "mh", "eh",
            "ehh", "ha",
        ],
        "es" => &["ehm", "mmm", "hmm", "hm"],
        "pt" => &["ahm", "hmm", "mmm", "hm"],
        "fr" => &["euh", "hmm", "hm", "mmm"],
        "de" => &["äh", "ähm", "hmm", "hm", "mmm"],
        "it" => &["ehm", "hmm", "mmm", "hm"],
        "cs" => &["ehm", "hmm", "mmm", "hm"],
        "pl" => &["hmm", "mmm", "hm"],
        "tr" => &["hmm", "mmm", "hm"],
        "ru" => &["хм", "ммм", "hmm", "mmm"],
        "uk" => &["хм", "ммм", "hmm", "mmm"],
        "ar" => &["hmm", "mmm"],
        "ja" => &["hmm", "mmm"],
        "ko" => &["hmm", "mmm"],
        "vi" => &["hmm", "mmm", "hm"],
        "zh" => &["hmm", "mmm"],
        // Conservative universal fallback (no "um", "eh", "ha")
        _ => &[
            "uh", "uhm", "umm", "uhh", "uhhh", "ah", "hmm", "hm", "mmm", "mm", "mh", "ehh",
        ],
    }
}

static MULTI_SPACE_PATTERN: Lazy<Regex> = Lazy::new(|| Regex::new(r"\s{2,}").unwrap());

/// Collapses repeated words (3+ repetitions) to a single instance.
/// E.g., "wh wh wh wh" -> "wh", "I I I I" -> "I"
fn collapse_stutters(text: &str) -> String {
    let words: Vec<&str> = text.split_whitespace().collect();
    if words.is_empty() {
        return text.to_string();
    }

    let mut result: Vec<&str> = Vec::new();
    let mut i = 0;

    while i < words.len() {
        let word = words[i];
        let word_lower = word.to_lowercase();

        if word_lower.chars().all(|c| c.is_alphabetic()) {
            // Count consecutive repetitions (case-insensitive)
            let mut count = 1;
            while i + count < words.len() && words[i + count].to_lowercase() == word_lower {
                count += 1;
            }

            // If 3+ repetitions, collapse to single instance
            if count >= 3 {
                result.push(word);
                i += count;
            } else {
                result.push(word);
                i += 1;
            }
        } else {
            result.push(word);
            i += 1;
        }
    }

    result.join(" ")
}

/// Filters transcription output by removing filler words and stutter artifacts.
///
/// This function cleans up raw transcription text by:
/// 1. Removing filler words based on the app language (or custom list)
/// 2. Collapsing repeated word stutters (e.g., "wh wh wh" -> "wh")
/// 3. Cleaning up excess whitespace
///
/// # Arguments
/// * `text` - The raw transcription text to filter
/// * `lang` - The app language code (e.g., "en", "pt-BR") used to select filler words
/// * `custom_filler_words` - Optional user-provided filler word list. `Some(vec)` overrides
///   language defaults; `Some(empty vec)` disables filtering; `None` uses language defaults.
///
/// # Returns
/// The filtered text with filler words and stutters removed
pub fn filter_transcription_output(
    text: &str,
    lang: &str,
    custom_filler_words: &Option<Vec<String>>,
) -> String {
    let mut filtered = text.to_string();

    // Build filler patterns from custom list or language defaults
    let patterns: Vec<Regex> = match custom_filler_words {
        Some(words) => words
            .iter()
            .filter_map(|word| Regex::new(&format!(r"(?i)\b{}\b[,.]?", regex::escape(word))).ok())
            .collect(),
        None => get_filler_words_for_language(lang)
            .iter()
            .map(|word| Regex::new(&format!(r"(?i)\b{}\b[,.]?", regex::escape(word))).unwrap())
            .collect(),
    };

    // Remove filler words
    for pattern in &patterns {
        filtered = pattern.replace_all(&filtered, "").to_string();
    }

    // Collapse repeated 1-2 letter words (stutter artifacts like "wh wh wh wh")
    filtered = collapse_stutters(&filtered);

    // Clean up multiple spaces to single space
    filtered = MULTI_SPACE_PATTERN.replace_all(&filtered, " ").to_string();

    // Trim leading/trailing whitespace
    filtered.trim().to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn entry(output: &str, aliases: &[&str]) -> CustomDictionaryEntry {
        CustomDictionaryEntry {
            output: output.to_string(),
            aliases: aliases.iter().map(|alias| alias.to_string()).collect(),
            use_in_model_prompt: true,
            use_in_post_process: true,
        }
    }

    #[test]
    fn test_apply_custom_words_exact_match() {
        let text = "hello world";
        let custom_words = vec![entry("Hello", &[]), entry("World", &[])];
        let result = apply_custom_words(text, &custom_words, 0.5);
        assert_eq!(result, "Hello World");
    }

    #[test]
    fn test_apply_custom_words_fuzzy_match() {
        let text = "helo wrold";
        let custom_words = vec![entry("hello", &[]), entry("world", &[])];
        let result = apply_custom_words(text, &custom_words, 0.5);
        assert_eq!(result, "hello world");
    }

    #[test]
    fn test_preserve_case_pattern() {
        assert_eq!(preserve_case_pattern("HELLO", "world"), "WORLD");
        assert_eq!(preserve_case_pattern("Hello", "world"), "World");
        assert_eq!(preserve_case_pattern("hello", "WORLD"), "WORLD");
    }

    #[test]
    fn test_extract_punctuation() {
        assert_eq!(extract_punctuation("hello"), ("", ""));
        assert_eq!(extract_punctuation("!hello?"), ("!", "?"));
        assert_eq!(extract_punctuation("...hello..."), ("...", "..."));
    }

    #[test]
    fn test_extract_punctuation_uses_unicode_boundaries() {
        assert_eq!(extract_punctuation("你好。"), ("", "。"));
        assert_eq!(extract_punctuation("「你好」"), ("「", "」"));
        assert_eq!(extract_punctuation("你好！"), ("", "！"));
    }

    #[test]
    fn test_empty_custom_words() {
        let text = "hello world";
        let custom_words: Vec<CustomDictionaryEntry> = vec![];
        let result = apply_custom_words(text, &custom_words, 0.5);
        assert_eq!(result, "hello world");
    }

    #[test]
    fn test_filter_filler_words() {
        let text = "So uhm I was thinking uh about this";
        let result = filter_transcription_output(text, "en", &None);
        assert_eq!(result, "So I was thinking about this");
    }

    #[test]
    fn test_filter_filler_words_case_insensitive() {
        let text = "UHM this is UH a test";
        let result = filter_transcription_output(text, "en", &None);
        assert_eq!(result, "this is a test");
    }

    #[test]
    fn test_filter_filler_words_with_punctuation() {
        let text = "Well, uhm, I think, uh. that's right";
        let result = filter_transcription_output(text, "en", &None);
        assert_eq!(result, "Well, I think, that's right");
    }

    #[test]
    fn test_filter_cleans_whitespace() {
        let text = "Hello    world   test";
        let result = filter_transcription_output(text, "en", &None);
        assert_eq!(result, "Hello world test");
    }

    #[test]
    fn test_filter_trims() {
        let text = "  Hello world  ";
        let result = filter_transcription_output(text, "en", &None);
        assert_eq!(result, "Hello world");
    }

    #[test]
    fn test_filter_combined() {
        let text = "  Uhm, so I was, uh, thinking about this  ";
        let result = filter_transcription_output(text, "en", &None);
        assert_eq!(result, "so I was, thinking about this");
    }

    #[test]
    fn test_filter_preserves_valid_text() {
        let text = "This is a completely normal sentence.";
        let result = filter_transcription_output(text, "en", &None);
        assert_eq!(result, "This is a completely normal sentence.");
    }

    #[test]
    fn test_filter_stutter_collapse() {
        let text = "w wh wh wh wh wh wh wh wh wh why";
        let result = filter_transcription_output(text, "en", &None);
        assert_eq!(result, "w wh why");
    }

    #[test]
    fn test_filter_stutter_short_words() {
        let text = "I I I I think so so so so";
        let result = filter_transcription_output(text, "en", &None);
        assert_eq!(result, "I think so");
    }

    #[test]
    fn test_filter_stutter_longer_words() {
        let text = "Check data doc doc doc doc documentation.";
        let result = filter_transcription_output(text, "en", &None);
        assert_eq!(result, "Check data doc documentation.");
    }

    #[test]
    fn test_filter_stutter_mixed_case() {
        let text = "No NO no NO no";
        let result = filter_transcription_output(text, "en", &None);
        assert_eq!(result, "No");
    }

    #[test]
    fn test_filter_stutter_preserves_two_repetitions() {
        let text = "no no is fine";
        let result = filter_transcription_output(text, "en", &None);
        assert_eq!(result, "no no is fine");
    }

    #[test]
    fn test_filter_english_removes_um() {
        let text = "um I think um this is good";
        let result = filter_transcription_output(text, "en", &None);
        assert_eq!(result, "I think this is good");
    }

    #[test]
    fn test_filter_portuguese_preserves_um() {
        // "um" means "a/an" in Portuguese
        let text = "um gato bonito";
        let result = filter_transcription_output(text, "pt", &None);
        assert_eq!(result, "um gato bonito");
    }

    #[test]
    fn test_filter_spanish_preserves_ha() {
        // "ha" means "has" in Spanish
        let text = "ha sido un buen día";
        let result = filter_transcription_output(text, "es", &None);
        assert_eq!(result, "ha sido un buen día");
    }

    #[test]
    fn test_filter_language_code_with_region() {
        // "pt-BR" should normalize to "pt"
        let text = "um gato bonito";
        let result = filter_transcription_output(text, "pt-BR", &None);
        assert_eq!(result, "um gato bonito");
    }

    #[test]
    fn test_filter_custom_filler_words_override() {
        let custom = Some(vec!["okay".to_string(), "right".to_string()]);
        let text = "okay so I think right this works";
        let result = filter_transcription_output(text, "en", &custom);
        assert_eq!(result, "so I think this works");
    }

    #[test]
    fn test_filter_custom_filler_words_empty_disables() {
        let custom = Some(vec![]);
        let text = "So uhm I was thinking uh about this";
        let result = filter_transcription_output(text, "en", &custom);
        // No filler words removed since custom list is empty
        assert_eq!(result, "So uhm I was thinking uh about this");
    }

    #[test]
    fn test_filter_unknown_language_uses_fallback() {
        let text = "uh I think uhm this works";
        let result = filter_transcription_output(text, "xx", &None);
        assert_eq!(result, "I think this works");
    }

    #[test]
    fn test_filter_fallback_does_not_remove_um() {
        // Fallback (unknown language) should not remove "um" since it's a real word in some languages
        let text = "um I think this works";
        let result = filter_transcription_output(text, "xx", &None);
        assert_eq!(result, "um I think this works");
    }

    #[test]
    fn test_apply_custom_words_ngram_two_words() {
        let text = "il cui nome è Charge B, che permette";
        let custom_words = vec![entry("ChargeBee", &["Charge B"])];
        let result = apply_custom_words(text, &custom_words, 0.5);
        assert!(result.contains("ChargeBee,"), "unexpected result: {result}");
        assert!(!result.contains("Charge B"));
    }

    #[test]
    fn test_apply_custom_words_ngram_three_words() {
        let text = "use Chat G P T for this";
        let custom_words = vec![entry("ChatGPT", &["Chat G P T"])];
        let result = apply_custom_words(text, &custom_words, 0.5);
        assert!(result.contains("ChatGPT"));
    }

    #[test]
    fn test_apply_custom_words_prefers_longer_ngram() {
        let text = "Open AI GPT model";
        let custom_words = vec![entry("OpenAI", &["Open AI"]), entry("GPT", &[])];
        let result = apply_custom_words(text, &custom_words, 0.5);
        assert_eq!(result, "OpenAI GPT model");
    }

    #[test]
    fn test_apply_custom_words_ngram_preserves_case() {
        let text = "CHARGE B is great";
        let custom_words = vec![entry("ChargeBee", &["Charge B"])];
        let result = apply_custom_words(text, &custom_words, 0.5);
        assert!(result.contains("CHARGEBEE"));
    }

    #[test]
    fn test_apply_custom_words_ngram_with_spaces_in_custom() {
        // Custom word with space should also match against split words
        let text = "using Mac Book Pro";
        let custom_words = vec![entry("MacBook Pro", &["Mac Book Pro"])];
        let result = apply_custom_words(text, &custom_words, 0.5);
        assert!(result.contains("MacBook"));
    }

    #[test]
    fn test_apply_custom_words_trailing_number_not_doubled() {
        // Verify that trailing non-alpha chars (like numbers) aren't double-counted
        // between build_ngram stripping them and extract_punctuation capturing them
        let text = "use GPT4 for this";
        let custom_words = vec![entry("GPT-4", &["GPT4"])];
        let result = apply_custom_words(text, &custom_words, 0.5);
        // Should NOT produce "GPT-44" (double-counting the trailing 4)
        assert!(
            !result.contains("GPT-44"),
            "got double-counted result: {}",
            result
        );
    }

    #[test]
    fn test_apply_custom_words_replaces_non_ascii_aliases() {
        let text = "今日はちゃっとじーぴーてぃーを使う";
        let custom_words = vec![entry("ChatGPT", &["ちゃっとじーぴーてぃー"])];
        let result = apply_custom_words(text, &custom_words, 0.5);
        assert_eq!(result, "今日はChatGPTを使う");
    }

    #[test]
    fn test_apply_custom_words_skips_entries_disabled_for_post_process() {
        let text = "charge bee is nice";
        let custom_words = vec![CustomDictionaryEntry {
            output: "ChargeBee".to_string(),
            aliases: vec!["charge bee".to_string()],
            use_in_model_prompt: true,
            use_in_post_process: false,
        }];
        let result = apply_custom_words(text, &custom_words, 0.5);
        assert_eq!(result, text);
    }

    #[test]
    fn test_apply_custom_words_matches_ampersand_word() {
        let custom_words = vec![entry("R&D", &[])];
        assert_eq!(apply_custom_words("r&d", &custom_words, 0.18), "R&D");
    }

    #[test]
    fn test_apply_custom_words_matches_spoken_ampersand_word() {
        let custom_words = vec![entry("R&D", &[])];
        assert_eq!(apply_custom_words("r and d", &custom_words, 0.18), "R&D");
    }

    #[test]
    fn test_apply_custom_words_preserves_ampersand_word() {
        let custom_words = vec![entry("R&D", &[])];
        assert_eq!(
            apply_custom_words("We invest in R&D", &custom_words, 0.18),
            "We invest in R&D"
        );
    }

    #[test]
    fn test_apply_custom_words_handles_unicode_punctuation() {
        let text = "「Handee。」";
        let custom_words = vec![entry("Handy", &[])];
        let result = apply_custom_words(text, &custom_words, 0.5);
        assert_eq!(result, "「Handy。」");
    }

    #[test]
    fn test_apply_custom_words_skips_cjk_fuzzy_matching() {
        let text = "你好。";
        let custom_words = vec![entry("你号", &[])];
        let result = apply_custom_words(text, &custom_words, 1.0);
        assert_eq!(result, text);
    }

    #[test]
    fn test_non_ascii_aliases_replace_longest_first() {
        let custom_words = vec![
            entry("音声", &["おんせい"]),
            entry("音声入力", &["おんせいにゅうりょく"]),
        ];
        let result = apply_custom_words("おんせいにゅうりょくを使う", &custom_words, 0.5);
        assert_eq!(result, "音声入力を使う");
    }

    #[test]
    fn test_conflicting_normalized_trigger_is_not_replaced() {
        let custom_words = vec![
            entry("OpenAI", &["open ai"]),
            entry("OpenEye", &["open-ai"]),
        ];
        let result = apply_custom_words("open ai", &custom_words, 0.0);
        assert_eq!(result, "open ai");
    }

    #[test]
    fn test_conflicting_non_ascii_alias_is_not_replaced() {
        let custom_words = vec![
            entry("Claude", &["クロード"]),
            entry("Cloud", &["クロード"]),
        ];
        let result = apply_custom_words("クロードを使う", &custom_words, 0.5);
        assert_eq!(result, "クロードを使う");
    }
}
