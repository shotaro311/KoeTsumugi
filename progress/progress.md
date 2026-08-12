---
project_slug: handy-m
updated: 2026-08-12
updated_by: codex
status: active
---

# Project Progress: handy-m

## 概要

- KoeTsumugi は upstream `cjpais/Handy` に個人用カスタムを重ね、旧名Handy_mから独自ブランドへ移行したローカルfork。
- `shotaro/custom` でカスタム差分を管理し、`main` は upstream tracking として維持する。

## 最新の検証済み状態

- 2026-08-12: KoeTsumugi 1.0.5の正式Mac配布を実装。version、release notes、配布docs、Windows/macOS統合license台帳、Developer ID署名、公証済みappとDMGだけをdraftへuploadするrelease gateを整備した。633 package、manual review 0件、license/notice本文308種。ローカルarm64 appはDeveloper ID署名、Apple公証Accepted、staple、Gatekeeperの`Notarized Developer ID`、既存DB v4・マイク・Metal初期化まで確認。GitHubへApple配布Secret 5件を登録し、Apple app-specific passwordの本人認証待ち。
- 2026-08-12: Macの`shotaro/custom`を公開リポジトリ移転後のcommit `a2fc387`へfast-forwardし、KoeTsumugi 1.0.4をApple Silicon向けにローカルbuildした。format、lint、frontend build、23言語447 key、Tauri release app bundleが成功。`/Applications/Handy_m.app`はゴミ箱へ移し、`/Applications/KoeTsumugi.app`へinstallした。build/install binaryのSHA-256一致、ad-hoc署名整合性、version 1.0.4、bundle ID `com.shotaro.handym`、起動中process、既存履歴DB v4、app data 28ファイル、model 491,852,915 bytes、マイク初期化、Metal/CPU backendをreadbackした。
- 2026-08-10: [`KoeTsumugi v1.0.4`](https://github.com/shotaro311/KoeTsumugi/releases/tag/handy-m-v1.0.4)をcommit `d6eeacd`から公開。release workflow `31354337886`は全job成功。公開NSISは21,175,456 bytes（SHA-256 `C7F9A06F26BCA090002F7E16FD4597FC26F5D0502F31EC0F4D13DE38F9991601`）でGitHub asset digestと一致し、公開updater署名、`latest.json`のversion 1.0.4と`windows-x86_64-nsis`経路、asset API downloadのbinary一致を確認した。
- 2026-08-10: 公式Handy v0.9.5をKoeTsumugi 1.0.4へ統合。構造化日本語辞書、Cohere長文、Windows既定マイク変更、Alt+Space、独自ブランド/ID/updaterを維持し、Unicode境界、alias競合、後処理panicを安全化した。frontend lint/build、23言語447 key、配布URLtest、Windows x64 license inventory 567 package、Rust test 200件、通常Clippy、formatを確認。ローカル署名付きNSISを1.0.3へ実適用し、app data 18ファイル、設定、履歴DB、録音15件のhash一致、自動起動/shortcut、更新後起動を確認。旧`Handy_m`自動起動登録の残留も修正した。Note下書きはKoeTsumugiの非公式性と独自辞書を明確化し、正しいlatest releaseリンクを保存・再読込確認したが未公開。
- 2026-08-09: 停止したKoeTsumugi 1.0.3移行作業を現worktreeの`codex/koetsumugi-1.0.3-acceptance`へ再現。前worktreeの変更対象166ファイルをhash照合し、license資料4件は現時刻で再生成した。format/lint/frontend build/21言語、Windows依存542 package・本文285種、Rust test 142件、Clippy、release CLI/device列挙、NSIS内の旧Handy_m移行処理と法的資料5件を確認。最終NSIS 21,171,481 bytes（SHA-256 `FE9ABE4F5531FDD526E75789DFC2EDFD8C2F7EA75A1B294C33B4868620423B42`）のupdater署名を独立検証した。既存アプリへの再インストールは行わず、インストール済み1.0.3、旧binary/登録/shortcut除去、KoeTsumugi shortcut/autostart/uninstall、履歴・録音15件・model 2件保持をreadback。設定差分は更新後の`whats_new_last_seen_version`だけ。Windows NSISはupload可、MSI/macOSは不可と最終受入した。外部変更は未実施。
- 2026-08-08: ユーザー承認の段階移行をKoeTsumugi 1.0.3として実装。表示名/実行ファイル/UI/About/README/NSISを独自化し、`com.shotaro.handym`、updater鍵・endpoint、設定/モデル保存先を維持。独自通知音、GigaAM語彙の固定revision/hash、Windows x64依存542 packageのinventoryとlicense本文束を整備。format/lint/build/translation、Rust test 142件/Clippy、署名付きNSISと署名検証を完了。インストール済み1.0.2から実更新し、設定/履歴/録音/モデル、shortcut/autostart/uninstall登録、更新後起動を確認。外部変更は未実施。
- 2026-07-16: [`Handy_m v1.0.2`](https://github.com/shotaro311/KoeTsumugi/releases/tag/handy-m-v1.0.2)を公開。release workflow `29506603157`は全job成功。公開NSIS・MSIのupdater署名を独立検証し、`latest.json`のversion 1.0.2、Windows x64のNSIS/MSI target、asset API経路のbinary hash一致を確認。
- 2026-07-16: VADオンのCohere長文で文章が省かれる問題を修正。Cohereだけ30秒以下へ低エネルギー境界で非重複分割し、truncation時は20秒以下へ再試行する。57.6秒・120.8秒・300.9秒の番号付き日本語TTSで全4/9/23区間、順序、重複なし、末尾文を確認。旧single-shotは1/2/5分相当で3/4/4区間までだった。Rust test 142件、Clippy、frontend lint/build、21言語、release build、インストール先hash一致、起動・マイク初期化を確認。環境変数でCohereだけ旧動作へ戻せる。
- 2026-07-15: WindowsでOSの既定マイクを切り替えた後、Handy_mが古い常時オン入力ストリームを保持する問題を修正。録音開始時にWASAPIエンドポイントIDとCPALストリーム健全性を確認し、変更・切断時だけ自動再生成する。音声コールバック停止中も50ms周期で終了指示を処理する。Rust test 132件、Clippy、frontend lint/build、21言語、release build、インストール先hash一致、起動・マイク初期化・最初の音声チャンクを確認。
- 2026-07-14: WindowsのAlt+Space音声入力で、ブラウザがAlt単独操作としてメニューフォーカスへ移る問題を修正。割り当てを変えず、Alt+Space検出時だけAlt単独扱いを抑止する。Chrome実入力欄でフォーカス維持と`HANDY_FIXED_PASTE_OK`の貼り付け、抑止ログ、ローカル本番buildのインストールを確認。
- 2026-07-14: ユーザーが確定した候補29件をインストール済みHandy_mのカスタム辞書へ反映。既存`ChatGPT`を保持して合計30件、output重複なし、候補内容の完全一致、辞書以外の設定保持、アプリ再起動後の設定維持を確認。
- 2026-07-14: ローカル辞書候補画面で各候補の別名・読みを編集可能にした。変更はブラウザへ保存され、検索、コピー結果、登録用JSONへ反映。重複・空白・正しい表記と同一の読みは保存時に除去する。
- 2026-07-14: 辞書候補29件をワンクリックで除外指定できるローカルHTMLを`docs/custom-dictionary-review.html`へ追加。選択の自動保存、検索、表示絞り込み、除外結果のコピー、登録用JSON保存を実装し、構文・整形・候補データを検証。
- 2026-07-14: 最近3日分の利用記録と現在の辞書を基に、誤認識しやすい固有名詞29件を`docs/custom-dictionary-candidates.md`へ整理。`[x]`を除外指定とし、既存の`ChatGPT`登録との重複や一般語を巻き込む危険なaliasを避けた。
- 2026-07-13: [`Handy_m v1.0.1`](https://github.com/shotaro311/KoeTsumugi/releases/tag/handy-m-v1.0.1)を公開。release workflow `29222247004`は全job成功し、公開NSISのSHA-256とupdater署名を独立検証。インストール済み1.0.0で「アップデートあり」の表示まで確認。
- 2026-07-13: Handy_m 1.0.1としてWindowsのHugging Faceモデル取得を安定化。reqwest既定経路でWinSock 10054が再現し、WindowsのみIPv4 + HTTP/1.1へ固定すると連続通信試験とWhisper Medium 831,538,144 bytesの実ダウンロードが成功。
- 2026-07-13: 一時的なHugging Face通信失敗を最大4回再試行し、並列数を4へ抑制、同一モデルの重複要求を集約。frontend、21言語、`cargo check`、Rust unit test 123件、署名付きMSI/NSIS build、1.0.1起動・応答を検証。
- 2026-07-13: GitHub Actions Secrets登録と`shotaro/custom`のpushを完了し、[`handy-m-v1.0.0`](https://github.com/shotaro311/KoeTsumugi/releases/tag/handy-m-v1.0.0)を公開。release workflow `29218527825` は約30分で成功。
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

- KoeTsumugi 1.0.5のApple app-specific password登録、release workflow実行、公開asset/readback、公開DMGからのMac再導入、Note記事追記を進行中。
- Macローカル環境はKoeTsumugi 1.0.4へ移行済み。旧Handy_mのapp bundleはゴミ箱に保持し、既存設定・履歴・録音・モデルは共通bundle IDの保存先に残している。
- KoeTsumugi 1.0.4のsource、Windows NSIS、updater metadataは公開済み。1.0.5からApple Silicon macOSを正式配布対象へ追加する。full uninstall/rollback、Windows Authenticode、正式な商標クリアランスは未完了。MSI、Intel Mac、Linuxは公開対象外。
- Windows実機: VADオンのCohereで5分程度の自然発話をホットキーから録音し、履歴保存と実利用アプリへの貼り付けまで確認する。保存済み音声と番号付きTTSのheadless検証、インストール済みbinaryの起動は確認済み。
- Windows実機: OSの既定マイクを別エンドポイントへ切り替え、設定画面で再選択せず次の録音が自動復旧することを確認する。自動判定・再生成の単体テストと現在のマイクでの起動は確認済み。
- インストール済み1.0.1から1.0.2へのdownload、install、relaunchは未実施。公開metadata、binary transport、署名検証までは確認済み。
- Windows実機: 実音声を使った文字起こしとIME変換中の貼り付けを確認する。Alt+Space後のChrome入力欄フォーカス維持とCtrl+V貼り付け経路は確認済み。

## 次アクション

- 前回監査で確認した既存辞書の曖昧trigger 2件は、設定画面で意図する表記を選び片方のaliasを修正する。1.0.4では曖昧なままでも登録順による誤置換はせず、そのtriggerだけ無視する。
- 次回release判断前に、必要ならfull uninstall/rollbackを追加検証する。
- KoeTsumugi 1.0.5の正式配布後、公開DMGの署名、公証、Gatekeeper、起動、updater metadataを匿名download経路から再確認する。
- VADオンのCohereで実際の長文を録音し、文章欠落、境界重複、停止後待ち時間、最終貼り付けを確認する。問題があれば `HANDY_DISABLE_COHERE_LONG_FORM_CHUNKING=1` を設定して再起動し、旧single-shotへ戻す。
- Windowsのサウンド設定または実機接続で既定マイクを切り替え、次回録音のログに`Reopening microphone stream: TargetChanged`が出て音声入力できることを確認する。
- 実際の音声認識履歴を見ながら、今回登録したカスタム辞書のaliasを追加・削除する。
- Handy_mの設定画面から1.0.2を適用し、download、install、relaunch、更新後versionを実機確認する。
- 実利用アプリ上で、実音声の文字起こしとIME変換中の貼り付け結果を確認する。
- ダウンロード済みWhisper Mediumを使い、実音声でGPU認識品質と速度を確認する。

## Blocker / Risk

- 公開中の現行版はKoeTsumugi v1.0.4。Windows NSIS、updater署名、既存環境への実更新受入、公開assetのreadbackは完了。release workflowは明示的な手動実行専用。
- Rust 1.96の`cargo clippy -- -D warnings`は公式v0.9.5由来の既存警告で失敗する。通常Clippyは完了し、今回追加した辞書コードの警告は解消済み。CIのRust版または公式側修正に合わせて厳格化を再確認する。
- 1.0.2から1.0.3へのNSIS実更新は成功したが、full uninstall/rollbackは未実施。更新前退避は `C:\Users\shotaro\.codex\backups\koetsumugi-migration-20260808-180030` に保持する。
- `tauri-nspanel 2.1.0`はlocked sourceのMIT/Apache-2.0本文を確認し、macOS配布ブロッカーを解消した。GigaAM語彙と通知WAVの由来問題も解消済み。
- Windows dependency本文束は542 package中486 packageから285 unique textを収集。package-local本文がない56 packageは宣言・source・authorsを保持しているがrelease review対象として残る。
- Cohereの正常終了扱いの早期EOSはAPIから直接検知できないため、30秒以下への事前分割で回避する。VAD後音声に静かな境界がない場合は境界語の精度が変わる可能性がある。安全弁とバックアップ実行ファイルで即時復旧可能。
- 既定マイク変更・CPALエラー・音声チャンク停止時の自動回復ロジック、release build、インストール、現在のDJI Mic Miniでの初期化までは検証済み。OSの既定マイクを実際に変更する操作はユーザー環境を勝手に変えないため未実施。
- 1.0.2の公開metadata、binary transport、NSIS/MSI署名は確認済み。現在起動中の1.0.1からのinstall/relaunchは、利用中の音声入力を中断しないためユーザー操作へ残している。
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

- [2026-08-12](2026-08/2026-08-12_handy-m.md)
- [2026-08-10](2026-08/2026-08-10_handy-m.md)
- [2026-08-09](2026-08/2026-08-09_handy-m.md)
- [2026-08-08](2026-08/2026-08-08_handy-m.md)
- [2026-07-16](2026-07/2026-07-16_handy-m.md)
- [2026-07-15](2026-07/2026-07-15_handy-m.md)
- [2026-07-14](2026-07/2026-07-14_handy-m.md)
- [2026-07-13](2026-07/2026-07-13_handy-m.md)
- [2026-06-10](2026-06/2026-06-10_handy-m.md)

## 旧進捗ソース

- なし。2026-06-10に `progress/` を新規初期化。

## 移行検証後の削除候補

- [cleanup-candidates.md](cleanup-candidates.md)

## 最近の更新

- 2026-08-12: KoeTsumugi 1.0.5としてApple Silicon向けDeveloper ID署名、app/DMG別公証、staple、Gatekeeper、macOS updater assetを必須化する正式配布workflowを実装。統合license台帳とローカル公証済みappを検証し、Apple配布Secret 5件を登録した。
- 2026-08-12: Macの旧Handy_m 1.0.2をゴミ箱へ移し、公式release v1.0.4相当のKoeTsumugiをローカルbuildして`/Applications`へinstall。既存app data、履歴DB、model、マイク、Metal backend、起動状態をreadbackした。
- 2026-08-10: ユーザー承認後、`shotaro/custom`へ統合済みのローカル作業ブランチ5本を`git branch -d`で削除し、cleanな一時worktreeも通常削除した。リモートブランチには変更なし。ローカルは`main`と`shotaro/custom`、本worktreeのみ。
- 2026-08-10: KoeTsumugi 1.0.4を`shotaro/custom`へpushし、workflow `31354337886`からWindows NSISを公開。公開metadata、asset API download、SHA-256、updater署名をreadbackした。
- 2026-08-10: 1.0.3から1.0.4へWindows NSIS実更新し、データ/登録保持、更新後起動、旧Handy_m自動起動登録の除去まで確認。Note下書きは更新済みだが未公開。
- 2026-08-09: KoeTsumugi 1.0.3差分を新worktreeへ完全移行し、現sourceから最終署名NSISを再生成・独立検証。インストール済み状態と退避データをreadbackし、Windows NSISをupload可と最終受入。push/release/installは未実施。
- 2026-08-08: 声を直接イメージできる新アイコン案をVoice Pearl、Breath Ribbon、Resonance Bloomの3方向で生成。名称候補KoeFumi、KoeLume、OtoLoomとともに選択待ち。現行アプリは未変更。
- 2026-08-08: 横顔の開いた口からテキスト行が出るアイコン案を、青色グラデーション、暖色フラット、円形メダリオンの3方向で追加。現行アプリは未変更。
- 2026-08-08: 円形メダリオン案を正式アイコンへ反映し、全platform icon、UI、colored/monochrome tray素材を再生成。KoeFumiは既存「コエフミ」商品と近接音声入力「koebun（声文）」のため公開名として不採用を推奨し、renameは未実施。
- 2026-08-08: KoeTsumugi 1.0.3の段階移行、独自アイコン/通知音、帰属/第三者notice、Windows target license本文束、NSIS旧環境移行を実装。署名付きNSIS、updater署名、1.0.2実更新、データ/登録移行、更新後起動を検証。source/Windows NSISはupload準備可、MSI/macOSは公開不可と判定。
- 2026-07-16: Handy_m 1.0.2を公開。workflow全job、5つの公開asset、`latest.json`、asset API download、公開NSIS/MSIのupdater署名を検証。
- 2026-07-16: Cohere長文を30秒以下へ低エネルギー分割し、truncation再試行と環境変数の安全弁を追加。1/2/5分相当の番号付き日本語TTSとインストール済みrelease binaryで欠落・重複・順序を検証。
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
