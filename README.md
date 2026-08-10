# KoeTsumugi

![KoeTsumugi app icon](assets/branding/app-icon-master.png)

KoeTsumugi is a Windows-focused local speech-to-text application with a
structured Japanese custom dictionary. Press a shortcut, speak, and the
transcribed text is pasted into the active application.

> [!IMPORTANT]
> KoeTsumugi is an unofficial, independently branded derivative of the
> MIT-licensed [Handy](https://github.com/cjpais/Handy) source code. It is not
> affiliated with, endorsed by, or supported by the Handy project or its
> maintainers. The Handy name, logo, icon, and other brand assets are not used
> as KoeTsumugi branding.

## Current status

- The customized binary and NSIS installer are currently supported on Windows
  x64. The MSI produced by a default local build does not implement the
  Handy_m-to-KoeTsumugi migration and is not a release artifact.
- The latest public Windows release is
  [KoeTsumugi v1.0.3](https://github.com/shotaro311/KoeTsumugi/releases/tag/handy-m-v1.0.3).
  The current development source is 1.0.4 and includes the upstream Handy
  v0.9.5 changes; it has not been published.
- macOS and Linux source paths remain in the repository because they come from
  the upstream codebase, but this derivative does not currently offer or claim
  verified macOS/Linux releases.
- Windows Authenticode signing is not configured. Windows SmartScreen may warn
  when opening a downloaded installer.

## Main differences from upstream

- A structured custom dictionary stores a preferred spelling plus multiple
  aliases or readings.
- Each dictionary entry can independently provide a model prompt and/or
  post-transcription replacement.
- Windows default-microphone recovery, Alt+Space paste behavior, and long-form
  Cohere transcription contain additional fixes for this fork. General model
  downloading now follows the upstream v0.9.5 retry and mirror implementation.
- The application name, icon, wordmark, tray/state icons, About screen, and
  installer presentation use independent KoeTsumugi branding.

## Privacy and network behavior

Speech recognition runs on the selected local model after that model has been
downloaded. “Local” does not mean the application never uses the network:

- model installation downloads model files;
- the application checks the KoeTsumugi update endpoint when update checks are
  enabled; and
- enabling an optional cloud post-processing provider sends transcription text
  to that selected provider.

Review the provider and model terms before enabling cloud processing or using a
model for commercial work.

## Install and update compatibility

Approved Windows releases are available from the
[derivative release page](https://github.com/shotaro311/KoeTsumugi/releases/latest).
Do not use the upstream Handy download page to install KoeTsumugi.

Version 1.0.3 is the compatibility stage of the rename from `Handy_m`:

- the application and executable are renamed to `KoeTsumugi` and
  `koetsumugi.exe`;
- the existing identifier `com.shotaro.handym` and updater public key are
  intentionally retained;
- existing settings, history, recordings, and downloaded models continue to
  use the same application-data directory;
- the Windows installer migrates the existing install location, executable,
  Start Menu/Desktop shortcuts, uninstall registration, and enabled startup
  entry; and
- legacy internal paths and release tags may therefore continue to contain
  `Handy_m` or `handy-m` during this compatibility stage.

A later release may move to a new identifier and repository only after a tested
data migration and rollback path exists.

## Development

Prerequisites:

- current stable [Rust](https://rustup.rs/)
- [Bun](https://bun.sh/)
- platform dependencies documented in [BUILD.md](BUILD.md)

```shell
bun install --frozen-lockfile
bun run tauri dev
```

Verification:

```shell
bun run format:check
bun run lint
bun run build
bun run check:translations
bun run licenses:inventory
```

On Japanese-locale Windows, use the `TRANSCRIBE_CMAKE_ARGS` value documented in
[BUILD.md](BUILD.md) when building the Rust application.

## License and attribution

Substantial portions of KoeTsumugi are derived from
[cjpais/Handy](https://github.com/cjpais/Handy), copyright 2025 CJ Pais, under
the MIT License. The original notice and complete MIT terms are retained in
[LICENSE](LICENSE). Modifications are copyright 2026 Shotaro Matsumoto.

Dependencies, bundled resources, and downloadable speech-recognition models
have their own terms. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and
the generated
[third-party license inventory](docs/generated/THIRD_PARTY_LICENSE_INVENTORY.md).
Windows release resources also include the generated package-local
[license and notice text bundle](docs/generated/THIRD_PARTY_LICENSE_TEXTS.txt).
Do not describe the entire distribution or every downloadable model as MIT
licensed or commercially usable.

## Known redistribution checks

- `tauri-nspanel` 2.1.0 does not currently expose a license declaration in its
  manifest or a root license file in its referenced repository. macOS
  distribution remains blocked.
- The bundled GigaAM vocabulary is byte-identical to the fixed, MIT-declared
  source revision and is documented with its SHA-256 in
  [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
- The original upstream notification WAV files have been replaced in this fork
  with independently synthesized KoeTsumugi tones. Their generation script and
  parameters are retained in the repository.

This repository and its documents provide engineering attribution and release
checks, not legal advice or a trademark-clearance opinion.
