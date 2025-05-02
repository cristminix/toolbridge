import axios from "axios";
import { BACKEND_LLM_BASE_URL, CHAT_COMPLETIONS_FULL_URL } from "../config.js";
import { buildBackendHeaders } from "../utils/headerUtils.js";
import logger from "../utils/logger.js";
import { streamToString } from "../utils/streamUtils.js";

import { FORMAT_OLLAMA, FORMAT_OPENAI } from "../handlers/formatDetector.js";

export async function callBackendLLM(
  payload,
  streamRequested,
  clientAuthHeader = null,
  clientHeaders = null,
  clientFormat = FORMAT_OPENAI,
) {
  const headers = buildBackendHeaders(
    clientAuthHeader,
    clientHeaders,
    "chat",
    clientFormat,
  );

  let apiUrl;
  let endpointPath = "";

  if (clientFormat === FORMAT_OLLAMA) {
    const baseUrl = BACKEND_LLM_BASE_URL.endsWith("/")
      ? BACKEND_LLM_BASE_URL.slice(0, -1)
      : BACKEND_LLM_BASE_URL;
    apiUrl = baseUrl;
    endpointPath = "/api/chat";
    payload.stream = streamRequested;
  } else {
    apiUrl = CHAT_COMPLETIONS_FULL_URL;
    payload.stream = streamRequested;
  }

  if (!apiUrl) {
    throw new Error(
      `Backend URL is not properly configured for ${clientFormat} format client. ` +
        `Check your .env file - make sure the appropriate URL is set based on your BACKEND_MODE.`,
    );
  }

  const fullUrl =
    clientFormat === FORMAT_OLLAMA ? `${apiUrl}${endpointPath}` : apiUrl;

  logRequest(payload, headers, clientFormat, fullUrl, streamRequested);

  try {
    const response = await axios.post(fullUrl, payload, {
      headers,
      responseType: streamRequested ? "stream" : "json",
    });

    logger.debug(
      `[BACKEND RESPONSE] Status: ${response.status} (${response.headers["content-type"] || "N/A"})`,
    );

    return response.data;
  } catch (error) {
    throw await handleRequestError(error, clientFormat, fullUrl);
  }
}

function logRequest(payload, headers, format, url, streamRequested) {
  logger.debug(
    `\n[BACKEND REQUEST] Sending request to ${format.toUpperCase()} backend (${url})`,
  );
  logger.debug(`[BACKEND REQUEST] Method: POST, Stream: ${streamRequested}`);

  const loggedHeaders = { ...headers };
  if (loggedHeaders["Authorization"]) {
    loggedHeaders["Authorization"] = "Bearer ********";
  }
  if (loggedHeaders["HTTP-Referer"]) {
    loggedHeaders["Referer"] = loggedHeaders["HTTP-Referer"];
    delete loggedHeaders["HTTP-Referer"];
  }
  logger.debug(
    `[BACKEND REQUEST] Headers:`,
    JSON.stringify(loggedHeaders, null, 2),
  );

  logger.debug(`[BACKEND REQUEST] Payload:`, JSON.stringify(payload, null, 2));
}

async function handleRequestError(
  error,
  clientFormat = "unknown",
  url = "unknown",
) {
  let errorMessage = `Backend ${clientFormat.toUpperCase()} request to ${url} failed.`;
  let errorStatus = 500;

  if (error.response) {
    errorStatus = error.response.status;
    const contentType = error.response.headers["content-type"];
    let errorBody = "[Could not read error body]";

    if (contentType?.includes("stream") && error.response.data?.readable) {
      try {
        errorBody = await streamToString(error.response.data);
        errorMessage += ` Status ${errorStatus}. Stream Error Body: ${errorBody}`;
      } catch (streamError) {
        errorMessage += ` Status ${errorStatus}. Failed to read error stream: ${streamError.message}`;
      }
    } else if (contentType?.includes("json")) {
      try {
        errorBody = JSON.stringify(error.response.data);
        errorMessage += ` Status ${errorStatus}. Error Body: ${errorBody}`;
      } catch (_) {
        errorMessage += ` Status ${errorStatus}. Error Body (non-JSON): ${error.response.data}`;
      }
    } else {
      errorBody =
        typeof error.response.data === "string"
          ? error.response.data
          : "[Unknown error body format]";
      errorMessage += ` Status ${errorStatus}. Error Body: ${errorBody}`;
    }
    logger.error(`[BACKEND ERROR] Response Status: ${errorStatus}`);
    logger.error(
      `[BACKEND ERROR] Response Headers:`,
      JSON.stringify(error.response.headers, null, 2),
    );
    logger.error(`[BACKEND ERROR] Response Body:`, errorBody);
  } else if (error.request) {
    errorMessage += ` No response received from server. This could indicate a network issue, timeout, or incorrect URL/port.`;
    errorStatus = 504;
    logger.error(
      `[BACKEND ERROR] No response received for request to ${url}. Error Code: ${error.code || "N/A"}`,
    );
  } else {
    errorMessage += ` Request setup failed: ${error.message}`;
    logger.error(
      `[BACKEND ERROR] Request setup failed for ${url}: ${error.message}`,
    );
  }

  logger.error(`[ERROR] ${errorMessage}`);

  const err = new Error(errorMessage);
  err.status = errorStatus;

  throw err;
}
