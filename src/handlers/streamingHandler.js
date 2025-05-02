import logger from "../utils/logger.js";
import { FORMAT_OLLAMA, FORMAT_OPENAI } from "./formatDetector.js";
import { FormatConvertingStreamProcessor } from "./stream/formatConvertingStreamProcessor.js";
import { OllamaStreamProcessor } from "./stream/ollamaStreamProcessor.js";
import { OpenAIStreamProcessor } from "./stream/openaiStreamProcessor.js";

export function setupStreamHandler(
  backendStream,
  res,
  clientRequestFormat = FORMAT_OPENAI,
  backendFormat = FORMAT_OPENAI,
  tools = [],
) {
  logger.debug(
    `[STREAM] Setting up handler: client=${clientRequestFormat}, backend=${backendFormat}`,
  );

  let processor;

  if (
    clientRequestFormat === FORMAT_OPENAI &&
    backendFormat === FORMAT_OPENAI
  ) {
    logger.debug("[STREAM] Using OpenAI-to-OpenAI XML intercept processor.");
    processor = new OpenAIStreamProcessor(res);
    processor.setTools(tools);
  } else if (
    clientRequestFormat === FORMAT_OLLAMA &&
    backendFormat === FORMAT_OLLAMA
  ) {
    logger.debug("[STREAM] Using Ollama-to-Ollama pass-through processor.");

    processor = new OllamaStreamProcessor(res);
  } else {
    logger.debug(
      `[STREAM] Using format converting processor (${backendFormat} -> ${clientRequestFormat}).`,
    );
    processor = new FormatConvertingStreamProcessor(
      res,
      backendFormat,
      clientRequestFormat,
    );
    processor.setTools(tools);
  }

  processor.pipeFrom(backendStream);
}

[
  OpenAIStreamProcessor,
  OllamaStreamProcessor,
  FormatConvertingStreamProcessor,
].forEach((Processor) => {
  if (!Processor.prototype.pipeFrom) {
    Processor.prototype.pipeFrom = function (sourceStream) {
      sourceStream.on("data", (chunk) => {
        try {
          this.processChunk(chunk);
        } catch (e) {
          logger.error(
            `[STREAM] Error processing chunk in ${this.constructor.name}:`,
            e,
          );
          this.closeStreamWithError(
            `Error processing stream chunk: ${e.message}`,
          );
          sourceStream.destroy();
        }
      });
      sourceStream.on("end", () => {
        try {
          this.end();
        } catch (e) {
          logger.error(
            `[STREAM] Error finalizing stream in ${this.constructor.name}:`,
            e,
          );
          this.closeStreamWithError(`Error finalizing stream: ${e.message}`);
        }
      });
      sourceStream.on("error", (err) => {
        logger.error("[STREAM] Backend stream error:", err);
        this.closeStreamWithError(`Stream error from backend: ${err.message}`);
      });
    };
  }
});
