import "dotenv/config";
import { createLogger } from "./utils/configLogger.js";

const PLACEHOLDER_BASE_URL = "YOUR_BACKEND_LLM_BASE_URL_HERE";
const PLACEHOLDER_API_KEY = "YOUR_BACKEND_LLM_API_KEY_HERE";
const PLACEHOLDER_REFERER = "YOUR_APP_URL_HERE";
const PLACEHOLDER_TITLE = "YOUR_APP_NAME_HERE";

const PLACEHOLDER_OLLAMA_URL = "YOUR_OLLAMA_BASE_URL_HERE";

const BACKEND_MODE = (process.env.BACKEND_MODE || "openai").toLowerCase();
const IS_OLLAMA_MODE = BACKEND_MODE === "ollama";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL;
const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY;
const BACKEND_LLM_BASE_URL = IS_OLLAMA_MODE
  ? OLLAMA_BASE_URL
  : process.env.BACKEND_LLM_BASE_URL;
const BACKEND_LLM_CHAT_PATH = process.env.BACKEND_LLM_CHAT_PATH;
const BACKEND_LLM_API_KEY = IS_OLLAMA_MODE
  ? OLLAMA_API_KEY
  : process.env.BACKEND_LLM_API_KEY;
const OLLAMA_DEFAULT_CONTEXT_LENGTH =
  parseInt(process.env.OLLAMA_DEFAULT_CONTEXT_LENGTH, 10) || 32768;
const PROXY_PORT = process.env.PROXY_PORT || 3000;
const PROXY_HOST = process.env.PROXY_HOST || "0.0.0.0";
const MAX_TOOL_ITERATIONS = 5;
const MAX_BUFFER_SIZE = process.env.MAX_BUFFER_SIZE || 1024 * 1024;
const CONNECTION_TIMEOUT = process.env.CONNECTION_TIMEOUT || 120000;
const HTTP_REFERER = process.env.HTTP_REFERER;
const X_TITLE = process.env.X_TITLE;

const DEBUG_MODE = process.env.DEBUG_MODE === "true";

const logger = createLogger(DEBUG_MODE);

const ENABLE_TOOL_REINJECTION = process.env.ENABLE_TOOL_REINJECTION === "true";
const TOOL_REINJECTION_TOKEN_COUNT =
  parseInt(process.env.TOOL_REINJECTION_TOKEN_COUNT, 10) || 3000;
const TOOL_REINJECTION_MESSAGE_COUNT =
  parseInt(process.env.TOOL_REINJECTION_MESSAGE_COUNT, 10) || 10;
const TOOL_REINJECTION_TYPE = process.env.TOOL_REINJECTION_TYPE || "full";

let CHAT_COMPLETIONS_FULL_URL = null;
if (BACKEND_LLM_BASE_URL && BACKEND_LLM_BASE_URL !== PLACEHOLDER_BASE_URL) {
  try {
    const chatPath = BACKEND_LLM_CHAT_PATH || "/v1/chat/completions";
    let cleanBase = BACKEND_LLM_BASE_URL.endsWith("/")
      ? BACKEND_LLM_BASE_URL.slice(0, -1)
      : BACKEND_LLM_BASE_URL;
    let cleanPath = chatPath.startsWith("/") ? chatPath : "/" + chatPath;
    CHAT_COMPLETIONS_FULL_URL = cleanBase + cleanPath;
    new URL(CHAT_COMPLETIONS_FULL_URL);
  } catch (e) {
    logger.error(
      `Error: Invalid URL constructed from BACKEND_LLM_BASE_URL ('${BACKEND_LLM_BASE_URL}') and chat path ('${BACKEND_LLM_CHAT_PATH || "/v1/chat/completions"}'). Please check .env file.`,
      e.message,
    );
    process.exit(1);
  }
}

let OLLAMA_API_URL = null;
if (BACKEND_LLM_BASE_URL && BACKEND_LLM_BASE_URL !== PLACEHOLDER_BASE_URL) {
  try {
    let cleanBase = BACKEND_LLM_BASE_URL.endsWith("/")
      ? BACKEND_LLM_BASE_URL.slice(0, -1)
      : BACKEND_LLM_BASE_URL;
    OLLAMA_API_URL = cleanBase;
    new URL(OLLAMA_API_URL);
    logger.debug(
      `Note: Using BACKEND_LLM_BASE_URL (${BACKEND_LLM_BASE_URL}) for Ollama API URL`,
    );
  } catch (_err) {
    logger.debug(
      `Note: Error creating Ollama API URL, will reuse CHAT_COMPLETIONS_FULL_URL base`,
    );
  }
}

