import axios from "axios";
import express from "express";
import {
  getProxyUrl,
  isProxyRunning,
  TEST_CONFIG,
} from "../utils/testConfig.js";

import { describe } from "mocha";
class MockLLMServer {
  constructor(port = TEST_CONFIG.MOCK_PORT) {
    this.port = port;
    this.app = express();
    this.setupRoutes();
    this.server = null;
  }

  setupRoutes() {
    this.app.post("/v1/chat/completions", (req, res) => {
      res.setHeader("Content-Type", "application/json");

      const stream = req.query.stream === "true";

      if (stream) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        let counter = 0;
        const interval = setInterval(() => {
          if (counter < 5) {
            const chunk = `data: ${JSON.stringify({
              id: `mock-${counter}`,
              object: "chat.completion.chunk",
              created: Date.now(),
              model: req.body.model || TEST_CONFIG.TEST_MODEL,
              choices: [
                {
                  index: 0,
                  delta: { content: `chunk ${counter} ` },
                  finish_reason: null,
                },
              ],
            })}\n\n`;
            res.write(chunk);
            counter++;
          } else {
            if (req.body.tools) {
              const toolCall = {
                id: `mock-${counter}`,
                object: "chat.completion.chunk",
                created: Date.now(),
                model: req.body.model || TEST_CONFIG.TEST_MODEL,
                choices: [
                  {
                    index: 0,
                    delta: {
                      tool_calls: [
                        {
                          index: 0,
                          id: "call_mock123",
                          type: "function",
                          function: {
                            name: "search",
                            arguments: JSON.stringify({ query: "test query" }),
                          },
                        },
                      ],
                    },
                    finish_reason: "tool_calls",
                  },
                ],
              };
              res.write(`data: ${JSON.stringify(toolCall)}\n\n`);
            } else {
              res.write(
                `data: ${JSON.stringify({
                  id: `mock-${counter}`,
                  object: "chat.completion.chunk",
                  created: Date.now(),
                  model: req.body.model || TEST_CONFIG.TEST_MODEL,
                  choices: [
                    {
                      index: 0,
                      delta: { content: null },
                      finish_reason: "stop",
                    },
                  ],
                })}\n\n`,
              );
            }

            res.write("data: [DONE]\n\n");
            clearInterval(interval);
            res.end();
          }
        }, 50);
      } else {
        if (req.body.tools) {
          res.json({
            id: "mock-completion",
            object: "chat.completion",
            created: Date.now(),
            model: req.body.model || TEST_CONFIG.TEST_MODEL,
            choices: [
              {
                index: 0,
                message: {
                  role: "assistant",
                  content: null,
                  tool_calls: [
                    {
                      id: "call_mock123",
                      type: "function",
                      function: {
                        name: "search",
                        arguments: JSON.stringify({ query: "test query" }),
                      },
                    },
                  ],
                },
                finish_reason: "tool_calls",
              },
            ],
          });
        } else {
          res.json({
            id: "mock-completion",
            object: "chat.completion",
            created: Date.now(),
            model: req.body.model || TEST_CONFIG.TEST_MODEL,
            choices: [
              {
                index: 0,
                message: {
                  role: "assistant",
                  content: "This is a mock response from the LLM server.",
                },
                finish_reason: "stop",
              },
            ],
          });
        }
      }
    });
  }

  start() {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`Mock LLM server running on port ${this.port}`);
        resolve();
      });
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log("Mock LLM server stopped");
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

