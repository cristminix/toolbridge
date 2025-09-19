import { convertResponse } from "../utils/formatConverters.js";
import logger from "../utils/logger.js";
import { FORMAT_OLLAMA, FORMAT_OPENAI } from "./formatDetector.js";
import { extractToolCallXMLParser } from "../utils/xmlUtils.js";

export function handleNonStreamingResponse(
  backendResponse,
  clientFormat = FORMAT_OPENAI,
  backendFormat = FORMAT_OPENAI,
  tools = [],
) {
  logger.debug(
    `[NON-STREAMING] Handling response. Backend format: ${backendFormat}, Client format: ${clientFormat}`,
  );

  // Tambahkan konversi tool call untuk non-streaming response
  if (backendResponse.choices && backendResponse.choices.length > 0) {
    const choice = backendResponse.choices[0];
    if (choice.message && choice.message.content) {
      const content = choice.message.content;

      // Cek jika content berisi XML tool call yang perlu dikonversi
      if (content.includes("<") && content.includes(">")) {
        logger.debug("[NON-STREAMING] Found XML content in response, checking for tool call...");

        // Ekstrak nama tool dari tools yang dikirim
        const toolNames = tools.map(t => t.function?.name).filter(Boolean);

        // Coba ekstrak tool call dari XML
        const toolCall = extractToolCallXMLParser(content, toolNames);
        if (toolCall) {
          logger.debug(
            "[NON-STREAMING] Extracted XML tool call:",
            toolCall,
          );

          // Konversi ke format tool_call yang benar
          const convertedResponse = {
            ...backendResponse,
            choices: [
              {
                ...choice,
                message: {
                  ...choice.message,
                  content: null,
                  tool_calls: [
                    {
                      id: `call_${Date.now()}`,
                      type: "function",
                      function: {
                        name: toolCall.name,
                        arguments: JSON.stringify(toolCall.arguments || {}),
                      },
                    },
                  ],
                },
                finish_reason: "tool_calls",
              },
            ],
          };

          logger.debug("[NON-STREAMING] Converted response to tool_call format");
          return convertedResponse;
        } else {
          logger.debug("[NON-STREAMING] XML content found but no valid tool call extracted");
        }
      }
    }
  }

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
