import { convertOllamaRequestToOpenAI } from "../ollama/requestConverter.js";

export function convertOpenAIRequestToOpenAI(openAIRequest) {
  console.log("convertOpenAIRequestToOpenAI")
  return { ...openAIRequest };
}

export { convertOllamaRequestToOpenAI };
