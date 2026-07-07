# Dashboard data service

Small Cloudflare Worker used by static dashboards to load fresh benchmark data without asking viewers to use GitHub.

## Routes

- `GET /` lists available dashboards.
- `GET /ari-fast-routes` returns the cached ARI Fast benchmark data.
- `GET /ari-fast-routes/refresh` fetches the newest benchmark data from the source backend, updates the cache, and returns it immediately.

The current source for `ari-fast-routes` is:

```text
https://tbt-routing.paas.livemap.sh/api/v1/field/feedback
```

## Deploy

From this folder:

```bash
npx wrangler deploy
```

Then attach the worker to the desired custom domain, for example:

```text
https://dashboard-data.livemap.sh
```

The dashboard currently expects:

```text
https://dashboard-data.livemap.sh/ari-fast-routes/refresh
```

## Optional KV cache

The worker works without KV by using Cloudflare cache. For a more persistent shared snapshot, create a KV namespace:

```bash
npx wrangler kv namespace create DASHBOARD_DATA_KV
```

Then paste the generated id into `wrangler.toml` and uncomment the `kv_namespaces` block.

## Add Another Dashboard

Add a new entry to `DASHBOARDS` in `worker.js`:

```js
"another-dashboard": {
  sourceUrl: "https://example.com/data.jsonl",
  contentType: "application/x-ndjson; charset=utf-8"
}
```

Then the dashboard can call:

```text
https://dashboard-data.livemap.sh/another-dashboard/refresh
```
