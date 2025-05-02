export function isOllamaFormat(obj) {
  if (obj && typeof obj === "object") {
    if (
      typeof obj.prompt === "string" ||
      typeof obj.response === "string" ||
      typeof obj.done === "boolean"
    ) {
      return true;
    }

    if (
      obj.model &&
      obj.created_at &&
      (obj.response !== undefined || obj.done !== undefined)
    ) {
      return true;
    }
  }
  return false;
}