async function runIntegrationTests() {
  describe("Starting Integration Tests ", function () {});

  const mockServer = new MockLLMServer();
  await mockServer.start();

  const results = {
    passed: 0,
    failed: 0,
  };

  try {
    try {
      console.log("\nTest 1: Non-streaming chat completion");
      const response = await axios.post(
        getProxyUrl("/v1/chat/completions"),
        {
          model: TEST_CONFIG.TEST_MODEL,
          messages: [{ role: "user", content: "Hello world" }],
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${TEST_CONFIG.TEST_API_KEY}`,
          },
        },
      );

      if (
        response.status === 200 &&
        response.data.choices &&
        response.data.choices.length > 0
      ) {
        console.log("✅ Non-streaming test passed");
        results.passed++;
      } else {
        console.log("❌ Non-streaming test failed");
        console.log("Response:", response.data);
        results.failed++;
      }
    } catch (error) {
      console.error("❌ Non-streaming test error:", error.message);
      results.failed++;
    }

    try {
      console.log("\nTest 2: Streaming chat completion");

      const response = await axios.post(
        `${getProxyUrl("/v1/chat/completions")}?stream=true`,
        {
          model: TEST_CONFIG.TEST_MODEL,
          messages: [{ role: "user", content: "Hello world" }],
          stream: true,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${TEST_CONFIG.TEST_API_KEY}`,
          },
          responseType: "stream",
        },
      );

      let chunksReceived = 0;

      await new Promise((resolve, reject) => {
        response.data.on("data", (chunk) => {
          const chunkStr = chunk.toString();
          if (chunkStr.includes("data:")) {
            chunksReceived++;
            console.log(`Received chunk: ${chunksReceived}`);
          }
        });

        response.data.on("end", () => {
          if (chunksReceived > 0) {
            console.log("✅ Streaming test passed");
            results.passed++;
            resolve();
          } else {
            console.log("❌ Streaming test failed - no chunks received");
            results.failed++;
            reject(new Error("No chunks received"));
          }
        });

        response.data.on("error", (err) => {
          console.error("❌ Streaming response error:", err);
          results.failed++;
          reject(err);
        });
      }).catch((err) => {
        console.error("Stream handling error:", err);
      });
    } catch (error) {
      console.error("❌ Streaming test error:", error.message);
      results.failed++;
    }

    try {
      console.log("\nTest 3: Tool calling API");
      const response = await axios.post(
        getProxyUrl("/v1/chat/completions"),
        {
          model: TEST_CONFIG.TEST_MODEL,
          messages: [{ role: "user", content: "Use a tool" }],
          tools: [
            {
              type: "function",
              function: {
                name: "search",
                description: "Search for information",
                parameters: {
                  type: "object",
                  properties: {
                    query: { type: "string" },
                  },
                  required: ["query"],
                },
              },
            },
          ],
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${TEST_CONFIG.TEST_API_KEY}`,
          },
        },
      );

      if (
        response.status === 200 &&
        response.data.choices &&
        response.data.choices[0]
      ) {
        const hasChoices =
          response.data.choices && response.data.choices.length > 0;

        const isValid =
          hasChoices &&
          response.data.choices[0].message &&
          response.data.choices[0].message.tool_calls;

        if (isValid) {
          console.log("✅ Tool calling test passed");
          console.log("Model responded with tool_calls format");

          const toolCall = response.data.choices[0].message.tool_calls[0];
          if (
            toolCall &&
            toolCall.function &&
            toolCall.function.name === "search" &&
            toolCall.function.arguments
          ) {
            console.log("Tool call structure is valid");
          } else {
            console.log("❌ Tool call structure is not as expected");
            results.failed++;
            return;
          }

          results.passed++;
        } else {
          console.log("❌ Tool calling test failed - Invalid response format");
          console.log("Response:", response.data);
          results.failed++;
        }
      } else {
        console.log("❌ Tool calling test failed");
        console.log("Response:", response.data);
        results.failed++;
      }
    } catch (error) {
      console.error("❌ Tool calling test error:", error.message);
      results.failed++;
    }
  } finally {
    await mockServer.stop();
  }

  console.log("\n=== Integration Tests Results ===");
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Total: ${results.passed + results.failed}`);
  describe("=========================", function () {});
}

async function run() {
  if (await isProxyRunning()) {
    await runIntegrationTests();
  } else {
    console.error(
      `Error: Proxy server needs to be running on port ${TEST_CONFIG.PROXY_PORT}`,
    );
    console.log("Please start the proxy server with: npm start");
    process.exit(1);
  }
}

run();
