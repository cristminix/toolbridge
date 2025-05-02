import {
  createToolReminderMessage,
  formatToolsForBackendPromptXML,
  needsToolReinjection,
} from "../utils/promptUtils.js";

import {
  ENABLE_TOOL_REINJECTION,
  TOOL_REINJECTION_MESSAGE_COUNT,
  TOOL_REINJECTION_TOKEN_COUNT,
  TOOL_REINJECTION_TYPE,
} from "../config.js";

import logger from "../utils/logger.js";

export function buildBackendPayload({
  model,
  messages,
  tools,
  temperature,
  top_p,
  max_tokens,
  ...rest
}) {
  const payload = {
    model,
    messages: [...messages],
    ...(temperature !== undefined && { temperature }),
    ...(top_p !== undefined && { top_p }),
    ...(max_tokens !== undefined && { max_tokens }),
    ...rest,
  };

  if (tools && tools.length > 0) {
    injectToolInstructions(payload, tools);
  }

  return payload;
}

function injectToolInstructions(payload, tools) {
  const toolInstructions = formatToolsForBackendPromptXML(tools);

  const exclusiveToolsNotice = `\nIMPORTANT: The tools listed above are the ONLY tools available to you. Do not attempt to use any other tools.`;

  const fullInstructions = `${toolInstructions}${exclusiveToolsNotice}`;

  const systemMessageIndex = payload.messages.findIndex(
    (m) => m.role === "system",
  );

  if (systemMessageIndex !== -1) {
    if (
      ENABLE_TOOL_REINJECTION &&
      needsToolReinjection(
        payload.messages,
        TOOL_REINJECTION_TOKEN_COUNT,
        TOOL_REINJECTION_MESSAGE_COUNT,
      )
    ) {
      logger.debug(
        "Tool reinjection enabled and needed based on message/token thresholds.",
      );

      const instructionsToInject =
        TOOL_REINJECTION_TYPE === "full"
          ? fullInstructions
          : createToolReminderMessage(tools);

      const reinjectionIndex = systemMessageIndex + 1;

      payload.messages.splice(reinjectionIndex, 0, {
        role: "system",
        content: instructionsToInject,
      });

      logger.debug("Reinjected tool instructions as a new system message.");
    } else {
      payload.messages[systemMessageIndex].content += `\n\n${fullInstructions}`;
      logger.debug(
        "Appended XML tool instructions to existing system message.",
      );
    }
  } else {
    payload.messages.unshift({
      role: "system",
      content: `${fullInstructions}\n\nYou are a helpful AI assistant. Respond directly to the user's requests. When a specific tool is needed, use XML format as instructed above.`,
    });
    logger.debug("Added system message with XML tool instructions.");
  }

  payload.messages.push({
    role: "system",
    content:
      "IMPORTANT: When using tools, output raw XML only - no code blocks, no backticks, no explanations.",
  });
}
