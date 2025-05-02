import logger from "../../logger.js";
import { extractToolCallXMLParser } from "../../xmlUtils.js";

export function convertOllamaResponseToOllama(ollamaResponse) {
  const updatedResponse = { ...ollamaResponse };

  if (
    updatedResponse.template &&
    !updatedResponse.template.includes("ToolCalls")
  ) {
    updatedResponse.template = updatedResponse.template + " ToolCalls";
    logger.debug(
      "[CONVERT] Added ToolCalls to Ollama response template for tool support signaling",
    );
  } else if (
    !updatedResponse.template &&
    (updatedResponse.tool_calls ||
      (updatedResponse.response?.includes("<") &&
        updatedResponse.response?.includes(">")))
  ) {
    updatedResponse.template = "{{system}}\n{{user}}\n{{assistant}} ToolCalls";
    logger.debug(
      "[CONVERT] Created template with ToolCalls for Ollama response with tool capabilities",
    );
  }

  return updatedResponse;
}

export function convertOpenAIResponseToOllama(
  openAIResponse,
  knownToolNames = [],
) {
  const baseOllamaResponse = {
    model: openAIResponse.model || "openai-model",
    created_at: new Date(
      (openAIResponse.created || Math.floor(Date.now() / 1000)) * 1000,
    ).toISOString(),
    done: false,
  };

  const choice = openAIResponse.choices && openAIResponse.choices[0];

  if (
    openAIResponse.object === "chat.completion.chunk" &&
    choice &&
    choice.delta
  ) {
    const delta = choice.delta;
    const ollamaChunk = {
      ...baseOllamaResponse,
      response: delta.content || "",
      done: choice.finish_reason !== null,
    };

    if (ollamaChunk.done && openAIResponse.usage) {
      ollamaChunk.total_duration = openAIResponse.usage.total_duration;
      ollamaChunk.load_duration = openAIResponse.usage.load_duration;
      ollamaChunk.prompt_eval_count = openAIResponse.usage.prompt_tokens;
      ollamaChunk.prompt_eval_duration =
        openAIResponse.usage.prompt_eval_duration;
      ollamaChunk.eval_count = openAIResponse.usage.completion_tokens;
      ollamaChunk.eval_duration = openAIResponse.usage.eval_duration;
    }

    if (delta.tool_calls && delta.tool_calls.length > 0) {
      ollamaChunk.tool_calls = delta.tool_calls.map((tc) => ({
        function: {
          name: tc.function?.name,
          arguments: tc.function?.arguments,
        },
      }));

      ollamaChunk.response = "";
    } else if (
      delta.content &&
      delta.content.includes("<") &&
      delta.content.includes(">")
    ) {
      const toolCall = extractToolCallXMLParser(delta.content, knownToolNames);
      if (toolCall) {
        logger.debug(
          "[CONVERT] Extracted XML tool call from OpenAI response content:",
          toolCall,
        );
        ollamaChunk.tool_calls = [
          {
            function: {
              name: toolCall.name,
              arguments: toolCall.arguments || {},
            },
          },
        ];

        ollamaChunk.response = "";
      }
    }

    return ollamaChunk;
  }

  if (openAIResponse.object === "chat.completion" && choice && choice.message) {
    const message = choice.message;
    const ollamaResponse = {
      ...baseOllamaResponse,
      response: message.content || "",
      done: true,
    };

    if (openAIResponse.usage) {
      ollamaResponse.total_duration = openAIResponse.usage.total_duration;
      ollamaResponse.load_duration = openAIResponse.usage.load_duration;
      ollamaResponse.prompt_eval_count = openAIResponse.usage.prompt_tokens;
      ollamaResponse.prompt_eval_duration =
        openAIResponse.usage.prompt_eval_duration;
      ollamaResponse.eval_count = openAIResponse.usage.completion_tokens;
      ollamaResponse.eval_duration = openAIResponse.usage.eval_duration;
    }

    if (message.tool_calls && message.tool_calls.length > 0) {
      ollamaResponse.tool_calls = message.tool_calls.map((tc) => ({
        function: {
          name: tc.function.name,
          arguments: JSON.parse(tc.function.arguments || "{}"),
        },
      }));

      if (!message.content) {
        ollamaResponse.response = "";
      }
    } else if (
      message.content &&
      message.content.includes("<") &&
      message.content.includes(">")
    ) {
      const toolCall = extractToolCallXMLParser(
        message.content,
        knownToolNames,
      );
      if (toolCall) {
        logger.debug(
          "[CONVERT] Extracted XML tool call from OpenAI response content:",
          toolCall,
        );
        ollamaResponse.tool_calls = [
          {
            function: {
              name: toolCall.name,
              arguments: toolCall.arguments || {},
            },
          },
        ];

        ollamaResponse.response = "";
      }
    }

    return ollamaResponse;
  }

  logger.debug(
    "[CONVERT] Unknown OpenAI response format encountered:",
    openAIResponse,
  );
  return { ...baseOllamaResponse, response: "[Conversion Error]", done: true };
}