function validateConfig() {
  if (!["openai", "ollama"].includes(BACKEND_MODE)) {
    logger.error(
      `Error: BACKEND_MODE must be either 'openai' or 'ollama'. Current value: '${BACKEND_MODE}'`,
    );
    process.exit(1);
  }
  logger.debug(`Backend Mode: ${BACKEND_MODE.toUpperCase()}`);

  if (IS_OLLAMA_MODE) {
    if (!OLLAMA_BASE_URL) {
      logger.error(
        "Error: OLLAMA_BASE_URL must be set in the .env file when BACKEND_MODE is 'ollama'.",
      );
      process.exit(1);
    }
    if (OLLAMA_BASE_URL === PLACEHOLDER_OLLAMA_URL) {
      logger.error(
        `Error: Please replace the placeholder value for OLLAMA_BASE_URL ('${PLACEHOLDER_OLLAMA_URL}') in the .env file.`,
      );
      process.exit(1);
    }
    if (OLLAMA_API_KEY && OLLAMA_API_KEY === PLACEHOLDER_API_KEY) {
      logger.error(
        `Error: Please replace the placeholder value for OLLAMA_API_KEY ('${PLACEHOLDER_API_KEY}') in the .env file or remove it entirely.`,
      );
      process.exit(1);
    }
  } else {
    if (!BACKEND_LLM_BASE_URL) {
      logger.error(
        "Error: BACKEND_LLM_BASE_URL must be set in the .env file when BACKEND_MODE is 'openai'.",
      );
      process.exit(1);
    }
    if (BACKEND_LLM_BASE_URL === PLACEHOLDER_BASE_URL) {
      logger.error(
        `Error: Please replace the placeholder value for BACKEND_LLM_BASE_URL ('${PLACEHOLDER_BASE_URL}') in the .env file.`,
      );
      process.exit(1);
    }
    if (BACKEND_LLM_API_KEY && BACKEND_LLM_API_KEY === PLACEHOLDER_API_KEY) {
      logger.error(
        `Error: Please replace the placeholder value for BACKEND_LLM_API_KEY ('${PLACEHOLDER_API_KEY}') in the .env file or remove it entirely.`,
      );
      process.exit(1);
    }
    if (BACKEND_LLM_BASE_URL && BACKEND_LLM_BASE_URL.includes("openrouter")) {
      if (!HTTP_REFERER || HTTP_REFERER === PLACEHOLDER_REFERER) {
        logger.warn(
          `Warning: HTTP_REFERER is not set or is using the placeholder ('${PLACEHOLDER_REFERER}') in the .env file. While optional, it's recommended for OpenRouter.`,
        );
      }
      if (!X_TITLE || X_TITLE === PLACEHOLDER_TITLE) {
        logger.warn(
          `Warning: X_TITLE is not set or is using the placeholder ('${PLACEHOLDER_TITLE}') in the .env file. While optional, it's recommended for OpenRouter.`,
        );
      }
    }
  }
  if (!CHAT_COMPLETIONS_FULL_URL) {
    logger.error(
      "Error: Could not construct CHAT_COMPLETIONS_FULL_URL. Check .env configuration.",
    );
    process.exit(1);
  }

  if (!OLLAMA_API_URL) {
    logger.debug(
      "Note: OLLAMA_API_URL could not be constructed. /api/show will generate synthetic responses for Ollama clients.",
    );
  }

  logger.debug(
    `Backend URL: ${BACKEND_LLM_BASE_URL} (used for both OpenAI and Ollama formats)`,
  );
  logger.debug(
    `Ollama Default Context Length (for synthetic /api/show): ${OLLAMA_DEFAULT_CONTEXT_LENGTH}`,
  );

  logger.log("Configuration loaded and validated successfully.");
  logger.debug(`Backend Mode: ${BACKEND_MODE.toUpperCase()}`);
  logger.debug(`Configured Host (PROXY_HOST): ${PROXY_HOST}`);
  logger.debug(`Configured Port (PROXY_PORT): ${PROXY_PORT}`);
  logger.debug(`Backend Base URL: ${BACKEND_LLM_BASE_URL}`);
  logger.debug(`Chat Completions Endpoint: ${CHAT_COMPLETIONS_FULL_URL}`);
  if (IS_OLLAMA_MODE) {
    logger.debug(`Ollama Base URL: ${OLLAMA_BASE_URL}`);
    if (OLLAMA_API_KEY) logger.debug("Ollama API Key: [CONFIGURED]");
  } else {
    if (BACKEND_LLM_API_KEY) logger.debug("OpenAI API Key: [CONFIGURED]");
    if (OLLAMA_API_URL) {
      logger.debug(`Ollama API URL: ${OLLAMA_API_URL}`);
    }
  }
  logger.debug(`Max Stream Buffer Size: ${MAX_BUFFER_SIZE} bytes`);
  logger.debug(
    `Stream Connection Timeout: ${CONNECTION_TIMEOUT / 1000} seconds`,
  );
  logger.log(`Debug Mode: ${DEBUG_MODE ? "Enabled" : "Disabled"}`);
  if (HTTP_REFERER && HTTP_REFERER !== PLACEHOLDER_REFERER)
    logger.debug(`HTTP Referer: ${HTTP_REFERER}`);
  if (X_TITLE && X_TITLE !== PLACEHOLDER_TITLE)
    logger.debug(`X-Title: ${X_TITLE}`);
}

export {
  BACKEND_LLM_API_KEY,
  BACKEND_LLM_BASE_URL,
  BACKEND_LLM_CHAT_PATH,
  BACKEND_MODE,
  CHAT_COMPLETIONS_FULL_URL,
  CONNECTION_TIMEOUT,
  DEBUG_MODE,
  ENABLE_TOOL_REINJECTION,
  HTTP_REFERER,
  IS_OLLAMA_MODE,
  MAX_BUFFER_SIZE,
  MAX_TOOL_ITERATIONS,
  OLLAMA_API_KEY,
  OLLAMA_API_URL,
  OLLAMA_BASE_URL,
  OLLAMA_DEFAULT_CONTEXT_LENGTH,
  PLACEHOLDER_API_KEY,
  PLACEHOLDER_BASE_URL,
  PLACEHOLDER_OLLAMA_URL,
  PLACEHOLDER_REFERER,
  PLACEHOLDER_TITLE,
  PROXY_HOST,
  PROXY_PORT,
  TOOL_REINJECTION_MESSAGE_COUNT,
  TOOL_REINJECTION_TOKEN_COUNT,
  TOOL_REINJECTION_TYPE,
  validateConfig,
  X_TITLE,
};
