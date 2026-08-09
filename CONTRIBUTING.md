# Contributing to KoeTsumugi

KoeTsumugi is an unofficial derivative of the MIT-licensed
[Handy](https://github.com/cjpais/Handy) source code. It is not affiliated with,
endorsed by, or supported by the upstream project or its maintainers.

Report KoeTsumugi-specific bugs and propose changes in this derivative
repository. If a problem also reproduces in an unmodified upstream build,
follow the upstream project's current contribution instructions separately.

## Development checks

Use a feature branch based on `shotaro/custom`. Before opening a pull request,
run:

```shell
bun install --frozen-lockfile
bun run format:check
bun run lint
bun run build
bun run check:translations
bun run licenses:inventory
cd src-tauri
cargo test --locked
```

On Japanese-locale Windows, set the UTF-8 CMake flags documented in
[BUILD.md](BUILD.md) before Rust builds.

Changes to the app identifier, updater endpoint, signing key, persistent data,
or migration behavior require an explicit compatibility and rollback plan.
Do not include secrets, signing keys, credentials, downloaded speech models,
or upstream brand assets.

Contributions are accepted under the MIT License in [LICENSE](LICENSE). Retain
upstream copyright and attribution, and add required third-party notices for
new dependencies or assets.
