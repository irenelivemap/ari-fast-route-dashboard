const DASHBOARDS = {
  "ari-fast-routes": {
    sourceUrl: "https://tbt-routing.paas.livemap.sh/api/v1/field/feedback",
    contentType: "application/x-ndjson; charset=utf-8"
  }
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Vary": "Origin"
};

function applyCors(res) {
  Object.entries(CORS_HEADERS).forEach(([key, value]) => res.setHeader(key, value));
}

function sendJson(res, status, body, headers = {}) {
  applyCors(res);
  Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
  res.status(status).json(body);
}

function sendText(res, status, body, headers = {}) {
  applyCors(res);
  Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
  res.status(status).send(body);
}

function handleOptions(req, res) {
  if (req.method !== "OPTIONS") return false;
  applyCors(res);
  res.status(204).end();
  return true;
}

function allowOnlyGet(req, res) {
  if (req.method === "GET") return true;
  sendJson(res, 405, { error: "Method not allowed" }, { "Allow": "GET, OPTIONS" });
  return false;
}

async function fetchSource(config) {
  const response = await fetch(config.sourceUrl, {
    headers: { "Accept": "text/plain, */*" }
  });
  if (!response.ok) {
    throw new Error(`Source returned HTTP ${response.status}`);
  }
  return response.text();
}

async function sendDashboardData(req, res, slug, { refresh = false } = {}) {
  if (handleOptions(req, res)) return;
  if (!allowOnlyGet(req, res)) return;

  const config = DASHBOARDS[slug];
  if (!config) {
    sendJson(res, 404, { error: "Unknown dashboard", dashboards: Object.keys(DASHBOARDS) });
    return;
  }

  try {
    const body = await fetchSource(config);
    sendText(res, 200, body, {
      "Content-Type": config.contentType,
      "Cache-Control": refresh ? "no-store" : "s-maxage=60, stale-while-revalidate=300",
      "X-Dashboard-Data-Source": "source",
      "X-Dashboard-Slug": slug
    });
  } catch (error) {
    sendJson(res, 502, {
      error: "Could not load dashboard data",
      detail: error.message
    });
  }
}

function sendIndex(req, res) {
  if (handleOptions(req, res)) return;
  if (!allowOnlyGet(req, res)) return;

  sendJson(res, 200, {
    service: "dashboard-data",
    dashboards: Object.keys(DASHBOARDS),
    routes: [
      "/api",
      "/api/ari-fast-routes",
      "/api/ari-fast-routes/refresh"
    ]
  });
}

module.exports = {
  sendDashboardData,
  sendIndex
};
