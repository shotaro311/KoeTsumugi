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

## 進行中

- Mac Codex: 個人GitHub forkへのpushとWindows Codexへの引き継ぎ。

## 次アクション

- `shotaro/custom` を `shotaro311/Handy` へpushする。
- Windows Codexに shared folder へのclone、Windows build、Windows入力最適化の確認を依頼する。

## Blocker / Risk

- Windows固有のビルド、GPU/DirectML、IME/貼り付け挙動はMac側では未検証。Windows実機で確認する。
- Macの通常PATHでは `~/.local/bin/xattr` がTauri bundlerと相性不一致。Mac build時は `/usr/bin` を先に置く。
- Windows installerは個人用forkでは未署名になる。配布時は別途署名方針を決める。

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
