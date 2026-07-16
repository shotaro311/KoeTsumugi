# Cohere長文文字起こしの文章欠落に関する原因調査

- 調査日: 2026-07-16
- 対象: Handy_m `shotaro/custom`
- 調査範囲: 原因調査、類似事例の収集、対策・検証計画の策定
- 実装状態: 調査のみ。アプリのコード、設定、インストール済みバイナリは変更していない

## 0. 結論

最有力原因はVADではなく、**Cohereへ長い音声を分割せずに1回で渡していること**である。現在選択中のCohere GGUFモデルは非ストリーミングであり、Handy_mはVAD通過後のPCM全体を `session.run(&audio, ...)` に一括投入している。一方、Cohereの公式実装は長音声を1チャンク最大35秒とし、30秒を超えた音声について35秒境界の手前5秒間から低エネルギーの分割点を選び、複数結果を順番に再結合する。この長文処理がHandy_mと `transcribe.cpp` のCohere経路にはない。

Handy本家にも同じ「Cohereで長文の先頭部分しか得られない」という報告があり、新しいGGUF版でも約360語の音声が約100語までしか出なかった追試がある。ユーザーの「VAD有効のNemotron Streamingでは起きない」という比較結果も、長さ制限のないストリーミングRNN-Tと、単発の自己回帰デコーダーを使うCohereの設計差に合致する。

VADは副次的な増幅要因になり得る。Handy_mは非音声判定されたフレームを捨て、Cohereには発話終了後450ms、Nemotron Streamingには1,650msの保持時間を適用する。この差により、小声や長めの言いよどみがCohere側だけ欠落する可能性がある。ただし、今回の実ログは後処理前のCohere生出力ですでに短くなっており、Cohereの未チャンク化だけで説明できる同一事例もあるため、VADを主因とは判定しない。**VAD無効化は恒久対策にしない。**

推奨する恒久対策は、Cohere familyだけに公式準拠の「最大35秒、末尾5秒内の低エネルギー境界で非重複分割、順序再結合」を追加し、出力上限や早期終了を検知したチャンクはさらに短く分割して再試行することである。VADはオンのまま維持する。

| 原因候補                             | 判定               | 確信度 | 根拠の要点                                                        |
| ------------------------------------ | ------------------ | -----: | ----------------------------------------------------------------- |
| Cohere長音声の未チャンク化           | 主因               |     高 | 公式は30秒超を分割するが、現行経路は全PCMを1回で推論              |
| Cohereの早期EOS・512生成トークン上限 | 主因に付随する制約 |     高 | 単発デコードで長い出力を扱い、512トークン到達時はtruncatedになる  |
| VADの誤判定と短いhangover            | 副因               |     中 | 非音声を破棄し、Cohereの保持時間はNemotronより1.2秒短い           |
| Q5_K_M量子化                         | 低優先             |     低 | 精度差はあり得るが、長さ依存の大幅欠落を単独では説明しにくい      |
| LLM後処理・貼り付け・履歴保存        | 主因ではない       |     高 | 該当ログでは生ASR出力の時点ですでに短く、最近の履歴は後処理未要求 |

## 1. 調査目的と範囲

目的は、長文文字起こしで一部の文章が省かれる症状について、Cohere、VAD、音声保存、後処理のどこで欠落が発生するかを整理し、VADをオンのまま改善する実装・検証計画を作ることである。

今回は診断依頼のため、アプリの実装、設定値、モデル、インストール済みバイナリは変更していない。保存済み音声を新しいチャンク実装で再文字起こしする決定的なA/B試験も、実装前のため未実施である。

## 2. 前提と現在状態

- ユーザー記載の「VOD」は、Handyの音声区間検出機能であるVADを指すものとして調査した。
- 2026-07-16の設定は `cohere-transcribe-03-2026-Q5_K_M.gguf`、言語 `ja`、`vad_enabled=true`、`extra_recording_buffer_ms=0` だった。
- Cohereはカタログ上 `streaming=false`、Nemotron 3.5 Streamingは `streaming=true` である。
- Handy_mが履歴用に保存するWAVはマイクの生音声ではなく、VAD処理後の `processed_samples` である。したがって、保存WAVに音声がなければVAD起因、保存WAVに音声があるのに文字がなければモデル起因、と単純には判定できるが、現状は生音声との自動比較ができない。

## 3. 調査方法

