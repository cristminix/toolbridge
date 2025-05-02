import { expect } from "chai";
import { describe, it } from "mocha";
import { attemptPartialToolCallExtraction } from "../../../utils/xmlUtils.js";

describe("Partial Tool Call Extraction", function () {
  const knownToolNames = [
    "search",
    "run_code",
    "think",
    "get_weather",
    "calculate",
  ];

  describe("Single chunk extraction", function () {
    it("should extract complete tool call from a single chunk", function () {
      const content = "<search><query>test query</query></search>";
      const result = attemptPartialToolCallExtraction(content, knownToolNames);

      expect(result).to.have.property("complete", true);
      expect(result.toolCall).to.not.be.null;
      expect(result.toolCall.name).to.equal("search");
      expect(result.toolCall.arguments).to.have.property("query", "test query");
    });

    it("should identify incomplete tool call from a single chunk", function () {
      const content = "<search><query>incomplete";
      const result = attemptPartialToolCallExtraction(content, knownToolNames);

      expect(result).to.have.property("complete", false);
      expect(result.partialState).to.not.be.null;
      expect(result.partialState.rootTag).to.equal("search");
      expect(result.partialState.isPotential).to.be.true;
      expect(result.partialState.buffer).to.equal(content);
    });

    it("should not extract unknown tool names", function () {
      const content = "<unknown_tool><param>value</param></unknown_tool>";
      const result = attemptPartialToolCallExtraction(content, knownToolNames);

      expect(result).to.have.property("complete", false);
      expect(result.partialState).to.not.be.null;

      expect(result.partialState.rootTag).to.be.null;
      expect(result.partialState.isPotential).to.be.false;
      expect(result.partialState.mightBeToolCall).to.be.false;
    });
  });

  describe("Multi-chunk extraction", function () {
    it("should accumulate chunks and extract complete tool call", function () {
      const chunk1 = "<se";
      const chunk2 = "arch><query>test";
      const chunk3 = " query</query></search>";

      const result1 = attemptPartialToolCallExtraction(chunk1, knownToolNames);
      expect(result1).to.have.property("complete", false);

      const result2 = attemptPartialToolCallExtraction(
        chunk1 + chunk2,
        knownToolNames,
        result1.partialState,
      );
      expect(result2).to.have.property("complete", false);

      const result3 = attemptPartialToolCallExtraction(
        chunk1 + chunk2 + chunk3,
        knownToolNames,
        result2.partialState,
      );
      expect(result3).to.have.property("complete", true);
      expect(result3.toolCall).to.not.be.null;
      expect(result3.toolCall.name).to.equal("search");
      expect(result3.toolCall.arguments).to.have.property(
        "query",
        "test query",
      );
    });

    it("should maintain state between partial extractions", function () {
      const chunk1 = "<think>";
      const result1 = attemptPartialToolCallExtraction(chunk1, knownToolNames);

      expect(result1).to.have.property("complete", false);
      expect(result1.partialState.rootTag).to.equal("think");
      expect(result1.partialState.isPotential).to.be.true;

      const chunk2 = "<think><thoughts>Some thoughts</thoughts>";
      const result2 = attemptPartialToolCallExtraction(
        chunk2,
        knownToolNames,
        result1.partialState,
      );

      expect(result2).to.have.property("complete", false);
      expect(result2.partialState.rootTag).to.equal("think");
      expect(result2.partialState.isPotential).to.be.true;

      const chunk3 = "<think><thoughts>Some thoughts</thoughts></think>";
      const result3 = attemptPartialToolCallExtraction(
        chunk3,
        knownToolNames,
        result2.partialState,
      );

      expect(result3).to.have.property("complete", true);
      expect(result3.toolCall).to.not.be.null;
      expect(result3.toolCall.name).to.equal("think");
      expect(result3.toolCall.arguments).to.have.property(
        "thoughts",
        "Some thoughts",
      );
    });

    it("should not extract unknown tool calls across chunks", function () {
      const chunk1 = "<unknown_";
      const result1 = attemptPartialToolCallExtraction(chunk1, knownToolNames);

      expect(result1).to.have.property("complete", false);
      expect(result1.partialState.rootTag).to.be.null;

      const chunk2 = "<unknown_tool><param>";
      const result2 = attemptPartialToolCallExtraction(
        chunk2,
        knownToolNames,
        result1.partialState,
      );

      expect(result2).to.have.property("complete", false);

      expect(result2.partialState.rootTag).to.be.null;
      expect(result2.partialState.isPotential).to.be.false;
      expect(result2.partialState.mightBeToolCall).to.be.false;
    });
  });

  describe("Complex tool call extraction", function () {
    it("should extract tool calls with multiple parameters", function () {
      const content = `<run_code>
        <language>javascript</language>
        <code>console.log("hello world");</code>
        <timeout>5000</timeout>
      </run_code>`;

      const result = attemptPartialToolCallExtraction(content, knownToolNames);

      expect(result).to.have.property("complete", true);
      expect(result.toolCall).to.not.be.null;
      expect(result.toolCall.name).to.equal("run_code");
      expect(result.toolCall.arguments).to.have.property(
        "language",
        "javascript",
      );
      expect(result.toolCall.arguments).to.have.property(
        "code",
        'console.log("hello world");',
      );
      expect(result.toolCall.arguments).to.have.property("timeout");
    });

    it("should handle HTML content inside tool parameters", function () {
      const content = `<run_code>
        <language>html</language>
        <code>
          <!DOCTYPE html>
          <html>
            <head><title>Test</title></head>
            <body>
              <div>Test content with < and > characters</div>
              <script>if(x < 10 && y > 5) {}</script>
            </body>
          </html>
        </code>
      </run_code>`;

      const result = attemptPartialToolCallExtraction(content, knownToolNames);

      expect(result).to.have.property("complete", true);
      expect(result.toolCall).to.not.be.null;
      expect(result.toolCall.name).to.equal("run_code");
      expect(result.toolCall.arguments).to.have.property("language", "html");
      expect(result.toolCall.arguments).to.have.property("code");
      expect(result.toolCall.arguments.code).to.include("<!DOCTYPE html>");
      expect(result.toolCall.arguments.code).to.include(
        "<div>Test content with < and > characters</div>",
      );
      expect(result.toolCall.arguments.code).to.include(
        "if(x < 10 && y > 5) {}",
      );
    });
  });

  describe("Edge cases", function () {
    it("should handle empty content", function () {
      const content = "";
      const result = attemptPartialToolCallExtraction(content, knownToolNames);

      expect(result).to.have.property("complete", false);
      expect(result.partialState).to.not.be.null;
    });

    it("should handle non-XML content", function () {
      const content = "This is just some text, not XML";
      const result = attemptPartialToolCallExtraction(content, knownToolNames);

      expect(result).to.have.property("complete", false);
      expect(result.partialState).to.not.be.null;
    });

    it("should handle malformed XML", function () {
      const content = "<search><query>malformed</query><search>";
      const result = attemptPartialToolCallExtraction(content, knownToolNames);

      expect(result).to.have.property("complete", false);
      expect(result.partialState.rootTag).to.equal("search");
    });

    it("should handle empty known tools array", function () {
      const content = "<search><query>test query</query></search>";
      const result = attemptPartialToolCallExtraction(content, []);

      expect(result).to.have.property("complete", false);

      expect(result.partialState.rootTag).to.be.null;
      expect(result.partialState.isPotential).to.be.false;
      expect(result.partialState.mightBeToolCall).to.be.false;
    });
  });
});
