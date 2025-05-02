import {
  BACKEND_LLM_API_KEY,
  HTTP_REFERER,
  PLACEHOLDER_API_KEY,
  PLACEHOLDER_REFERER,
  PLACEHOLDER_TITLE,
  X_TITLE,
} from "../config.js";

import { FORMAT_OLLAMA, FORMAT_OPENAI } from "../handlers/formatDetector.js";
import logger from "./logger.js";

export function buildBackendHeaders(
  clientAuthHeader = null,
  // eslint-disable-next-line no-unused-vars
  clientHeaders = null,
  // eslint-disable-next-line no-unused-vars
  context = "unknown",
  clientFormat = FORMAT_OPENAI,
) {
  const headers = {
    "Content-Type": "application/json",
  };

  const useOllamaAuth = clientFormat === FORMAT_OLLAMA;

  if (BACKEND_LLM_API_KEY && BACKEND_LLM_API_KEY !== PLACEHOLDER_API_KEY) {
    headers["Authorization"] = `Bearer ${BACKEND_LLM_API_KEY}`;
    logger.debug(
      `[AUTH] Using configured ${useOllamaAuth ? "OLLAMA_API_KEY" : "BACKEND_LLM_API_KEY"} for ${clientFormat} format client`,
    );
  } else if (useOllamaAuth) {
    logger.debug(
      `[AUTH] No API key configured. Assuming Ollama backend doesn't require auth.`,
    );
  } else if (clientAuthHeader) {
    headers["Authorization"] = clientAuthHeader;
    logger.debug(
      `[AUTH] Using client-provided Authorization header for OpenAI format client (no server key configured).`,
    );
  } else {
    logger.warn(
      `[AUTH] Warning: No client Authorization header and no BACKEND_LLM_API_KEY configured. Request will likely fail.`,
    );
  }

  if (HTTP_REFERER && HTTP_REFERER !== PLACEHOLDER_REFERER) {
    headers["HTTP-Referer"] = HTTP_REFERER;
    headers["Referer"] = HTTP_REFERER;
  }
  if (X_TITLE && X_TITLE !== PLACEHOLDER_TITLE) {
    headers["X-Title"] = X_TITLE;
  }

  return headers;
}
