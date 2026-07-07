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

function textResponse(body, status = 200, headers = {}) {
  return new Response(body, {
    status,
    headers: {
      ...CORS_HEADERS,
      ...headers
    }
  });
}

function jsonResponse(body, status = 200, headers = {}) {
  return textResponse(JSON.stringify(body, null, 2), status, {
    "Content-Type": "application/json; charset=utf-8",
    ...headers
  });
}

function cacheKey(slug) {
  return `dashboard:${slug}:snapshot`;
}

async function readSnapshot(env, slug) {
  if (env.DASHBOARD_DATA_KV) {
    return env.DASHBOARD_DATA_KV.get(cacheKey(slug));
  }
  const cached = await caches.default.match(`https://dashboard-data-cache.local/${slug}`);
  return cached ? cached.text() : null;
}

async function writeSnapshot(env, slug, body) {
  if (env.DASHBOARD_DATA_KV) {
    await env.DASHBOARD_DATA_KV.put(cacheKey(slug), body, {
      metadata: { refreshedAt: new Date().toISOString() }
    });
    return;
  }
  await caches.default.put(
    `https://dashboard-data-cache.local/${slug}`,
    textResponse(body, 200, {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "public, max-age=300"
    })
  );
}

async function fetchSource(config) {
  const response = await fetch(config.sourceUrl, {
    headers: { "Accept": config.contentType }
  });
  if (!response.ok) {
    throw new Error(`Source returned HTTP ${response.status}`);
  }
  return response.text();
}

async function getDashboardData(env, slug, { refresh = false } = {}) {
  const config = DASHBOARDS[slug];
  if (!config) {
    return jsonResponse(
      { error: "Unknown dashboard", dashboards: Object.keys(DASHBOARDS) },
      404
    );
  }

  let body = refresh ? null : await readSnapshot(env, slug);
  let source = "cache";

  if (!body) {
    body = await fetchSource(config);
    source = "source";
    await writeSnapshot(env, slug, body);
  }

  return textResponse(body, 200, {
    "Content-Type": config.contentType,
    "Cache-Control": refresh ? "no-store" : "public, max-age=60",
    "X-Dashboard-Data-Source": source,
    "X-Dashboard-Slug": slug
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS
      });
    }
    if (request.method !== "GET") {
      return jsonResponse({ error: "Method not allowed" }, 405, {
        "Allow": "GET, OPTIONS"
      });
    }

    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean);
    if (!parts.length) {
      return jsonResponse({
        service: "dashboard-data",
        dashboards: Object.keys(DASHBOARDS),
        routes: [
          "/:dashboard",
          "/:dashboard/refresh"
        ]
      });
    }

    const [slug, action] = parts;
    if (parts.length > 2 || (action && action !== "refresh")) {
      return jsonResponse({ error: "Not found" }, 404);
    }

    try {
      return getDashboardData(env, slug, { refresh: action === "refresh" });
    } catch (error) {
      return jsonResponse({
        error: "Could not load dashboard data",
        detail: error.message
      }, 502);
    }
  }
};
