import { isOllamaFormat } from "../utils/format/ollama/detector.js";
import { isOpenAIFormat } from "../utils/format/openai/detector.js";
import logger from "../utils/logger.js";

export const FORMAT_OPENAI = "openai";
export const FORMAT_OLLAMA = "ollama";
export const FORMAT_UNKNOWN = "unknown";

export function detectRequestFormat(req) {
  const explicitFormat = req.headers["x-api-format"]?.toLowerCase();
  if (explicitFormat === FORMAT_OLLAMA) {
    logger.debug(
      `[FORMAT] Detected client format via header: ${FORMAT_OLLAMA}`,
    );
    return FORMAT_OLLAMA;
  }
  if (explicitFormat === FORMAT_OPENAI) {
    logger.debug(
      `[FORMAT] Detected client format via header: ${FORMAT_OPENAI}`,
    );
    return FORMAT_OPENAI;
  }

  const body = req.body;
  if (!body || typeof body !== "object") {
    logger.debug(
      "[FORMAT] Request body is missing or not an object. Cannot infer format.",
    );
    return FORMAT_UNKNOWN;
  }

  if (isOllamaFormat(body)) {
    logger.debug(`[FORMAT] Inferred client format from body: ${FORMAT_OLLAMA}`);
    return FORMAT_OLLAMA;
  }
  if (isOpenAIFormat(body)) {
    logger.debug(`[FORMAT] Inferred client format from body: ${FORMAT_OPENAI}`);
    return FORMAT_OPENAI;
  }

  logger.debug(
    "[FORMAT] Could not confidently detect request format from header or body. Defaulting to OpenAI format.",
  );
  return FORMAT_OPENAI;
}

export function detectResponseFormat(response) {
  if (!response) return FORMAT_UNKNOWN;

  let parsedResponse = response;

  if (typeof response === "string") {
    try {
      const jsonString = response.startsWith("data: ")
        ? response.slice(6)
        : response;

      if (jsonString.trim() === "[DONE]") return FORMAT_OPENAI;
      parsedResponse = JSON.parse(jsonString);
    } catch (_) {
      return FORMAT_UNKNOWN;
    }
  }

  if (typeof parsedResponse !== "object" || parsedResponse === null) {
    return FORMAT_UNKNOWN;
  }

  if (isOllamaFormat(parsedResponse)) {
    return FORMAT_OLLAMA;
  }
  if (isOpenAIFormat(parsedResponse)) {
    return FORMAT_OPENAI;
  }

  return FORMAT_UNKNOWN;
}
