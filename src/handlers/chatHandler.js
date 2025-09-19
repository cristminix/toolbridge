import { convertRequest } from "../utils/formatConverters.js";
import logger from "../utils/logger.js";
import { callBackendLLM } from "./backendLLM.js";
import {
  FORMAT_OLLAMA,
  FORMAT_OPENAI,
  detectRequestFormat,
} from "./formatDetector.js";
import { handleNonStreamingResponse } from "./nonStreamingHandler.js";
import { buildBackendPayload } from "./payloadHandler.js";
import { setupStreamHandler } from "./streamingHandler.js";

const chatCompletionsHandler = async (req, res) => {
  logger.debug("\n--- New Chat Completions Request ---");
  logger.debug(
    "[CLIENT REQUEST] Headers:",
    JSON.stringify(req.headers, null, 2),
  );
  logger.debug("[CLIENT REQUEST] Body:", JSON.stringify(req.body, null, 2));

  const clientRequestFormat = detectRequestFormat(req);
  logger.debug(
    `[FORMAT] Detected client request format: ${clientRequestFormat}`,
  );

  const backendTargetFormat = req.headers["x-backend-format"] || FORMAT_OPENAI;
  logger.debug(`[FORMAT] Target backend format: ${backendTargetFormat}`);

  if (clientRequestFormat === FORMAT_OPENAI && !req.body.messages) {
    return res
      .status(400)
      .json({ error: 'Missing "messages" in OpenAI request body' });
  } else if (
    clientRequestFormat === FORMAT_OLLAMA &&
    !req.body.prompt &&
    !req.body.messages
  ) {
    return res
      .status(400)
      .json({ error: 'Missing "prompt" or "messages" in Ollama request body' });
  }

  try {
    let backendPayload = req.body;
    if (clientRequestFormat !== backendTargetFormat) {
      logger.debug(
        `[FORMAT] Converting request: ${clientRequestFormat} -> ${backendTargetFormat}`,
      );
      backendPayload = convertRequest(
        clientRequestFormat,
        backendTargetFormat,
        req.body,
      );
      logger.debug(
        "[CONVERTED REQUEST] Payload for backend:",
        JSON.stringify(backendPayload, null, 2),
      );
    } else {
      logger.debug(
        `[FORMAT] Request format matches backend format (${clientRequestFormat}). No conversion needed.`,
      );
    }

    if (backendTargetFormat === FORMAT_OPENAI) {
      const { tools } = req.body;
      backendPayload = buildBackendPayload({ ...backendPayload, tools });
    }

    const clientRequestedStream = req.body.stream === true;
    const clientAuthHeader = req.headers["authorization"];
    const clientHeaders = req.headers;

    const backendResponseOrStream = await callBackendLLM(
      backendPayload,
      clientRequestedStream,
      clientAuthHeader,
      clientHeaders,
      backendTargetFormat,
    );

    if (!clientRequestedStream) {
      logger.debug("[RESPONSE] Received non-streaming response from backend.");

      const finalResponse = handleNonStreamingResponse(
        backendResponseOrStream,
        clientRequestFormat,
        backendTargetFormat,
        req.body.tools,
      );

      logger.debug(
        "[FINAL RESPONSE] Sending to client:",
        JSON.stringify(finalResponse, null, 2),
      );
      res.json(finalResponse);
    } else {
      logger.debug(
        "[RESPONSE] Received stream from backend. Setting up stream handler.",
      );

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      setupStreamHandler(
        backendResponseOrStream,
        res,
        clientRequestFormat,
        backendTargetFormat,
        req.body.tools,
      );
    }
  } catch (error) {
    logger.error("\n--- Error processing chat completion request ---");
    logger.error("Error Message:", error.message);
    if (error.stack) {
      logger.error("Stack Trace:", error.stack);
    }
    if (error.response) {
      logger.error("Backend Response Status:", error.response.status);
      logger.error("Backend Response Data:", error.response.data);
    } else if (error.request) {
      logger.error("Backend Request Data:", error.request);
    }

    if (!res.headersSent) {
      const statusCode = error.status || 500;
      res.status(statusCode).json({
        error: `Failed to process chat completion. Status: ${statusCode}. Message: ${error.message}`,
      });
    } else if (!res.writableEnded) {
      logger.error("[ERROR] Headers already sent, attempting to end stream.");
      res.end();
    } else {
      logger.error(
        "[ERROR] Headers sent and stream ended. Cannot send error response.",
      );
    }
  }
};

export default chatCompletionsHandler;
