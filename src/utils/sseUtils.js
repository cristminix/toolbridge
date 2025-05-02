export function formatSSEChunk(data) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export function createChatStreamChunk(
  id,
  model,
  contentDelta,
  finishReason = null,
) {
  const chunk = {
    id: id || `chatcmpl-proxy-stream-${Date.now()}`,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model: model || "proxied-backend-model",
    choices: [
      {
        index: 0,
        delta: { role: "assistant" },
        finish_reason: finishReason,
        logprobs: null,
      },
    ],
  };

  if (contentDelta !== null && contentDelta !== undefined) {
    chunk.choices[0].delta.content = contentDelta;
  }

  if (finishReason === null) {
    delete chunk.choices[0].finish_reason;
  }

  return chunk;
}

export function createFunctionCallStreamChunks(id, model, toolCall) {
  const baseId = id || `chatcmpl-proxy-func-${Date.now()}`;
  const created = Math.floor(Date.now() / 1000);
  const baseModel = model || "proxied-backend-model";

  const roleChunk = {
    id: baseId,
    object: "chat.completion.chunk",
    created: created,
    model: baseModel,
    choices: [
      {
        index: 0,
        delta: {
          role: "assistant",
        },
        finish_reason: null,
      },
    ],
  };

  const toolCallId = `call_${Date.now()}`;
  const toolCallChunk = {
    id: baseId,
    object: "chat.completion.chunk",
    created: created,
    model: baseModel,
    choices: [
      {
        index: 0,
        delta: {
          tool_calls: [
            {
              index: 0,
              id: toolCallId,
              type: "function",
              function: {
                name: toolCall.name,
                arguments: JSON.stringify(toolCall.arguments || {}),
              },
            },
          ],
        },
        finish_reason: null,
      },
    ],
  };

  const finishChunk = {
    id: baseId,
    object: "chat.completion.chunk",
    created: created,
    model: baseModel,
    choices: [
      {
        index: 0,
        delta: {},
        finish_reason: "tool_calls",
      },
    ],
  };

  return [roleChunk, toolCallChunk, finishChunk];
}

export function createFinalToolCallChunk(id, model) {
  return {
    id: id || `chatcmpl-proxy-toolend-${Date.now()}`,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model: model || "proxied-backend-model",
    choices: [
      {
        index: 0,
        delta: {},
        finish_reason: "tool_calls",
        logprobs: null,
      },
    ],
  };
}
