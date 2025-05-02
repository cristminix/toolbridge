import assert from "assert";
import { describe, it } from "mocha";
import { detectPotentialToolCall } from "../../../handlers/toolCallHandler.js";

describe("HTML Tag Detection Tests", () => {
  const knownTools = ["insert_edit_into_file", "search", "run_in_terminal"];

  describe("Common HTML Tag Detection", () => {
    it("should immediately reject common HTML opening tags", () => {
      const htmlTags = [
        "div",
        "span",
        "p",
        "h1",
        "h2",
        "style",
        "script",
        "body",
        "html",
        "head",
      ];

      htmlTags.forEach((tag) => {
        const content = `<${tag}>Some content`;
        const result = detectPotentialToolCall(content, knownTools);

        assert.strictEqual(
          result.mightBeToolCall,
          false,
          `HTML tag <${tag}> should not be considered a potential tool call`,
        );
        assert.strictEqual(
          result.rootTagName,
          tag,
          `Root tag name should be correctly identified as '${tag}'`,
        );
      });
    });

    it("should immediately reject common HTML closing tags", () => {
      const htmlTags = ["div", "span", "p", "h1", "style", "script"];

      htmlTags.forEach((tag) => {
        const content = `</${tag}>`;
        const result = detectPotentialToolCall(content, knownTools);

        assert.strictEqual(
          result.mightBeToolCall,
          false,
          `Closing HTML tag </${tag}> should not be considered a potential tool call`,
        );
      });
    });

    it("should reject HTML tags with attributes", () => {
      const content = '<div class="container" id="main">Content</div>';
      const result = detectPotentialToolCall(content, knownTools);

      assert.strictEqual(
        result.mightBeToolCall,
        false,
        "HTML tag with attributes should not be considered a potential tool call",
      );
      assert.strictEqual(
        result.rootTagName,
        "div",
        "Root tag name should be correctly identified",
      );
    });

    it("should reject self-closing HTML tags", () => {
      const tags = ["img", "br", "hr", "input", "meta"];

      tags.forEach((tag) => {
        const content = `<${tag} />`;
        const result = detectPotentialToolCall(content, knownTools);

        assert.strictEqual(
          result.mightBeToolCall,
          false,
          `Self-closing HTML tag <${tag} /> should not be considered a potential tool call`,
        );
      });
    });
  });

  describe("HTML vs Tool Call Differentiation", () => {
    it("should correctly differentiate HTML from tool calls", () => {
      const htmlContent = "<div>This is HTML content</div>";
      const htmlResult = detectPotentialToolCall(htmlContent, knownTools);

      const toolContent =
        "<insert_edit_into_file><explanation>Test</explanation></insert_edit_into_file>";
      const toolResult = detectPotentialToolCall(toolContent, knownTools);

      assert.strictEqual(
        htmlResult.mightBeToolCall,
        false,
        "HTML content should not be considered a potential tool call",
      );
      assert.strictEqual(
        toolResult.mightBeToolCall,
        true,
        "Valid tool call should be considered a potential tool call",
      );
    });

    it("should not reject valid tool calls that happen to start with HTML tag names", () => {
      const customTools = [...knownTools, "div_creator", "style_formatter"];

      const content1 = "<div_creator><param>value</param></div_creator>";
      const content2 =
        "<style_formatter><param>value</param></style_formatter>";

      const result1 = detectPotentialToolCall(content1, customTools);
      const result2 = detectPotentialToolCall(content2, customTools);

      assert.strictEqual(
        result1.mightBeToolCall,
        true,
        "Tool call with name starting with 'div' should be considered a potential tool call",
      );
      assert.strictEqual(
        result2.mightBeToolCall,
        true,
        "Tool call with name starting with 'style' should be considered a potential tool call",
      );
    });
  });
});
