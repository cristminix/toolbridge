import { expect } from "chai";
import { EventEmitter } from "events";
import { describe, it } from "mocha";
import { OpenAIStreamProcessor } from "../../handlers/stream/openaiStreamProcessor.js";

describe("Stream Error Handling Tests", function () {
  class MockResponse extends EventEmitter {
    constructor() {
      super();
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
      this.emit("end");
    }

    getChunks() {
      return this.chunks;
    }
  }

  const testCases = [
    {
      name: "Handle a truncated JSON chunk",
      chunks: [
        'data: {"id":"test1","object":"chat.completion.chunk","choices":[{"delta":{"content":"Hello"}}]}\n\n',
        'data: {"id":"test2","object":"chat.completion.chunk","choices":[{"delta":{"content":" world"}}]}\n\n',
        'data: {"id":"test3","object":"chat.completion.chunk","created":12345,"model":"test-model","choices":[{"index":0,"delta":{"content":null},"finish_reason":"stop"}],"usage":{"prompt',
        '_tokens":123}}\n\n',
        "data: [DONE]\n\n",
      ],
    },
    {
      name: "Handle malformed JSON chunk",
      chunks: [
        'data: {"id":"test1","object":"chat.completion.chunk","choices":[{"delta":{"content":"Processing"}}]}\n\n',
        'data: {"id":"test2",object:"chat.completion.chunk","choices":[{"delta":{"content":" data"}}]}\n\n',
        'data: {"id":"test3","object":"chat.completion.chunk","choices":[{"delta":{"content":"..."}}]}\n\n',
        "data: [DONE]\n\n",
      ],
    },
  ];

  testCases.forEach((testCase) => {
    it(`should ${testCase.name}`, function (done) {
      const mockRes = new MockResponse();
      const processor = new OpenAIStreamProcessor(mockRes);

      testCase.chunks.forEach((chunk) => {
        try {
          processor.processChunk(chunk);
        } catch (e) {
          expect.fail(`Processor threw an unhandled exception: ${e.message}`);
        }
      });

      const responseChunks = mockRes.getChunks();
      expect(responseChunks.length).to.be.at.least(1);

      const allContent = responseChunks.join("");
      expect(allContent).to.not.be.empty;

      done();
    });
  });
});
