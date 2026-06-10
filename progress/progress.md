---
project_slug: handy-m
updated: 2026-06-10
updated_by: codex
status: active
---

# Project Progress: handy-m

## 概要

- Handy_m は upstream `cjpais/Handy` に個人用カスタムを重ねるローカルfork。
- `shotaro/custom` でカスタム差分を管理し、`main` は upstream tracking として維持する。

## 最新の検証済み状態

- 2026-06-10: upstream `main` 最新 `7901ef7` を `shotaro/custom` にマージ済み。
- 2026-06-10: Mac側で `format:check`、`lint`、frontend build、translation check、`cargo check`、`tauri build` が通過。
- 2026-06-10: GitHub Release 最新は `v0.8.3`。現在のカスタムブランチは `v0.8.3-10-g3e9a1e9` 相当。
- 2026-06-10: Windows向けに upstream のAzure Trusted Signing用 `signCommand` を削除済み。
- 2026-06-10: Windows実機で `bun install`、`format:check`、`lint`、frontend build、translation check、`cargo check`、`tauri build` が通過。`handy.exe`、MSI、NSIS installerを生成。
- 2026-06-10: Windows起動確認でメインウィンドウ表示、ログ生成、マイクストリーム初期化まで確認。
- 2026-06-10: 日本語aliasを含むカスタム単語の過剰置換を修正し、辞書処理テスト33件が通過。

## 進行中

- Windows実機: 生成済みinstallerの手動インストール後、実利用のショートカット、貼り付け、IME入力を確認する。

## 次アクション

- `C:\hm-target\release\bundle\nsis\Handy_m_0.8.3_x64-setup.exe` から未署名installerを手動実行し、Windows SmartScreen表示を許可して動作確認する。
- 実利用アプリ上でショートカット録音、貼り付け方法、IME中の貼り付け結果を確認する。

## Blocker / Risk

- Windows installerは個人用forkでは未署名。SmartScreen警告が出る可能性がある。
- 自動検証ではショートカット録音、実アプリへの貼り付け、IME変換中の貼り付けまでは未確認。アプリ起動とマイクストリーム初期化は確認済み。
- Macの通常PATHでは `~/.local/bin/xattr` がTauri bundlerと相性不一致。Mac build時は `/usr/bin` を先に置く。
- WindowsではRust/Tauri build時にLLVM、CMake、Vulkan SDK、Visual Studio Build Tools、短い `CARGO_TARGET_DIR` が必要。

## 引き継ぎ

- Windows側は `shotaro/custom` を使う。upstream追従は `main -> shotaro/custom` の順で行う。
- Rustは依存が `rustc 1.88+` を要求する。Macでは `rustc 1.94.1` で確認済み。

## 重要パス

- Project root: `.`

## 詳細ログ

- [2026-06-10](2026-06/2026-06-10_handy-m.md)

## 旧進捗ソース

- なし。2026-06-10に `progress/` を新規初期化。

## 移行検証後の削除候補

- [cleanup-candidates.md](cleanup-candidates.md)

## 最近の更新

- 2026-06-10: 共通進捗管理を初期化。
- 2026-06-10: upstream最新化とMac側検証を完了。
- 2026-06-10: Windowsローカルビルド用に署名コマンドを削除。
- 2026-06-10: Windows実機でclone、依存導入、GPU/Vulkan前提確認、Tauri bundle生成、起動確認を完了。
- 2026-06-10: 日本語aliasのカスタム単語置換を修正。
