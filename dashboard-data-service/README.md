# Dashboard data service

Small Vercel service used by static dashboards to load fresh benchmark data without asking viewers to use GitHub.

The dashboard is still hosted as static HTML on GitHub Pages. This service only reads the latest data from the benchmark backend and returns it with browser-friendly CORS headers.

## Routes

- `GET /api` lists available dashboards.
- `GET /api/ari-fast-routes` returns the latest ARI Fast benchmark data.
- `GET /api/ari-fast-routes/refresh` fetches the newest benchmark data from the source backend and returns it immediately.

The current source for `ari-fast-routes` is:

```text
https://tbt-routing.paas.livemap.sh/api/v1/field/feedback
```

## Deploy

### Option A: Vercel UI

1. Create a new Vercel project.
2. Import this GitHub repository.
3. Set **Root Directory** to `dashboard-data-service`.
4. Deploy.
5. Copy the deployed URL.

To let the dashboard save refreshed data for everyone, add this environment variable in Vercel:

```text
GITHUB_WORKFLOW_TOKEN=your GitHub token
```

The token needs permission to dispatch repository workflows for `irenelivemap/ari-fast-route-dashboard`. With a fine-grained GitHub token, grant **Actions: Read and write** on this repository.

The dashboard expects a URL shaped like:

```text
https://ari-fast-route-dashboard-data.vercel.app/api/ari-fast-routes/refresh
```

If Vercel gives the project a different URL, update `DASHBOARD_DATA_SERVICE_URL` in `index.html`.

### Option B: Vercel CLI

From this folder, run:

```bash
npx vercel
```

For production:

```bash
npx vercel --prod
```

## Add Another Dashboard

Add a new entry to `DASHBOARDS` in `lib/dashboard-data.js`:

```javascript
"another-dashboard": {
  sourceUrl: "https://example.com/data.jsonl",
  contentType: "application/x-ndjson; charset=utf-8"
}
```

Then the dashboard can call:

```text
https://your-vercel-project.vercel.app/api/another-dashboard/refresh
```
