export function isOpenAIFormat(obj) {
  if (obj && typeof obj === "object") {
    if (Array.isArray(obj.messages) || Array.isArray(obj.choices)) {
      return true;
    }

    if (obj.object === "chat.completion.chunk" && Array.isArray(obj.choices)) {
      return true;
    }
  }
  return false;
}
