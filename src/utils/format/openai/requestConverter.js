import { convertOllamaRequestToOpenAI } from "../ollama/requestConverter.js";

export function convertOpenAIRequestToOpenAI(openAIRequest) {
  return { ...openAIRequest };
}

export { convertOllamaRequestToOpenAI };
