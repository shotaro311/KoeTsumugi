---
project_slug: handy-m
updated: 2026-07-13
updated_by: codex
status: active
---

# Project Progress: handy-m

## 概要

- Handy_m は upstream `cjpais/Handy` に個人用カスタムを重ねるローカルfork。
- `shotaro/custom` でカスタム差分を管理し、`main` は upstream tracking として維持する。

## 最新の検証済み状態

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

- Windows実機: `v0.9.2` installerの手動インストール後、実利用のショートカット、音声認識、貼り付け、IME入力を確認する。

## 次アクション

- `C:\hm-target\release\bundle\nsis\Handy_m_0.9.2_x64-setup.exe` から未署名installerを手動実行し、Windows SmartScreen表示を許可して動作確認する。
- 実利用アプリ上でショートカット録音、貼り付け方法、IME中の貼り付け結果を確認する。
- 新しいtranscribe.cppモデルをダウンロードし、実音声でGPU認識品質と速度を確認する。

## Blocker / Risk

- Windows installerは個人用forkでは未署名。SmartScreen警告が出る可能性がある。
- 自動検証ではショートカット録音、モデルを使った実音声認識、実アプリへの貼り付け、IME変換中の貼り付けまでは未確認。アプリ起動、マイク、GPU/CPUバックエンド初期化は確認済み。
- 日本語ロケールのWindowsでtranscribe-cpp 0.1.3をビルドする際は、`TRANSCRIBE_CMAKE_ARGS`でMSVCへUTF-8フラグを渡す必要がある。詳細はBUILD.md。
- Macの通常PATHでは `~/.local/bin/xattr` がTauri bundlerと相性不一致。Mac build時は `/usr/bin` を先に置く。
- WindowsではRust/Tauri build時にLLVM、CMake、Vulkan SDK、Visual Studio Build Tools、短い `CARGO_TARGET_DIR` が必要。

## 引き継ぎ

- Windows側は `shotaro/custom` を使う。upstream追従は `main -> shotaro/custom` の順で行う。
- Rustは依存が `rustc 1.88+` を要求する。Macでは `rustc 1.94.1` で確認済み。

## 重要パス

- Project root: `.`

## 詳細ログ

- [2026-07-13](2026-07/2026-07-13_handy-m.md)
- [2026-06-10](2026-06/2026-06-10_handy-m.md)

## 旧進捗ソース

- なし。2026-06-10に `progress/` を新規初期化。

## 移行検証後の削除候補

- [cleanup-candidates.md](cleanup-candidates.md)

## 最近の更新

- 2026-07-13: upstream v0.9.2を取り込み、構造化カスタム辞書を新音声認識基盤へ統合。
- 2026-07-13: Windowsで全自動検証、release bundle生成、起動とGPU/CPUバックエンド初期化を確認。
- 2026-07-13: `main`追従設定、AGENTS.md、Windows UTF-8ビルド手順を整備。
- 2026-06-10: 共通進捗管理を初期化。
- 2026-06-10: upstream最新化とMac側検証を完了。
- 2026-06-10: Windowsローカルビルド用に署名コマンドを削除。
- 2026-06-10: Windows実機でclone、依存導入、GPU/Vulkan前提確認、Tauri bundle生成、起動確認を完了。
- 2026-06-10: 日本語aliasのカスタム単語置換を修正。
