# Brand and attribution review

Reviewed 2026-08-08 against the local `shotaro/custom` branch, the public
`shotaro311/Handy` repository, and the current upstream `cjpais/Handy`
repository. This is an engineering and publication-risk review, not legal
advice or a trademark clearance opinion.

## Confirmed upstream condition

The upstream [README](https://github.com/cjpais/Handy#license) states that the
source code is MIT licensed, but the Handy name, logo, icon, and brand assets
are not open source. It requires unofficial forks, rewrites, and
redistributions to use independent branding and not imply endorsement or
affiliation. The upstream [LICENSE](https://github.com/cjpais/Handy/blob/main/LICENSE)
requires the original copyright and MIT permission notice to remain in copies
or substantial portions of the software.

## Problems confirmed in the customized fork

- The public repository README still presents the application as Handy and
  directs readers to the upstream website, releases, package managers,
  contribution channels, donations, and support contacts without an immediate
  unofficial-fork disclosure.
- The desktop and mobile app icons were byte-identical to the upstream assets.
  The tray idle icon and the in-app navigation used the upstream hand mascot,
  and the sidebar/onboarding used the upstream wordmark.
- `Handy_m` changes only part of the displayed product name. Many UI strings,
  the tray tooltip, CLI description, package metadata, release notes, About
  links, and HTTP client identification still use Handy as this fork's own
  product name.
- About links directly to the upstream donation page and upstream repository.
  In a fork, those links require explicit labels separating upstream support
  from this derivative's source and support channels.
- The MIT copyright notice is retained, but the package does not yet provide a
  complete release-specific third-party license bundle. The model catalog also
  contains licenses ranging from permissive terms to CC BY-NC and
  model-specific conditions.

## Independent name candidates

1. **KoeTsumugi** (recommended): evokes turning voice into composed words,
   fits Japanese dictation and a structured dictionary, and is distinctive in
   a quick exact-name web and GitHub search.
2. **VoxKana**: short and voice-oriented, but pronunciation and the structured
   dictionary purpose are less obvious.
3. **Kotonoha Dictate**: communicates the purpose, but is longer and uses a
   crowded naming theme.

`KoeScribe` was excluded because active repositories already use the name.
These checks only reduce obvious collisions. They do not establish trademark
availability, registrability, domain ownership, or freedom to operate. A real
clearance search should cover the intended countries, software/services
classes, app stores, domains, and confusingly similar marks before public
launch.

`KoeFumi` / `コエフミ` was considered later and rejected for public use. An
existing Japanese product already uses the exact `コエフミ` name for letters
that play recorded voice messages, and the active `koebun（声文）` product is a
Japanese voice-input application. These uses create avoidable name and category
confusion even without making a conclusion about trademark registration. See
[株式会社ミドリ印刷のコエフミ](https://www.midori-p.com/koefumi/) and
[koebun（声文）](https://koebun.com/).

## Identity migration decision and implementation

The approved first step is implemented as KoeTsumugi 1.0.3: the visible
product, executable, UI, icons, installer metadata, and release documentation
use the independent KoeTsumugi identity. The current
`com.shotaro.handym` identifier, update signing key, and update endpoint are
intentionally retained for this compatibility release. This preserves the
existing settings/model data location and the 1.0.2 update path. It also leaves
legacy internal paths, release tags, and the GitHub repository URL containing
`Handy`; these are compatibility details, not current branding.

A later full split to `com.shotaro.koetsumugi` and a new update endpoint gives
the cleanest identity boundary, but it makes the app a new installation unless
settings/models are migrated. It therefore requires a documented migration and
rollback plan plus a separate decision before implementation.

The selected production icon now uses a compact side-profile symbol whose open
mouth emits a voice wedge and three text lines. The source image is retained at
`assets/branding/app-icon-source-profile-speech.png`; deterministic preparation
creates the 2048px transparent-corner master, frontend image, platform app
icons, colored idle icon, and monochrome tray variants. This icon decision is
independent of the unresolved final product name.

## Safe facts for a Note article

Suggested factual description:

> KoeTsumugiは、MITライセンスで公開されているHandyのソースコードを基に、
> Windowsでの日本語音声入力と構造化カスタム辞書を中心に個人改修した非公式派生版です。
> 元プロジェクトとは提携しておらず、承認・サポートを受けた公式版ではありません。
> 音声認識は選択したローカルモデルを使ってPC上で実行します。初回のモデル取得と更新確認
> には通信が発生し、クラウド後処理を有効にした場合は文字起こし結果が選択した外部APIへ
> 送信されます。元コードの著作権表示とMITライセンス、各依存ライブラリ・音声モデルの
> ライセンスはそれぞれ維持されます。

Statements to avoid until separately verified:

- “公式Handyの改良版”, “Handy公認”, or language implying endorsement.
- “完全オフライン” without explaining model downloads, update checks, and
  optional cloud post-processing.
- “すべてMIT” or “商用利用可能” for every selectable model.
- “商標上問題ない”, “権利処理済み”, or any claim of completed trademark
  clearance.
- Cross-platform quality claims when the customized behavior has only been
  exercised on Windows.

## Remaining release blockers

- Confirm the new name through an appropriate trademark and marketplace search.
- The actual 1.0.2-to-1.0.3 NSIS upgrade was tested on Windows. The existing
  install directory and `com.shotaro.handym` data location were retained,
  `handy.exe` and the legacy registry/shortcut entries were replaced by
  KoeTsumugi, auto-start migrated, settings/history/recordings were unchanged,
  and the installed 1.0.3 application started and reopened through the
  single-instance path. Full uninstall and rollback recovery remain untested.
- The exact vocabulary provenance and notification WAV redistribution issues
  are resolved as documented in [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).
- Regenerate the Windows x64 dependency inventory and collected license-text
  bundle before each release. The 56 packages without package-local license
  files remain explicitly listed with their declarations and authors for
  release review.
- Resolve `tauri-nspanel` 2.1.0 before macOS distribution. Its manifest has no
  license declaration and its source repository currently has no root license
  file; it is not expected to be linked into Windows builds.
- Ensure the app exposes derivative source, upstream attribution, license, and
  third-party notices without presenting upstream donation/support as support
  for the derivative.

## Publication decision

- **Note article:** publishable with the factual wording above, the unofficial
  derivative disclosure, and no claim that the repository or binaries have
  already been published. If the article includes a download link, the linked
  source/release must first be published through a separately approved external
  operation.
- **Windows NSIS:** technically suitable as a release candidate based on the
  build, updater-signature, dependency-license, and installed-upgrade checks.
  Disclose that Windows Authenticode signing and formal trademark clearance
  are not complete. Full uninstall/rollback testing is still recommended
  before presenting it as broadly validated.
- **Windows MSI and macOS:** not approved for publication in this review. The
  MSI lacks the legacy migration path, and the macOS-only `tauri-nspanel`
  license remains unresolved.