1. 現在設定、履歴DB、保存WAVの時間、Handyログを、文字起こし本文を報告へ転載せずに確認した。
2. 録音開始時のVAD方針、VADの平滑化、録音停止時のflush、保存WAV、CohereとNemotronの推論経路をソースで追跡した。
3. Handyが固定する `transcribe.cpp 0.1.3` のCohere実装と入力制限契約を確認した。
4. Cohere、Hugging Face Transformers、NVIDIA Nemotronの一次資料を確認した。
5. Handy本家の同一症状、長音声関連Issue、過去のチャンク化PRを確認した。

## 4. 調査結果

### 4.1 Handy_mのCohere経路は長音声を1回で推論する

`src-tauri/src/managers/transcription.rs:1243-1270` は、Cohere GGUFを含む `LoadedEngine::TranscribeCpp` に音声全体を `session.run(&audio, &run_options)` で渡す。録音長に応じた分割や、チャンク結果の再結合はない。

依存先のCohere実装にも `cohere is single-chunk today` と明記されている。また、Cohereデコーダーには512 max-new-tokensの上限があり、出力予算を使い切った場合はpartial transcriptを保持した `OUTPUT_TRUNCATED` になる。Handy_mの現行ラッパーはこのエラーを通常の転写失敗へ変換し、partial transcriptを利用していない。

ただし、今回確認したCohere成功runには `OUTPUT_TRUNCATED` 警告がなかった。そのため、確認済みの短い出力は512トークン到達そのものより、**公式の想定を超える長さを単発推論した結果の早期EOSまたは長文精度低下**である可能性が高い。512上限は別の長文欠落・全損を起こす追加リスクとして扱う。

### 4.2 Cohere公式の長文処理と現行実装が異なる