export function convertOllamaResponseToOpenAI(
  ollamaResponse,
  stream = false,
  knownToolNames = [],
) {
  const now = Math.floor(Date.now() / 1000);
  const id = `chatcmpl-ollama-${Date.now()}`;

  if (stream) {
    const isOpenAIChunk = {
      id: id,
      object: "chat.completion.chunk",
      created: now,
      model: ollamaResponse.model || "ollama-model",
      choices: [
        {
          index: 0,
          delta: {
            role: "assistant",
            content: ollamaResponse.response || null,
          },
          finish_reason: ollamaResponse.done ? "stop" : null,
          logprobs: null,
        },
      ],
    };

    if (ollamaResponse.done) {
      isOpenAIChunk.choices[0].finish_reason = "stop";

      if (ollamaResponse.tool_calls) {
        isOpenAIChunk.choices[0].finish_reason = "tool_calls";
      }

      if (
        ollamaResponse.eval_count !== undefined ||
        ollamaResponse.prompt_eval_count !== undefined
      ) {
        isOpenAIChunk.usage = {
          prompt_tokens: ollamaResponse.prompt_eval_count || 0,
          completion_tokens: ollamaResponse.eval_count || 0,
          total_tokens:
            (ollamaResponse.prompt_eval_count || 0) +
            (ollamaResponse.eval_count || 0),
        };
      }
    } else {
      isOpenAIChunk.choices[0].finish_reason = null;
    }

    if (ollamaResponse.tool_calls && !ollamaResponse.done) {
      isOpenAIChunk.choices[0].delta = {
        tool_calls: ollamaResponse.tool_calls.map((tc, index) => ({
          index: index,
          id: `call_ollama_${Date.now()}_${index}`,
          type: "function",
          function: {
            name: tc.function?.name,

            arguments: JSON.stringify(tc.function?.arguments || {}),
          },
        })),
      };

      isOpenAIChunk.choices[0].delta.content = null;
      isOpenAIChunk.choices[0].finish_reason = null;
    } else if (!ollamaResponse.response && !ollamaResponse.done) {
      isOpenAIChunk.choices[0].delta.content = "";
    } else if (
      !ollamaResponse.response &&
      ollamaResponse.done &&
      !isOpenAIChunk.choices[0].finish_reason
    ) {
      isOpenAIChunk.choices[0].finish_reason = "stop";
    }

    if (isOpenAIChunk.choices[0].delta.content === undefined) {
      isOpenAIChunk.choices[0].delta.content = null;
    }

    return isOpenAIChunk;
  }

  const openAIResponse = {
    id: id,
    object: "chat.completion",
    created: ollamaResponse.created_at
      ? Math.floor(new Date(ollamaResponse.created_at).getTime() / 1000)
      : now,
    model: ollamaResponse.model || "ollama-model",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: ollamaResponse.response || null,
        },
        finish_reason: "stop",
        logprobs: null,
      },
    ],
    usage: {
      prompt_tokens: ollamaResponse.prompt_eval_count || 0,
      completion_tokens: ollamaResponse.eval_count || 0,
      total_tokens:
        (ollamaResponse.prompt_eval_count || 0) +
        (ollamaResponse.eval_count || 0),
    },
  };

  if (ollamaResponse.response) {
    const toolCall = extractToolCallXMLParser(
      ollamaResponse.response,
      knownToolNames,
    );
    if (toolCall) {
      logger.debug(
        "[CONVERT] Detected XML tool call in Ollama response:",
        toolCall,
      );
      openAIResponse.choices[0].message.content = null;
      openAIResponse.choices[0].message.tool_calls = [
        {
          id: `call_ollama_${Date.now()}`,
          type: "function",
          function: {
            name: toolCall.name,
            arguments: JSON.stringify(toolCall.arguments || {}),
          },
        },
      ];
      openAIResponse.choices[0].finish_reason = "tool_calls";
    }
  } else if (ollamaResponse.tool_calls) {
    logger.debug(
      "[CONVERT] Detected structured tool calls in Ollama response:",
      ollamaResponse.tool_calls,
    );
    openAIResponse.choices[0].message.content = ollamaResponse.response || null;
    openAIResponse.choices[0].message.tool_calls =
      ollamaResponse.tool_calls.map((tc, index) => ({
        id: `call_ollama_${Date.now()}_${index}`,
        type: "function",
        function: {
          name: tc.function.name,
          arguments: JSON.stringify(tc.function.arguments || {}),
        },
      }));
    openAIResponse.choices[0].finish_reason = "tool_calls";

    if (!openAIResponse.choices[0].message.content) {
      openAIResponse.choices[0].message.content = null;
    }
  }

  if (
    openAIResponse.choices[0].message.content === undefined &&
    !openAIResponse.choices[0].message.tool_calls
  ) {
    openAIResponse.choices[0].message.content = null;
  }

  return openAIResponse;
}
