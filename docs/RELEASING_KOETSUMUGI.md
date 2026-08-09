# KoeTsumugi Release and Updater

KoeTsumugi uses a release and update channel that is independent from upstream
Handy. The legacy repository URL, tag prefix, app identifier, and key filenames
are retained during the staged migration from Handy_m.

## Stable identifiers

- GitHub repository: `shotaro311/Handy`
- Branch: `shotaro/custom`
- GitHub default branch: `shotaro/custom` (required for manual workflow dispatch)
- Release tag: `handy-m-v<version>`
- Updater metadata: `https://github.com/shotaro311/Handy/releases/latest/download/latest.json`
- Signing private key: `%USERPROFILE%\.tauri\handy-m.key` (outside the repository)
- Signing password: `%USERPROFILE%\.tauri\handy-m.key.password.clixml` (user-scoped DPAPI credential)
- Signing public key: embedded in `src-tauri/tauri.conf.json`

The private key and password must not be committed or printed. Back up both
files securely. Replacing or losing either one prevents installed copies from
accepting future updates. The DPAPI credential can only be decrypted by the
Windows user account that created it.

## One-time GitHub setup

Create the following Actions secret in `shotaro311/Handy`:

- `TAURI_SIGNING_PRIVATE_KEY`: the complete contents of
  `%USERPROFILE%\.tauri\handy-m.key`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: the decrypted value stored in
  `%USERPROFILE%\.tauri\handy-m.key.password.clixml`

Do not paste either value into logs, issues, release notes, or chat messages.

## Release checklist

1. Increment the KoeTsumugi version in `package.json`, `src-tauri/Cargo.toml`, and
   `src-tauri/tauri.conf.json`. Run Cargo once to synchronize
   `src-tauri/Cargo.lock`.
2. Add `src/content/release-notes/<version>.md` with user-facing changes.
3. Run formatting, lint, frontend build, translation validation, Rust tests,
   and a signed updater build.
4. Commit the release changes on `shotaro/custom`.
5. Obtain explicit approval before push or publication.
6. Push `shotaro/custom`, then run:

   ```powershell
   gh workflow run handy-m-release.yml --repo shotaro311/Handy --ref shotaro/custom
   ```

7. Confirm that the published release contains `latest.json`, the NSIS
   installer, and its `.sig` signature. Confirm that the `windows-x86_64-nsis`
   URL returns the installer when requested with
   `Accept: application/octet-stream`.

The workflow creates a draft release first and publishes it only after the
Windows x64 build and package audit succeed.

## Local signed updater build

```powershell
$keyPath = Join-Path $env:USERPROFILE ".tauri\handy-m.key"
$credentialPath = Join-Path $env:USERPROFILE ".tauri\handy-m.key.password.clixml"
$credential = Import-Clixml -LiteralPath $credentialPath
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = $credential.GetNetworkCredential().Password
$env:TAURI_SIGNING_PRIVATE_KEY = Get-Content -Raw -LiteralPath $keyPath
$env:LIBCLANG_PATH = "C:\Program Files\LLVM\bin"
$env:VULKAN_SDK = "C:\VulkanSDK\1.4.350.0"
$env:CARGO_TARGET_DIR = "C:\hm-target"
$env:TRANSCRIBE_CMAKE_ARGS = "-DCMAKE_CXX_FLAGS=/utf-8 -DCMAKE_CXX_FLAGS_RELEASE=/utf-8"
bun tauri build --config src-tauri/tauri.updater.conf.json --bundles nsis
```

Normal local builds do not use the updater config and therefore do not require
the signing key.
