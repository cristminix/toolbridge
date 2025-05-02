import { PassThrough } from "stream";

export function createMockRequest({
  body = {},
  headers = {},
  query = {},
  params = {},
  url = "/v1/chat/completions",
  method = "POST",
} = {}) {
  return {
    body,
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    query,
    params,
    url,
    method,
  };
}

export function createMockResponse() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    json: function (data) {
      this.body = data;
      return this;
    },
    status: function (code) {
      this.statusCode = code;
      return this;
    },
    setHeader: function (name, value) {
      this.headers[name] = value;
      return this;
    },
    getHeader: function (name) {
      return this.headers[name];
    },
    write: function (data) {
      if (!this.body) {
        this.body = "";
      }
      this.body += data;
      return this;
    },
    end: function (data) {
      if (data) {
        this.write(data);
      }
      return this;
    },
  };

  res._json = res.json;
  res.json = function (data) {
    res.jsonCalled = true;
    return res._json(data);
  };

  res._status = res.status;
  res.status = function (code) {
    res.statusCalled = true;
    return res._status(code);
  };

  res._write = res.write;
  res.write = function (data) {
    res.writeCalled = true;
    return res._write(data);
  };

  res._end = res.end;
  res.end = function (data) {
    res.endCalled = true;
    return res._end(data);
  };

  return res;
}

export function createMockStream() {
  return new PassThrough();
}

export const sampleOpenAIRequest = {
  model: "gpt-4",
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Hello, how are you?" },
  ],
  temperature: 0.7,
  max_tokens: 150,
};

export const sampleOpenAIRequestWithTools = {
  model: "gpt-4",
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "What's the weather like in San Francisco?" },
  ],
  tools: [
    {
      type: "function",
      function: {
        name: "get_weather",
        description: "Get the current weather in a given location",
        parameters: {
          type: "object",
          properties: {
            location: {
              type: "string",
              description: "The city and state, e.g. San Francisco, CA",
            },
          },
          required: ["location"],
        },
      },
    },
  ],
};

export const sampleOllamaRequest = {
  model: "llama2",
  prompt: "Hello, how are you?",
  stream: false,
};

export const sampleOllamaMessagesRequest = {
  model: "llama2",
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Hello, how are you?" },
  ],
  stream: false,
};

export const sampleOpenAIResponse = {
  id: "chatcmpl-123",
  object: "chat.completion",
  created: 1677652288,
  model: "gpt-4",
  choices: [
    {
      index: 0,
      message: {
        role: "assistant",
        content:
          "I'm doing well, thank you for asking! How can I help you today?",
      },
      finish_reason: "stop",
    },
  ],
};

export const sampleOpenAIStreamChunks = [
  {
    id: "chatcmpl-123",
    object: "chat.completion.chunk",
    created: 1677652288,
    model: "gpt-4",
    choices: [
      {
        index: 0,
        delta: { role: "assistant" },
        finish_reason: null,
      },
    ],
  },
  {
    id: "chatcmpl-123",
    object: "chat.completion.chunk",
    created: 1677652288,
    model: "gpt-4",
    choices: [
      {
        index: 0,
        delta: { content: "I'm doing " },
        finish_reason: null,
      },
    ],
  },
  {
    id: "chatcmpl-123",
    object: "chat.completion.chunk",
    created: 1677652288,
    model: "gpt-4",
    choices: [
      {
        index: 0,
        delta: { content: "well, thank " },
        finish_reason: null,
      },
    ],
  },
  {
    id: "chatcmpl-123",
    object: "chat.completion.chunk",
    created: 1677652288,
    model: "gpt-4",
    choices: [
      {
        index: 0,
        delta: { content: "you for asking!" },
        finish_reason: null,
      },
    ],
  },
  {
    id: "chatcmpl-123",
    object: "chat.completion.chunk",
    created: 1677652288,
    model: "gpt-4",
    choices: [
      {
        index: 0,
        delta: {},
        finish_reason: "stop",
      },
    ],
  },
];

export const sampleOllamaResponse = {
  model: "llama2",
  created_at: "2023-11-06T21:00:00.000Z",
  response:
    "I'm an AI assistant, so I don't have feelings, but I'm functioning properly and ready to help you! How can I assist you today?",
  done: true,
};

export const sampleOllamaStreamChunks = [
  {
    model: "llama2",
    created_at: "2023-11-06T21:00:00.000Z",
    response: "I'm an AI ",
    done: false,
  },
  {
    model: "llama2",
    created_at: "2023-11-06T21:00:00.000Z",
    response: "assistant, so I don't have ",
    done: false,
  },
  {
    model: "llama2",
    created_at: "2023-11-06T21:00:00.000Z",
    response: "feelings, but I'm functioning ",
    done: false,
  },
  {
    model: "llama2",
    created_at: "2023-11-06T21:00:00.000Z",
    response: "properly and ready to help you!",
    done: false,
  },
  {
    model: "llama2",
    created_at: "2023-11-06T21:00:00.000Z",
    response: " How can I assist you today?",
    done: true,
  },
];

export function formatSSE(data) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createMockFetch(responseData, status = 200) {
  return async () => {
    return {
      status,
      json: async () =>
        typeof responseData === "function" ? responseData() : responseData,
      text: async () =>
        JSON.stringify(
          typeof responseData === "function" ? responseData() : responseData,
        ),
      headers: new Map(),
    };
  };
}
