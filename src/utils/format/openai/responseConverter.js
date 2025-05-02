import { convertOllamaResponseToOpenAI } from "../ollama/responseConverter.js";

export function convertOpenAIResponseToOpenAI(openAIResponse) {
  return { ...openAIResponse };
}

export { convertOllamaResponseToOpenAI };
