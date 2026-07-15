---
project_slug: handy-m
updated: 2026-07-15
updated_by: codex
status: active
---

# Project Progress: handy-m

## 概要

- Handy_m は upstream `cjpais/Handy` に個人用カスタムを重ねるローカルfork。
- `shotaro/custom` でカスタム差分を管理し、`main` は upstream tracking として維持する。

## 最新の検証済み状態

- 2026-07-15: WindowsでOSの既定マイクを切り替えた後、Handy_mが古い常時オン入力ストリームを保持する問題を修正。録音開始時にWASAPIエンドポイントIDとCPALストリーム健全性を確認し、変更・切断時だけ自動再生成する。音声コールバック停止中も50ms周期で終了指示を処理する。Rust test 132件、Clippy、frontend lint/build、21言語、release build、インストール先hash一致、起動・マイク初期化・最初の音声チャンクを確認。
- 2026-07-14: WindowsのAlt+Space音声入力で、ブラウザがAlt単独操作としてメニューフォーカスへ移る問題を修正。割り当てを変えず、Alt+Space検出時だけAlt単独扱いを抑止する。Chrome実入力欄でフォーカス維持と`HANDY_FIXED_PASTE_OK`の貼り付け、抑止ログ、ローカル本番buildのインストールを確認。
- 2026-07-14: ユーザーが確定した候補29件をインストール済みHandy_mのカスタム辞書へ反映。既存`ChatGPT`を保持して合計30件、output重複なし、候補内容の完全一致、辞書以外の設定保持、アプリ再起動後の設定維持を確認。
- 2026-07-14: ローカル辞書候補画面で各候補の別名・読みを編集可能にした。変更はブラウザへ保存され、検索、コピー結果、登録用JSONへ反映。重複・空白・正しい表記と同一の読みは保存時に除去する。
- 2026-07-14: 辞書候補29件をワンクリックで除外指定できるローカルHTMLを`docs/custom-dictionary-review.html`へ追加。選択の自動保存、検索、表示絞り込み、除外結果のコピー、登録用JSON保存を実装し、構文・整形・候補データを検証。
- 2026-07-14: 最近3日分の利用記録と現在の辞書を基に、誤認識しやすい固有名詞29件を`docs/custom-dictionary-candidates.md`へ整理。`[x]`を除外指定とし、既存の`ChatGPT`登録との重複や一般語を巻き込む危険なaliasを避けた。
- 2026-07-13: [`Handy_m v1.0.1`](https://github.com/shotaro311/Handy/releases/tag/handy-m-v1.0.1)を公開。release workflow `29222247004`は全job成功し、公開NSISのSHA-256とupdater署名を独立検証。インストール済み1.0.0で「アップデートあり」の表示まで確認。
- 2026-07-13: Handy_m 1.0.1としてWindowsのHugging Faceモデル取得を安定化。reqwest既定経路でWinSock 10054が再現し、WindowsのみIPv4 + HTTP/1.1へ固定すると連続通信試験とWhisper Medium 831,538,144 bytesの実ダウンロードが成功。
- 2026-07-13: 一時的なHugging Face通信失敗を最大4回再試行し、並列数を4へ抑制、同一モデルの重複要求を集約。frontend、21言語、`cargo check`、Rust unit test 123件、署名付きMSI/NSIS build、1.0.1起動・応答を検証。
- 2026-07-13: GitHub Actions Secrets登録と`shotaro/custom`のpushを完了し、[`handy-m-v1.0.0`](https://github.com/shotaro311/Handy/releases/tag/handy-m-v1.0.0)を公開。release workflow `29218527825` は約30分で成功。
- 2026-07-13: 公開`latest.json`はHTTP 200、version 1.0.0、Windows x64 NSIS/MSI targetと署名を保持。NSIS downloadは`application/octet-stream`で20,881,530 bytes、公開鍵によるminisign検証に成功。
- 2026-07-13: Handy_m専用の更新経路を実装。独立version `1.0.0`、専用GitHub Releases endpoint、専用updater署名鍵、アプリ内download/install/relaunch、Windows x64公開workflowを整備。
- 2026-07-13: 署名付きrelease buildに成功し、MSI/NSISと両方のTauri updater `.sig`を生成。`handy.exe` 1.0.0の起動・応答、Vulkan 3デバイスとCPU backend初期化を確認。
- 2026-07-13: official upstream `v0.9.2` (`ea10f74`) を `shotaro/custom` にマージし、Handy_m独自の構造化カスタム辞書とブランド設定を維持。
- 2026-07-13: Windowsで `format:check`、`lint`、frontend build、21言語translation check、`cargo check`、Rust unit test 121件、`tauri build` が通過。
- 2026-07-13: `Handy_m 0.9.2` の実行ファイル、MSI、NSIS installerを生成。実行ファイルの起動、マイク初期化、Vulkan 3デバイスとCPUバックエンド登録まで確認。
- 2026-07-13: ローカル `main` を `upstream/main` 追従として復元し、AGENTS.mdの同期手順と実remote構成を一致させた。
- 2026-06-10: upstream `main` 最新 `7901ef7` を `shotaro/custom` にマージ済み。
- 2026-06-10: Mac側で `format:check`、`lint`、frontend build、translation check、`cargo check`、`tauri build` が通過。
- 2026-06-10: GitHub Release 最新は `v0.8.3`。現在のカスタムブランチは `v0.8.3-10-g3e9a1e9` 相当。
- 2026-06-10: Windows向けに upstream のAzure Trusted Signing用 `signCommand` を削除済み。
- 2026-06-10: Windows実機で `bun install`、`format:check`、`lint`、frontend build、translation check、`cargo check`、`tauri build` が通過。`handy.exe`、MSI、NSIS installerを生成。
- 2026-06-10: Windows起動確認でメインウィンドウ表示、ログ生成、マイクストリーム初期化まで確認。
- 2026-06-10: 日本語aliasを含むカスタム単語の過剰置換を修正し、辞書処理テスト33件が通過。

## 進行中

- Windows実機: OSの既定マイクを別エンドポイントへ切り替え、設定画面で再選択せず次の録音が自動復旧することを確認する。自動判定・再生成の単体テストと現在のマイクでの起動は確認済み。
- インストール済み1.0.0から1.0.1へのdownload、install、relaunchは未実施。
- Windows実機: 実音声を使った文字起こしとIME変換中の貼り付けを確認する。Alt+Space後のChrome入力欄フォーカス維持とCtrl+V貼り付け経路は確認済み。

## 次アクション

- Windowsのサウンド設定または実機接続で既定マイクを切り替え、次回録音のログに`Reopening microphone stream: TargetChanged`が出て音声入力できることを確認する。
- 実際の音声認識履歴を見ながら、今回登録したカスタム辞書のaliasを追加・削除する。
- インストール済み1.0.0から1.0.1へdownload、install、relaunchを実機確認する。
- 実利用アプリ上で、実音声の文字起こしとIME変換中の貼り付け結果を確認する。
- ダウンロード済みWhisper Mediumを使い、実音声でGPU認識品質と速度を確認する。

## Blocker / Risk

- 既定マイク変更・CPALエラー・音声チャンク停止時の自動回復ロジック、release build、インストール、現在のDJI Mic Miniでの初期化までは検証済み。OSの既定マイクを実際に変更する操作はユーザー環境を勝手に変えないため未実施。
- 1.0.1の公開metadata、binary transport、署名、1.0.0での更新検出までは確認済み。実際の旧versionからのinstall/relaunchとCohere Transcribeの再ダウンロードは未確認。
- Tauri updater署名は付与済みだが、Windows Authenticodeコード署名は未導入。初回installerでSmartScreen警告が出る可能性がある。
- Alt+Spaceの検出、Alt単独扱いの抑止、Chrome入力欄のフォーカス維持、Ctrl+V貼り付けは自動検証済み。モデルを使った実音声認識とIME変換中の貼り付けは未確認。
- 日本語ロケールのWindowsでtranscribe-cpp 0.1.3をビルドする際は、`TRANSCRIBE_CMAKE_ARGS`でMSVCへUTF-8フラグを渡す必要がある。詳細はBUILD.md。
- Macの通常PATHでは `~/.local/bin/xattr` がTauri bundlerと相性不一致。Mac build時は `/usr/bin` を先に置く。
- WindowsではRust/Tauri build時にLLVM、CMake、Vulkan SDK、Visual Studio Build Tools、短い `CARGO_TARGET_DIR` が必要。

## 引き継ぎ

- Windows側は `shotaro/custom` を使う。upstream追従は `main -> shotaro/custom` の順で行う。
- Rustは依存が `rustc 1.88+` を要求する。Macでは `rustc 1.94.1` で確認済み。

## 重要パス

- Project root: `.`

## 詳細ログ

- [2026-07-15](2026-07/2026-07-15_handy-m.md)
- [2026-07-14](2026-07/2026-07-14_handy-m.md)
- [2026-07-13](2026-07/2026-07-13_handy-m.md)
- [2026-06-10](2026-06/2026-06-10_handy-m.md)

## 旧進捗ソース

- なし。2026-06-10に `progress/` を新規初期化。

## 移行検証後の削除候補

- [cleanup-candidates.md](cleanup-candidates.md)

## 最近の更新

- 2026-07-15: OSの既定マイク変更と入力ストリーム切断を録音開始時に自動検出・回復し、最終release buildをインストールしてマイク初期化まで確認。
- 2026-07-14: Alt+Spaceを維持したままWindowsブラウザのフォーカス逸脱を防ぎ、ローカル本番buildをインストールしてChrome入力欄への貼り付けを検証。
- 2026-07-14: 選択済み29件をカスタム辞書へ反映し、既存`ChatGPT`を含む30件を再起動後まで検証。
- 2026-07-14: 辞書候補画面で読みを編集・初期値へ復元でき、編集結果をコピーとJSONへ含めるようにした。
- 2026-07-14: 辞書候補をカードクリックで除外でき、選択結果をコピー・JSON保存できるローカル画面を追加。
- 2026-07-14: 最近の利用語からカスタム辞書候補29件を作成し、除外チェック後にそのまま登録できる形式へ整理。
- 2026-07-13: Handy_m 1.0.1を公開し、公開assetの署名検証とインストール済み1.0.0での更新検出を確認。
- 2026-07-13: WindowsのHugging Face通信をIPv4 + HTTP/1.1へ固定し、再試行・並列数制御・重複要求集約を追加。Whisper Mediumの実ダウンロードと1.0.1署名buildを検証。
- 2026-07-13: Handy_m 1.0.0をGitHub Releasesへ公開し、`latest.json`、binary download、公開署名を検証。
- 2026-07-13: 本家とは別のHandy_m専用updater、署名鍵、release workflowを実装し、署名付きWindows成果物を検証。
- 2026-07-13: upstream v0.9.2を取り込み、構造化カスタム辞書を新音声認識基盤へ統合。
- 2026-07-13: Windowsで全自動検証、release bundle生成、起動とGPU/CPUバックエンド初期化を確認。
- 2026-07-13: `main`追従設定、AGENTS.md、Windows UTF-8ビルド手順を整備。
- 2026-06-10: 共通進捗管理を初期化。
- 2026-06-10: upstream最新化とMac側検証を完了。
- 2026-06-10: Windowsローカルビルド用に署名コマンドを削除。
- 2026-06-10: Windows実機でclone、依存導入、GPU/Vulkan前提確認、Tauri bundle生成、起動確認を完了。
- 2026-06-10: 日本語aliasのカスタム単語置換を修正。