[Cohere公式モデルカード](https://huggingface.co/CohereLabs/cohere-transcribe-03-2026)と[TransformersのCohere ASR仕様](https://huggingface.co/docs/transformers/model_doc/cohere_asr)は、長音声を自動分割し、`audio_chunk_index` で順番に再結合する。公式feature extractorの既定値は次のとおりである。

- 1チャンク上限: 35秒
- 分割開始条件: `35秒 - 5秒` を超える音声、すなわち30秒超
- 分割位置: 35秒境界の手前5秒間にある最小エネルギー点
- 5秒の意味: 実音声のオーバーラップではなく、静かな境界を探す検索範囲
- 結合: `audio_chunk_index` 順。チャンク間で音声を重複させない

公式モデルカードには55分の音声をこの方法で処理する例がある。Handy_mのCohere経路はこの前処理を再現していない。

### 4.3 実ログは「後処理前のCohere出力が長さに比例しない」ことを示す

ユーザーの本文は転載せず、VAD後の音声時間と生ASR結果の文字数だけを集計した。

| モデル             | VAD後音声 | 生ASR文字数 | 文字/秒 | 備考                       |
| ------------------ | --------: | ----------: | ------: | -------------------------- |
| Cohere             |   34.65秒 |         130 |    3.75 | 30秒分割閾値を超える       |
| Cohere             |   78.03秒 |         141 |    1.81 | エラー・truncation警告なし |
| Cohere             |  106.86秒 |         191 |    1.79 | エラー・truncation警告なし |
| Cohere             |  138.42秒 |         192 |    1.39 | エラー・truncation警告なし |
| Nemotron Streaming |  103.50秒 |         349 |    3.37 | streaming成功              |
| Nemotron Streaming |  278.70秒 |         944 |    3.39 | streaming成功              |

録音内容と話速が同一ではないため、この表だけで欠落率やモデル間精度を断定できない。しかし、78〜138秒のCohereで音声時間が伸びても出力量が伸びにくく、推論成功扱いのまま後処理前に短い結果になっていることは、ユーザー報告と未チャンク化仮説を強く補強する。

### 4.4 Handy本家にも同一症状がある

[Handy Issue #1323](https://github.com/cjpais/Handy/issues/1323)は「Cohere model cuts off long text」という同一症状を報告している。Issue本文は、1分程度の音声でも出力トークン制限により先頭部分しか得られず、chunkingが必要と説明している。2026-07-03の追試では、新しいGGUF版Cohereでも、Parakeetで約360語・2,000文字だった音声が約100語・500文字までしか得られなかった。

長音声処理を追加する[Handy PR #1173](https://github.com/cjpais/Handy/pull/1173)はマージされず、2026-07-08に `transcribe.cpp` 移行を理由としてcloseされた。したがって、現行のCohere GGUFへ長文チャンク処理が入った根拠にはならない。[Issue #1332](https://github.com/cjpais/Handy/issues/1332)には長録音が全損する別症状もあるが、今回の「一部文章が省かれる」症状とは区別する。

### 4.5 Nemotron Streamingで再現しない理由

Handy_mはNemotronを `streaming=true` と認識し、録音中に音声を逐次feedしてfinalizeする。`transcribe.cpp` の[入力制限契約](https://github.com/handy-computer/transcribe.cpp/blob/v0.1.3/docs/input-limits.md)は、Nemotronを含むParakeet familyについて、RNN-Tにデコーダーコンテキスト窓がなく、定数メモリのcacheを引き継ぐため実用上の長さ上限がないと説明している。[Nemotron 3.5のモデル資料](https://github.com/handy-computer/transcribe.cpp/blob/v0.1.3/docs/models/nemotron-3.5-asr-streaming-0.6b.md)も同じ設計を明記する。

このため、Nemotronは長音声全体を1回の自己回帰出力へ収める必要がない。ユーザーの「VADオンでもNemotron Streamingでは症状が起きない」という観察は、マイク入力や貼り付けよりCohere固有経路を疑う強い比較証拠である。

### 4.6 VADは副次的に欠落を増やし得る

`src-tauri/src/actions.rs:493-510` は、非ストリーミングCohereに `VadPolicy::Offline`、Nemotronに `VadPolicy::Streaming` を割り当てる。1フレームは30msで、現在の値は次のとおりである。

- 発話開始前のprefill: 15フレーム = 450ms
- Cohereの発話終了後hangover: 15フレーム = 450ms
- Nemotronの発話終了後hangover: 55フレーム = 1,650ms
- 発話開始判定: 2フレーム = 60ms
- Silero VAD threshold: 0.3

`src-tauri/src/audio_toolkit/vad/smoothed.rs:41-95` と `src-tauri/src/audio_toolkit/audio/recorder.rs:635-667` では、Speech判定だけを出力へ連結し、Noise判定を捨てる。したがって、小声や文間の音声が450msより長く誤判定されると、Cohereへ渡る前に失われる。また、捨てた無音時間が圧縮されるため、本来離れていた発話が隣接し、Cohereの単発推論をさらに不安定にする可能性がある。

ただしVADを無効にしてもCohereの未チャンク化と出力上限は残る。VADをオフにすることは、無音の幻覚や操作性の悪化も招くため推奨しない。

## 5. 情報の鮮度

- ローカル設定、ログ、履歴、ソース: 2026-07-16に確認
- `transcribe.cpp`: Handy_mのロック済み依存 `0.1.3` を確認し、資料URLも `v0.1.3` に固定
- Cohere公式モデルカード: 2026-03-26公開のモデルについて2026-07-16に確認
- Transformers Cohere ASR資料: 2026-07-16時点のv5.13.1表示と固定commitの実装を確認
- Nemotron 3.5 Streaming: 2026-06-04公開モデルについて2026-07-16に確認
- Handy Issue/PR: 2026-07-16時点の状態を確認

## 6. 数値と解釈上の注意

- 「35秒」はCohere公式feature extractorの1チャンク上限であり、`transcribe.cpp` が掲げる約400秒のエンコーダー入力上限とは意味が異なる。400秒は入力可能な構造上限で、35秒を超える単発推論の完全性を保証しない。
- 「5秒」はチャンクのオーバーラップではない。分割境界の手前で静かな点を探す範囲である。
- 512はCohereデコーダーの最大新規トークン数で、音声秒数や日本語文字数へ一定比率では換算できない。
- 実ログの文字/秒は録音内容が異なるため、正式な精度指標ではない。原因確定には同一音声と参照原稿が必要である。
- 現在の保存WAVはVAD後音声なので、過去録音だけではVADが捨てた原音を復元できない。

## 7. 対策と検証計画

### フェーズA: 原因を同一音声で確定する

実装前に、2〜5分の番号付き日本語原稿を同じマイク条件で録音し、比較用にマイク生PCMとVAD後PCMを一時的に同時保存する診断経路を用意する。通常利用のVAD設定はオンのままとする。

同じ音声を次の順で比較する。

1. VAD後PCMを現行Cohere single-shotへ投入
2. 同じVAD後PCMを公式準拠のCohereチャンク処理へ投入
3. 同じ生PCMを現行VADに通し、drop時間帯を記録
4. 同じPCMをNemotron Streamingへ投入
5. チャンク化後にも欠落が残る場合だけ、Cohereのhangover 450msと1,650msを比較

記録する値は、原音時間、VAD後時間、VADが捨てた時間帯、チャンク範囲、チャンク別文字数、EOS到達、`was_truncated`、最終文字数とする。音声本文を通常ログへ残す必要はない。

### フェーズB: 推奨する恒久修正

1. Cohere familyだけを対象に、30秒超の音声を最大35秒へ分割する。
2. 各35秒境界の手前5秒から最小エネルギー点を探し、音声を重複させずに分割する。
3. 各チャンクを同じ言語・タスク設定で順番に推論し、元の順序で結合する。
4. 各チャンクの時間範囲と完了状態を保持し、1チャンクの失敗を全体の無言成功にしない。
5. `OUTPUT_TRUNCATED` またはEOS未到達を検出したチャンクは15〜20秒へ二分して再試行する。partial transcriptは診断・救済に利用できる形で保持し、完全成功として黙って採用しない。
6. 既存の短い文字起こしとNemotron Streaming経路は変更しない。

公式準拠の非重複分割を第一案とする。固定1秒オーバーラップ方式は境界語を保護できる代わりに、日本語の重複文を生みやすく、文字列dedupeが追加で必要になるため代替案とする。公式方式で境界欠落が実測された場合だけ、小さなoverlapと重複除去を検討する。

### フェーズC: VAD改善はチャンク化後に判断する

チャンク化後も、生PCMには存在するのにVAD後PCMから消える区間が確認された場合、次を順に検討する。

1. Cohereのoffline hangoverを450msから段階的に延長する。
2. Speech区間間へ短い無音を残すか、区間時刻を保持してCohere入力時に再構成する。
3. 録音終了時にpending onset/prefillを明示的にflushする。
4. threshold 0.3の変更は誤検知とのトレードオフが大きいため、実音声のROC比較後に限る。

VADを完全に無効化する案は採用しない。

### 受け入れ条件

- VADオンで、1分、2分、5分の番号付き日本語原稿に文単位の欠落・順序逆転がない。
- 30秒と35秒の境界前後にある語が欠落・重複しない。
- 全入力sampleが、重複や穴なくいずれかのチャンクへ割り当てられる。
- 早期EOS、出力上限、チャンク失敗を無言の成功として扱わない。
- 30秒以下のCohere文字起こしとNemotron Streamingに回帰がない。
- 小声、1秒前後の間、背景ノイズを含む音声でもVADオンの操作性を維持する。
- 最後にWindowsのインストール済みHandy_mで、実際のホットキー、保存、履歴、貼り付けまで確認する。

### 実装までの暫定回避策

- 長文はNemotron Streamingを使う方法が最も確実である。
- Cohereを使う場合は30秒前後で区切ると、公式の短文処理範囲に収まりやすい。
- VADオフや `max_new_tokens` 増加だけでは、未チャンク化を解消しないため恒久策にしない。

## 8. 主な参照元

### 一次資料

- [CohereLabs/cohere-transcribe-03-2026 model card](https://huggingface.co/CohereLabs/cohere-transcribe-03-2026)
- [Hugging Face Transformers: CohereAsr](https://huggingface.co/docs/transformers/model_doc/cohere_asr)
- [Transformers Cohere feature extractor implementation](https://github.com/huggingface/transformers/blob/78bdaf0b39c29737b9ca48a274ef4a34bdafd4d1/src/transformers/models/cohere_asr/feature_extraction_cohere_asr.py)
- [Transformers Cohere processor implementation](https://github.com/huggingface/transformers/blob/78bdaf0b39c29737b9ca48a274ef4a34bdafd4d1/src/transformers/models/cohere_asr/processing_cohere_asr.py)
- [transcribe.cpp v0.1.3 input limits](https://github.com/handy-computer/transcribe.cpp/blob/v0.1.3/docs/input-limits.md)
- [transcribe.cpp v0.1.3 Cohere model](https://github.com/handy-computer/transcribe.cpp/blob/v0.1.3/src/arch/cohere/model.cpp)
- [transcribe.cpp v0.1.3 Nemotron 3.5 model](https://github.com/handy-computer/transcribe.cpp/blob/v0.1.3/docs/models/nemotron-3.5-asr-streaming-0.6b.md)
- [NVIDIA Nemotron 3.5 ASR Streaming model card](https://huggingface.co/nvidia/nemotron-3.5-asr-streaming-0.6b)

### 類似報告・関連実装

- [Handy Issue #1323: Cohere model cuts off long text](https://github.com/cjpais/Handy/issues/1323)
- [Handy Issue #1332: Handy silently drops long audio recordings](https://github.com/cjpais/Handy/issues/1332)
- [Handy PR #1173: chunking/streaming revisited](https://github.com/cjpais/Handy/pull/1173)
- [transcribe-rs PR #72: FixedChunked transcriber](https://github.com/cjpais/transcribe-rs/pull/72)
- [transcribe.cpp PR #74: Expose max_new_tokens run option](https://github.com/handy-computer/transcribe.cpp/pull/74)
