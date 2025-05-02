import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function captureParsingChallenge(content, parserResult, error) {
  if (
    error ||
    (hasXmlIndicators(content) && !isSuccessfulParse(parserResult))
  ) {
    try {
      const challengesDir = path.join(__dirname, "..", "test", "challenges");

      if (!fs.existsSync(challengesDir)) {
        fs.mkdirSync(challengesDir, { recursive: true });
      }

      const timestamp = Date.now();
      const randomSuffix = Math.floor(Math.random() * 10000);
      const filename = `challenge-${timestamp}-${randomSuffix}.json`;

      fs.writeFileSync(
        path.join(challengesDir, filename),
        JSON.stringify(
          {
            content,
            parserResult: sanitizeForJson(parserResult),
            error: error
              ? {
                  message: error.message,
                  stack: error.stack,
                  name: error.name,
                }
              : null,
            timestamp,
            metadata: {
              contentLength: content?.length,
              hasXmlTags: content?.includes("<") && content?.includes(">"),
              hasClosingTags: hasMatchingTags(content),
            },
          },
          null,
          2,
        ),
      );

      console.log(
        `[ParsingChallenger] Captured parsing challenge: ${filename}`,
      );
    } catch (captureError) {
      console.error(
        "[ParsingChallenger] Failed to capture parsing challenge:",
        captureError,
      );
    }
  }
}

function hasXmlIndicators(content) {
  if (!content || typeof content !== "string") return false;

  return (
    content.includes("<") &&
    content.includes(">") &&
    /<\w+>.*<\/\w+>/s.test(content)
  );
}

function isSuccessfulParse(result) {
  return (
    result &&
    result.name &&
    typeof result.name === "string" &&
    result.parameters &&
    Object.keys(result.parameters).length > 0
  );
}

function hasMatchingTags(content) {
  if (!content || typeof content !== "string") return false;

  const tagPattern = /<(\/?[a-zA-Z0-9_]+)[^>]*>/g;
  const tags = [];
  let match;

  while ((match = tagPattern.exec(content)) !== null) {
    const tag = match[1];
    if (tag.startsWith("/")) {
      const openTag = tag.substring(1);
      if (tags.length === 0 || tags.pop() !== openTag) {
        return false;
      }
    } else {
      tags.push(tag);
    }
  }

  return tags.length === 0;
}

function sanitizeForJson(obj) {
  if (obj === undefined || obj === null) return null;
  if (typeof obj !== "object") return obj;

  try {
    JSON.stringify(obj);
    return obj;
  } catch (_jsonError) {
    const simplified = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "function") {
        simplified[key] = "[Function]";
      } else if (typeof value === "object" && value !== null) {
        simplified[key] = sanitizeForJson(value);
      } else if (value !== undefined) {
        simplified[key] = value;
      }
    }
    return simplified;
  }
}
