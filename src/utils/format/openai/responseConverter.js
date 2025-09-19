import { convertOllamaResponseToOpenAI } from "../ollama/responseConverter.js";

export function convertOpenAIResponseToOpenAI(openAIResponse) {
  console.log("convertOpenAIResponseToOpenAI")
  return { ...openAIResponse };
}

export { convertOllamaResponseToOpenAI };
