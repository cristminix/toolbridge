import { expect } from "chai";
import { describe, it } from "mocha";
import { detectPotentialToolCall } from "../../../handlers/toolCallHandler.js";

describe("Tool Call Handler", function () {
  describe("detectPotentialToolCall", function () {
    const knownToolNames = [
      "search",
      "run_code",
      "think",
      "get_weather",
      "calculate",
    ];

    it("should detect a simple complete tool call", function () {
      const content = "<search><query>test query</query></search>";
      const result = detectPotentialToolCall(content, knownToolNames);

      expect(result.isPotential).to.be.true;
      expect(result.mightBeToolCall).to.be.true;
      expect(result.isCompletedXml).to.be.true;
      expect(result.rootTagName).to.equal("search");
    });

    it("should detect a tool call with whitespace and newlines", function () {
      const content = `
        <search>
          <query>test query with spaces</query>
        </search>
      `;
      const result = detectPotentialToolCall(content, knownToolNames);

      expect(result.isPotential).to.be.true;
      expect(result.mightBeToolCall).to.be.true;
      expect(result.isCompletedXml).to.be.true;
      expect(result.rootTagName).to.equal("search");
    });

    it("should not detect unknown tool names", function () {
      const content = "<unknown_tool><param>value</param></unknown_tool>";
      const result = detectPotentialToolCall(content, knownToolNames);

      expect(result.isPotential).to.be.false;
      expect(result.mightBeToolCall).to.be.false;
      expect(result.rootTagName).to.equal("unknown_tool");
    });

    it("should detect tool call in code block", function () {
      const content =
        "```xml\n<search><query>in code block</query></search>\n```";
      const result = detectPotentialToolCall(content, knownToolNames);

      expect(result.isPotential).to.be.true;
      expect(result.mightBeToolCall).to.be.true;
      expect(result.isCompletedXml).to.be.true;
      expect(result.rootTagName).to.equal("search");
    });

    it("should detect a partial tool call with opening tag only", function () {
      const content = "<search><query>incomplete";
      const result = detectPotentialToolCall(content, knownToolNames);

      expect(result.isPotential).to.be.true;
      expect(result.mightBeToolCall).to.be.true;
      expect(result.isCompletedXml).to.be.false;
      expect(result.rootTagName).to.equal("search");
    });

    it("should detect self-closing tags as complete", function () {
      const content = '<search param="value"/>';
      const result = detectPotentialToolCall(content, knownToolNames);

      expect(result.isPotential).to.be.true;
      expect(result.mightBeToolCall).to.be.true;
      expect(result.isCompletedXml).to.be.true;
      expect(result.rootTagName).to.equal("search");
    });

    it("should handle empty content", function () {
      const content = "";
      const result = detectPotentialToolCall(content, knownToolNames);

      expect(result.isPotential).to.be.false;
      expect(result.mightBeToolCall).to.be.false;
      expect(result.isCompletedXml).to.be.false;
      expect(result.rootTagName).to.be.null;
    });

    it("should handle null content", function () {
      const content = null;
      const result = detectPotentialToolCall(content, knownToolNames);

      expect(result.isPotential).to.be.false;
      expect(result.mightBeToolCall).to.be.false;
      expect(result.isCompletedXml).to.be.false;
      expect(result.rootTagName).to.be.null;
    });

    it("should handle non-XML content", function () {
      const content = "This is just plain text without XML";
      const result = detectPotentialToolCall(content, knownToolNames);

      expect(result.isPotential).to.be.false;
      expect(result.mightBeToolCall).to.be.false;
      expect(result.isCompletedXml).to.be.false;
      expect(result.rootTagName).to.be.null;
    });

    it("should handle text with angle brackets but no valid XML", function () {
      const content = "This has < and > symbols but not valid XML";
      const result = detectPotentialToolCall(content, knownToolNames);

      expect(result.isPotential).to.be.false;
      expect(result.mightBeToolCall).to.be.false;
      expect(result.isCompletedXml).to.be.false;
      expect(result.rootTagName).to.be.null;
    });

    it("should detect tool call with leading text", function () {
      const content =
        "Here's a tool call: <search><query>find this</query></search>";
      const result = detectPotentialToolCall(content, knownToolNames);

      expect(result.isPotential).to.be.true;
      expect(result.mightBeToolCall).to.be.true;
      expect(result.isCompletedXml).to.be.true;
      expect(result.rootTagName).to.equal("search");
    });

    it("should detect tool call with trailing text", function () {
      const content =
        "<search><query>find this</query></search> And here are the results:";
      const result = detectPotentialToolCall(content, knownToolNames);

      expect(result.isPotential).to.be.true;
      expect(result.mightBeToolCall).to.be.true;
      expect(result.isCompletedXml).to.be.true;
      expect(result.rootTagName).to.equal("search");
    });

    it("should treat tool names as case sensitive", function () {
      const content = "<SEARCH><query>uppercase tool name</query></SEARCH>";
      const result = detectPotentialToolCall(content, knownToolNames);

      expect(result.isPotential).to.be.false;
      expect(result.mightBeToolCall).to.be.false;
      expect(result.rootTagName).to.equal("SEARCH");
    });

    it("should handle XML with namespaces based on implementation", function () {
      const content =
        '<ns:search xmlns:ns="http://example.com"><query>with namespace</query></ns:search>';
      const result = detectPotentialToolCall(content, knownToolNames);

      if (result.isPotential === true) {
        expect(result.rootTagName).to.equal("search");
        expect(result.mightBeToolCall).to.be.true;
      } else {
        expect(result.isPotential).to.be.false;
      }
    });

    it("should not detect any tools when knownToolNames is empty", function () {
      const content = "<search><query>test query</query></search>";
      const result = detectPotentialToolCall(content, []);

      expect(result.isPotential).to.be.false;
      expect(result.mightBeToolCall).to.be.false;
      expect(result.rootTagName).to.equal("search");
    });
  });
});
