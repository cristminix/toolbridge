import { expect } from "chai";
import { describe, it } from "mocha";
import { OpenAIStreamProcessor } from "../../../handlers/stream/openaiStreamProcessor.js";

describe("Text Duplication Test", function () {
  class MockResponse {
    constructor() {
      this.chunks = [];
      this.ended = false;
      this.writableEnded = false;
    }

    write(chunk) {
      this.chunks.push(chunk);
      return true;
    }

    end() {
      this.ended = true;
      this.writableEnded = true;
    }

    getChunks() {
      return this.chunks;
    }
  }

  it("should handle text duplication properly", function () {
    const mockRes = new MockResponse();
    const processor = new OpenAIStreamProcessor(mockRes);
    processor.setTools([
      {
        type: "function",
        function: { name: "test_tool", description: "Test tool" },
      },
    ]);

    processor.processChunk('data: {"id":"123","choices":[{"delta":{"content":"Test content"},"index":0,"finish_reason":null}]}');
    processor.processChunk('data: {"id":"124","choices":[{"delta":{"content":"More content"},"index":0,"finish_reason":null}]}');

    const chunks = mockRes.getChunks();
    expect(chunks.length).to.be.at.least(1);

    const allContent = chunks.join("");
    expect(allContent).to.include("Test content");
    expect(allContent).to.include("More content");
  });
});
