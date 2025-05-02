import { createProxyMiddleware } from "http-proxy-middleware";
import { BACKEND_LLM_BASE_URL } from "./config.js";
import { buildBackendHeaders } from "./utils/headerUtils.js";
import logger from "./utils/logger.js";

const logRequestDetails = (label, req, headers, body = null) => {
  logger.debug(`
[${label}] =====================`);
  logger.debug(`[${label}] ${req.method} ${req.originalUrl || req.path}`);
  if (req.ip) logger.debug(`[${label}] Client IP: ${req.ip}`);
  logger.debug(`[${label}] Headers:`, JSON.stringify(headers, null, 2));
  if (body && req.method !== "GET" && req.method !== "HEAD") {
    let safeBody;
    try {
      safeBody = JSON.parse(JSON.stringify(body));
      if (safeBody.api_key) safeBody.api_key = "********";
    } catch (_) {
      safeBody = "[Unable to parse or clone body]";
    }
    logger.debug(`[${label}] Body:`, JSON.stringify(safeBody, null, 2));
  }
  logger.debug(`[${label}] =====================
`);
};

const genericProxy = createProxyMiddleware({
  target: BACKEND_LLM_BASE_URL,
  changeOrigin: true,

  pathRewrite: (path, req) => {
    const backendPath = "/v1" + path;
    logger.debug(
      `
[PROXY] Rewriting path: ${req.originalUrl} -> ${backendPath}`,
    );
    return backendPath;
  },
  onProxyReq: (proxyReq, req) => {
    logRequestDetails("CLIENT REQUEST", req, req.headers, req.body);

    const clientAuthHeader = req.headers["authorization"];
    const backendHeaders = buildBackendHeaders(
      clientAuthHeader,
      req.headers,
      "proxy",
    );

    Object.keys(backendHeaders).forEach((key) => {
      proxyReq.setHeader(key, backendHeaders[key]);
    });

    const backendUrl = BACKEND_LLM_BASE_URL + proxyReq.path;
    const actualBackendHeaders = {};
    proxyReq.getHeaderNames().forEach((name) => {
      actualBackendHeaders[name] = proxyReq.getHeader(name);
    });
    logRequestDetails(
      "PROXY REQUEST",
      { ...req, path: backendUrl, originalUrl: backendUrl },
      actualBackendHeaders,
      req.body,
    );
  },
  onProxyRes: (proxyRes, req, res) => {
    const contentType = proxyRes.headers["content-type"];
    logger.debug(
      `
[PROXY RESPONSE] Status: ${proxyRes.statusCode} (${contentType || "N/A"}) for ${req.method} ${req.originalUrl}`,
    );
    logger.debug(`[PROXY RESPONSE] Headers received from backend:`);
    logger.debug(JSON.stringify(proxyRes.headers, null, 2));

    if (contentType && contentType.includes("text/event-stream")) {
      res.setHeader("Content-Type", "text/event-stream");
    } else if (req.path === "/models") {
      let responseBody = "";
      const originalWrite = res.write.bind(res);
      const originalEnd = res.end.bind(res);

      proxyRes.on("data", (chunk) => {
        responseBody += chunk;
      });

      res.write = () => {
        return true;
      };

      res.end = (chunk) => {
        if (chunk) responseBody += chunk;
        try {
          const parsedBody = JSON.parse(responseBody);
          logger.debug(`[PROXY RESPONSE] Models response body:`);
          logger.debug(JSON.stringify(parsedBody, null, 2));
        } catch (_) {
          logger.debug(
            `[PROXY RESPONSE] Raw models response body (non-JSON):`,
            responseBody,
          );
        }

        originalWrite(responseBody, "utf8");
        originalEnd(null, "utf8", () => {});
      };
    }
  },
  onError: (err, req, res) => {
    logger.error("Proxy error:", err);
    if (!res.headersSent) {
      if (err.code === "ECONNREFUSED") {
        res
          .status(503)
          .send(
            `Service Unavailable: Cannot connect to backend at ${BACKEND_LLM_BASE_URL}`,
          );
      } else {
        res.status(502).send(`Proxy Error: ${err.message}`);
      }
    } else if (!res.writableEnded) {
      res.end();
    }
  },
});

export default genericProxy;
