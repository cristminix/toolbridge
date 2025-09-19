import {
  convertOllamaRequestToOllama,
  convertOpenAIRequestToOllama,
} from "./format/ollama/requestConverter.js";
import { convertOpenAIResponseToOllama } from "./format/ollama/responseConverter.js";
import {
  convertOllamaRequestToOpenAI as convertOllamaToOpenAIRequest,
  convertOpenAIRequestToOpenAI,
} from "./format/openai/requestConverter.js";
import { convertOllamaResponseToOpenAI as convertOllamaToOpenAIResponse } from "./format/openai/responseConverter.js";
import logger from "./logger.js";

import { FORMAT_OLLAMA, FORMAT_OPENAI } from "../handlers/formatDetector.js";

export function convertRequest(sourceFormat, targetFormat, request) {
  logger.debug(
    `[CONVERT] Converting request: ${sourceFormat} -> ${targetFormat}`,
  );
  if (sourceFormat === FORMAT_OPENAI && targetFormat === FORMAT_OPENAI) {
    return convertOpenAIRequestToOpenAI(request);
  }
  if (sourceFormat === FORMAT_OPENAI && targetFormat === FORMAT_OLLAMA) {
    return convertOpenAIRequestToOllama(request);
  }
  if (sourceFormat === FORMAT_OLLAMA && targetFormat === FORMAT_OPENAI) {
    return convertOllamaToOpenAIRequest(request);
  }
  if (sourceFormat === FORMAT_OLLAMA && targetFormat === FORMAT_OLLAMA) {
    return convertOllamaRequestToOllama(request);
  }
  console.error(
    `[CONVERT] Unsupported request conversion: ${sourceFormat} -> ${targetFormat}`,
  );
  throw new Error(
    `Unsupported request conversion: ${sourceFormat} -> ${targetFormat}`,
  );
}

export function convertResponse(
  sourceFormat,
  targetFormat,
  response,
  isStreamChunk = false,
) {
  if (!isStreamChunk) {
    logger.debug(
      `[CONVERT] Converting response: ${sourceFormat} -> ${targetFormat}`,
    );
  }

  if (sourceFormat === FORMAT_OPENAI && targetFormat === FORMAT_OPENAI) {
    // Tambahkan konversi tool call bahkan ketika formatnya sama
    if (response.choices && response.choices.length > 0) {
      const choice = response.choices[0];
      if (choice.message && choice.message.content) {
        const content = choice.message.content;
        // Cek jika content berisi XML tool call yang perlu dikonversi
        if (content.includes("<") && content.includes(">")) {
          logger.debug("[CONVERT] Found XML content in OpenAI response, checking for tool call...");
          // Kita bisa menambahkan logika konversi di sini jika diperlukan
          // Untuk saat ini, kita tetap mengembalikan response asli
        }
      }
    }
    return { ...response };
  }
  if (sourceFormat === FORMAT_OPENAI && targetFormat === FORMAT_OLLAMA) {
    return convertOpenAIResponseToOllama(response);
  }
  if (sourceFormat === FORMAT_OLLAMA && targetFormat === FORMAT_OPENAI) {
    return convertOllamaToOpenAIResponse(response, isStreamChunk);
  }
  if (sourceFormat === FORMAT_OLLAMA && targetFormat === FORMAT_OLLAMA) {
    return { ...response };
  }
  console.error(
    `[CONVERT] Unsupported response conversion: ${sourceFormat} -> ${targetFormat}`,
  );
  throw new Error(
    `Unsupported response conversion: ${sourceFormat} -> ${targetFormat}`,
  );
}
