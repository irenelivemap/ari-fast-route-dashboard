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
  "Access-Control-Expose-Headers": "X-Dashboard-Data-Checked-At, X-Dashboard-Data-Save, X-Dashboard-Data-Save-Error",
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

async function queueSnapshotUpdate(checkedAt) {
  const token = process.env.GITHUB_WORKFLOW_TOKEN;
  if (!token) return { status: "unconfigured" };

  const repository = process.env.GITHUB_REPOSITORY || "irenelivemap/ari-fast-route-dashboard";
  const workflowId = process.env.GITHUB_WORKFLOW_ID || "update-feedback-data.yml";
  const ref = process.env.GITHUB_WORKFLOW_REF || "main";
  const response = await fetch(`https://api.github.com/repos/${repository}/actions/workflows/${workflowId}/dispatches`, {
    method: "POST",
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "ari-fast-route-dashboard-data-service",
      "X-GitHub-Api-Version": "2022-11-28"
    },
    body: JSON.stringify({
      ref,
      inputs: checkedAt ? { checked_at: checkedAt } : {}
    })
  });

  if (response.status === 204) return { status: "queued" };
  const detail = await response.text();
  return {
    status: "failed",
    error: `GitHub returned HTTP ${response.status}${detail ? `: ${detail.slice(0, 180).replace(/[\r\n]+/g, " ")}` : ""}`
  };
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
    const checkedAt = refresh ? new Date().toISOString() : "";
    let save = { status: "not-requested" };
    if (refresh) {
      try {
        save = await queueSnapshotUpdate(checkedAt);
      } catch (error) {
        save = { status: "failed", error: error.message.replace(/[\r\n]+/g, " ") };
      }
    }
    sendText(res, 200, body, {
      "Content-Type": config.contentType,
      "Cache-Control": refresh ? "no-store" : "s-maxage=60, stale-while-revalidate=300",
      "X-Dashboard-Data-Source": "source",
      "X-Dashboard-Slug": slug,
      ...(checkedAt ? { "X-Dashboard-Data-Checked-At": checkedAt } : {}),
      "X-Dashboard-Data-Save": save.status,
      ...(save.error ? { "X-Dashboard-Data-Save-Error": save.error } : {})
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
