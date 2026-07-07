# ARI Fast route dashboard

Dashboard: https://irenelivemap.github.io/ari-fast-route-dashboard/

This dashboard summarizes the internal blind side-by-side benchmark comparing ARI Fast routes with Google walking routes.

## Fresh test data

The dashboard is prepared to load fresh benchmark results through a small reusable data service:

```text
https://ari-fast-route-dashboard-data.vercel.app/api/ari-fast-routes/refresh
```

The service code lives in `dashboard-data-service/`. Once deployed, people can click **Check for new data** in the dashboard after adding new benchmark results, without using GitHub.
