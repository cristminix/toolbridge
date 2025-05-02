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

    processor.processChunk('{"id": "123", "content": "Test content"}');
    processor.processChunk('{"id": "124", "content": "More content"}');

    const chunks = mockRes.getChunks();
    expect(chunks.length).to.be.at.least(1);

    const allContent = chunks.join("");
    expect(allContent).to.include("Test content");
    expect(allContent).to.include("More content");
  });
});
