import logger from "../utils/logger.js";

export function detectPotentialToolCall(content, knownToolNames = []) {
  if (logger.debug && content) {
    const contentPreview =
      content.length > 200
        ? content.substring(0, 100) +
          "..." +
          content.substring(content.length - 100)
        : content;
    logger.debug(
      `[TOOL DETECTOR] Checking content (${content.length} chars): ${contentPreview}`,
    );

    if (content.includes("ToolCalls")) {
      logger.debug("[TOOL DETECTOR] Found 'ToolCalls' marker in content");
    }
  }

  if (!content) {
    return {
      isPotential: false,
      mightBeToolCall: false,
      isCompletedXml: false,
      rootTagName: null,
    };
  }

  const trimmed = content.trim();

  let contentToCheck = trimmed;
  let isCodeBlock = false;

  const codeBlockMatch = trimmed.match(/```(?:xml)[\s\n]?([\s\S]*?)[\s\n]?```/);

  if (codeBlockMatch && codeBlockMatch[1] && codeBlockMatch[1].includes("<")) {
    contentToCheck = codeBlockMatch[1];
    isCodeBlock = true;
  }

  const hasOpeningAngle = contentToCheck.includes("<");
  if (!hasOpeningAngle) {
    return {
      isPotential: false,
      mightBeToolCall: false,
      isCompletedXml: false,
      rootTagName: null,
    };
  }

  const xmlStartIndex = contentToCheck.indexOf("<");
  const potentialXml = contentToCheck.substring(xmlStartIndex);

  const properXmlTagRegex =
    /<[a-zA-Z0-9_.-]+(?:(?:\s+[a-zA-Z0-9_.-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^>\s]+))?)*\s*|\s*)(?:\/?>|$)/;
  const hasProperXmlTag = properXmlTagRegex.test(potentialXml);

  if (!hasProperXmlTag) {
    return {
      isPotential: false,
      mightBeToolCall: false,
      isCompletedXml: false,
      rootTagName: null,
    };
  }

  let rootTagName = null;

  const rootTagMatch = potentialXml.match(
    /<(?:[a-zA-Z0-9_.-]+:)?([a-zA-Z0-9_.-]+(?:_[a-zA-Z0-9_.-]+)*)(?:[\s/>])/,
  );

  if (rootTagMatch && rootTagMatch[1]) {
    rootTagName = rootTagMatch[1];

    const commonHtmlTags = [
      "div",
      "span",
      "p",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "ul",
      "ol",
      "li",
      "table",
      "tr",
      "td",
      "th",
      "a",
      "img",
      "style",
      "script",
      "link",
      "meta",
      "title",
      "head",
      "body",
      "html",
      "form",
      "input",
      "button",
      "textarea",
      "select",
      "option",
    ];

    if (commonHtmlTags.includes(rootTagName.toLowerCase())) {
      logger.debug(
        `[TOOL DETECTOR] Detected common HTML tag "${rootTagName}" - immediately rejecting as tool call`,
      );
      return {
        isPotential: false,
        mightBeToolCall: false,
        isCompletedXml: false,
        rootTagName: rootTagName,
      };
    }

    if (!knownToolNames.includes(rootTagName)) {
      logger.debug(
        `[TOOL DETECTOR] XML tag "${rootTagName}" is not a recognized tool name - ignoring as potential tool call`,
      );
    }
  } else {
    return {
      isPotential: false,
      mightBeToolCall: false,
      isCompletedXml: false,
      rootTagName: null,
    };
  }

  const exactMatchKnownTool = knownToolNames.includes(rootTagName);

  const matchesKnownTool = exactMatchKnownTool;

  if (isCodeBlock) {
    logger.debug(
      `[TOOL DETECTOR] Content in code block - requiring exact match: ${matchesKnownTool}`,
    );
  } else {
    logger.debug(
      `[TOOL DETECTOR] Requiring exact tool name match: ${matchesKnownTool ? "matched" : "no match"}`,
    );
  }

  if (!matchesKnownTool) {
    return {
      isPotential: false,
      mightBeToolCall: false,
      isCompletedXml: false,
      rootTagName: rootTagName,
    };
  }

  let hasMatchingClosingTag = false;
  if (exactMatchKnownTool) {
    hasMatchingClosingTag = trimmed.includes(`</${rootTagName}>`);
  } else {
    hasMatchingClosingTag = knownToolNames.some((tool) =>
      trimmed.includes(`</${tool}>`),
    );
  }

  const isSelfClosing = potentialXml.includes("/>") && !hasMatchingClosingTag;

  const isPotential = hasProperXmlTag && matchesKnownTool;

  const isCompleteXml =
    exactMatchKnownTool && (hasMatchingClosingTag || isSelfClosing);

  if (isPotential) {
    logger.debug(
      `[TOOL DETECTOR] Content sample: "${trimmed.substring(0, 50)}..." (${
        trimmed.length
      } chars)`,
    );
    logger.debug(
      `[TOOL DETECTOR] Root tag: "${
        rootTagName || "unknown"
      }", Matches known tool: ${matchesKnownTool}, In code block: ${isCodeBlock}`,
    );
    if (rootTagName) {
      logger.debug(
        `[TOOL DETECTOR] Has closing tag: ${hasMatchingClosingTag}, Self-closing: ${isSelfClosing}`,
      );
    }
    logger.debug(
      `[TOOL DETECTOR] Is potential: ${isPotential}, Is complete: ${isCompleteXml}`,
    );
  } else if (hasOpeningAngle && rootTagName) {
    if (matchesKnownTool && !exactMatchKnownTool) {
      logger.debug(
        `[TOOL DETECTOR] Tag "${rootTagName}" could be part of known tool - buffering for complete tag`,
      );
    } else {
      logger.debug(
        `[TOOL DETECTOR] Tag "${rootTagName}" doesn't match any known tool - treating as regular content`,
      );
    }
  }

  return {
    isPotential: isPotential,
    mightBeToolCall: matchesKnownTool && isPotential,
    isCompletedXml: isCompleteXml,
    rootTagName: rootTagName,
  };
}
