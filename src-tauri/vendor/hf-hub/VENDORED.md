# Vendored hf-hub

- Source: `https://github.com/cjpais/hf-hub`
- Commit: `63b60347570622bf898f49e7f10c2429b8dd21b6`
- Upstream branch: `cancellable-downloads`
- License: Apache-2.0; see `LICENSE`

KoeTsumugi vendors this exact revision because it provides the cancellable,
resumable Tokio download API used by the app.

The local change forces both reqwest clients to HTTP/1.1 over IPv4 on Windows.
On this Windows environment, reqwest's default address path is repeatedly reset
by `huggingface.co` and its CDN with WinSock error 10054, while five consecutive
metadata and range requests succeed with the IPv4/HTTP1 combination. Other
platforms retain the upstream client configuration.
