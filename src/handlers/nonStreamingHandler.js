import { convertResponse } from "../utils/formatConverters.js";
import logger from "../utils/logger.js";
import { FORMAT_OLLAMA, FORMAT_OPENAI } from "./formatDetector.js";

export function handleNonStreamingResponse(
  backendResponse,
  clientFormat = FORMAT_OPENAI,
  backendFormat = FORMAT_OPENAI,
) {
  logger.debug(
    `[NON-STREAMING] Handling response. Backend format: ${backendFormat}, Client format: ${clientFormat}`,
  );

  if (clientFormat === backendFormat) {
    logger.debug(
      "[NON-STREAMING] Formats match. Returning backend response directly.",
    );
    return backendResponse;
  } else {
    logger.debug(
      `[NON-STREAMING] Converting response: ${backendFormat} -> ${clientFormat}`,
    );
    try {
      const converted = convertResponse(
        backendFormat,
        clientFormat,
        backendResponse,
      );
      logger.debug("[NON-STREAMING] Conversion successful.");
      return converted;
    } catch (error) {
      logger.error(
        `[NON-STREAMING] Error converting response from ${backendFormat} to ${clientFormat}:`,
        error,
      );

      const errorPayload = {
        error: `Failed to convert backend response from ${backendFormat} to ${clientFormat}. Details: ${error.message}`,
      };

      if (clientFormat === FORMAT_OPENAI) {
        return {
          object: "error",
          message: errorPayload.error,
          type: "proxy_conversion_error",
          code: null,
          param: null,
        };
      } else if (clientFormat === FORMAT_OLLAMA) {
        return {
          error: errorPayload.error,
          done: true,
        };
      }

      return errorPayload;
    }
  }
}
