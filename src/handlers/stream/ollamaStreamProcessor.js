import logger from "../../utils/logger.js";
import { extractToolCallXMLParser } from "../../utils/xmlUtils.js";

export class OllamaStreamProcessor {
  constructor(res) {
    this.res = res;
    this.streamClosed = false;
    this.knownToolNames = [];
    logger.debug(
      "[STREAM PROCESSOR] Initialized OllamaStreamProcessor (Pass-through)",
    );

    this.res.setHeader("Content-Type", "application/x-ndjson");
    this.res.setHeader("Cache-Control", "no-cache");
    this.res.setHeader("Connection", "keep-alive");
  }

  setTools(tools) {
    this.knownToolNames =
      tools?.map((t) => t.function?.name).filter(Boolean) || [];
    logger.debug(
      "[STREAM PROCESSOR] Known tool names set:",
      this.knownToolNames,
    );
  }

  processChunk(chunk) {
    if (this.streamClosed) return;

    let chunkStr = chunk.toString();

    try {
      const chunkJson = JSON.parse(chunkStr);

      if (
        chunkJson.response &&
        chunkJson.response.includes("<") &&
        chunkJson.response.includes(">")
      ) {
        const toolCall = extractToolCallXMLParser(
          chunkJson.response,
          this.knownToolNames,
        );
        if (toolCall) {
          logger.debug(
            "[STREAM PROCESSOR] Found XML tool call in Ollama response:",
            toolCall.name,
          );

          const ollamaToolCall = {
            ...chunkJson,
            tool_calls: [
              {
                function: {
                  name: toolCall.name,
                  arguments: toolCall.arguments || {},
                },
              },
            ],
            response: "",
          };

          chunkStr = JSON.stringify(ollamaToolCall);
        }
      }
    } catch (error) {
      console.debug("Error parsing Ollama response:", error);
    }

    this.res.write(chunkStr);

    if (!chunkStr.endsWith("\n")) {
      this.res.write("\n");
    }
  }

  end() {
    if (this.streamClosed) return;
    logger.debug("[STREAM PROCESSOR] Ollama backend stream ended.");
    if (!this.res.writableEnded) {
      this.res.end();
    }
    this.streamClosed = true;
  }

  handleError(error) {
    if (this.streamClosed) return;
    logger.error(
      "[STREAM PROCESSOR] Error in Ollama backend stream:",
      error.message,
    );
    if (!this.res.headersSent) {
      try {
        this.res.status(500).json({
          error: {
            message: `Stream processing error: ${error.message}`,
            code: "STREAM_ERROR",
          },
        });
      } catch (jsonError) {
        logger.error(
          "[STREAM PROCESSOR] Failed to send JSON error response:",
          jsonError.message,
        );

        this.res.status(500).send(`Stream Error: ${error.message}`);
      }
    } else if (!this.res.writableEnded) {
      logger.debug(
        "[STREAM PROCESSOR] Ending client stream due to backend error (headers already sent).",
      );
      this.res.end();
    }
    this.streamClosed = true;
  }
}
