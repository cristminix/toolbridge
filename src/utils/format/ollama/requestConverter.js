import logger from "../../logger.js";
import { formatToolsForBackendPromptXML } from "../../promptUtils.js";

export function convertOllamaRequestToOllama(ollamaRequest) {
  const updatedRequest = { ...ollamaRequest };

  if (
    !updatedRequest.template ||
    !updatedRequest.template.includes("ToolCalls")
  ) {
    updatedRequest.template =
      updatedRequest.template || "{{system}}\n{{user}}\n{{assistant}}";
    updatedRequest.template += " ToolCalls";
    logger.debug(
      "[CONVERT] Added ToolCalls to Ollama template for tool support signaling",
    );
  }

  return updatedRequest;
}

export function convertOpenAIRequestToOllama(openAIRequest) {
  const ollamaRequest = {
    model: openAIRequest.model,
    stream: openAIRequest.stream === true,
    options: {},
    template: "{{system}}\n{{user}}\n{{assistant}} ToolCalls",
  };

  if (openAIRequest.temperature !== undefined) {
    ollamaRequest.options.temperature = openAIRequest.temperature;
  }
  if (openAIRequest.top_p !== undefined) {
    ollamaRequest.options.top_p = openAIRequest.top_p;
  }
  if (openAIRequest.max_tokens !== undefined) {
    ollamaRequest.options.num_predict = openAIRequest.max_tokens;
  }
  if (openAIRequest.stop !== undefined) {
    ollamaRequest.options.stop = Array.isArray(openAIRequest.stop)
      ? openAIRequest.stop
      : [openAIRequest.stop];
  }

  if (openAIRequest.messages && openAIRequest.messages.length > 0) {
    const systemMessages = openAIRequest.messages.filter(
      (msg) => msg.role === "system",
    );

    if (systemMessages.length > 0) {
      ollamaRequest.system = systemMessages
        .map((msg) => msg.content)
        .join("\n\n");
    }

    const userMessages = openAIRequest.messages.filter(
      (msg) => msg.role === "user",
    );
    if (userMessages.length > 0) {
      ollamaRequest.prompt = userMessages[userMessages.length - 1].content;
    } else {
      logger.debug(
        "[CONVERT] OpenAI request has messages but no user message. Using last message content for prompt.",
      );
      const lastMessage =
        openAIRequest.messages[openAIRequest.messages.length - 1];
      ollamaRequest.prompt = lastMessage?.content || "";
    }
  }

  if (openAIRequest.tools && openAIRequest.tools.length > 0) {
    logger.debug(
      "[CONVERT] Converting OpenAI tools for Ollama request (using system prompt injection)",
    );
    const toolInstructions = formatToolsForBackendPromptXML(
      openAIRequest.tools,
    );
    ollamaRequest.system =
      (ollamaRequest.system ? ollamaRequest.system + "\n\n" : "") +
      toolInstructions;

    logger.debug(
      "[CONVERT] Injected tool instructions into Ollama system prompt.",
    );
  }

  if (openAIRequest.tool_choice) {
    logger.debug(
      "[CONVERT] OpenAI 'tool_choice' is not directly supported for Ollama conversion. Ignoring.",
    );
  }

  if (Object.keys(ollamaRequest.options).length === 0) {
    delete ollamaRequest.options;
  }

  return ollamaRequest;
}

export function convertOllamaRequestToOpenAI(ollamaRequest) {
  const openAIRequest = {
    model: ollamaRequest.model,
    stream: ollamaRequest.stream === true,
    messages: [],
  };

  if (ollamaRequest.options) {
    if (ollamaRequest.options.temperature !== undefined) {
      openAIRequest.temperature = ollamaRequest.options.temperature;
    }
    if (ollamaRequest.options.top_p !== undefined) {
      openAIRequest.top_p = ollamaRequest.options.top_p;
    }
    if (ollamaRequest.options.num_predict !== undefined) {
      openAIRequest.max_tokens = ollamaRequest.options.num_predict;
    }
    if (ollamaRequest.options.stop !== undefined) {
      openAIRequest.stop = ollamaRequest.options.stop;
    }
  }

  if (ollamaRequest.system) {
    openAIRequest.messages.push({
      role: "system",
      content: ollamaRequest.system,
    });
  }
  if (ollamaRequest.prompt) {
    openAIRequest.messages.push({
      role: "user",
      content: ollamaRequest.prompt,
    });
  }

  if (ollamaRequest.tools) {
    openAIRequest.tools = ollamaRequest.tools;

    logger.debug("[CONVERT] Passing through Ollama tools to OpenAI request.");
  }
  if (ollamaRequest.tool_choice) {
    openAIRequest.tool_choice = ollamaRequest.tool_choice;
    logger.debug(
      "[CONVERT] Passing through Ollama tool_choice to OpenAI request.",
    );
  }

  if (openAIRequest.messages.length === 0) {
    console.error(
      "[CONVERT] Ollama request could not be converted to OpenAI: Missing prompt or messages.",
    );

    throw new Error(
      "Cannot convert Ollama request to OpenAI: No messages could be constructed.",
    );
  }

  return openAIRequest;
}
