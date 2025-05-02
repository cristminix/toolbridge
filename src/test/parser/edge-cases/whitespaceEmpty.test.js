import assert from "assert";
import { describe, it } from "mocha";
import { extractToolCallXMLParser } from "../../../utils/xmlUtils.js";

describe("Tool Parser - Whitespace and Empty Content Edge Cases", () => {
  it("should handle completely empty tool call", () => {
    const text = "Text before <tool_name></tool_name> Text after";
    const result = extractToolCallXMLParser(text, ["tool_name"]);

    if (result && result.name === "tool_name") {
      assert.deepStrictEqual(
        result.arguments,
        {},
        "Test Case 1 Failed: Tool arguments should be empty",
      );
    } else if (result && result.toolCalls && result.toolCalls.length > 0) {
      const expectedToolCall = {
        tool_name: "tool_name",
        parameters: {},
      };
      assert.strictEqual(
        result.toolCalls.length,
        1,
        "Test Case 1 Failed: Tool call count",
      );
      assert.deepStrictEqual(
        result.toolCalls[0],
        expectedToolCall,
        "Test Case 1 Failed: Tool call content",
      );
      assert.strictEqual(
        result.text,
        "Text before  Text after",
        "Test Case 1 Failed: Remaining text",
      );
    } else {
      assert.fail("Test Case 1 Failed: No valid result returned");
    }
  });

  it("should handle tool call with only whitespace inside", () => {
    const text = "Text before <tool_name>  \n </tool_name> Text after";
    const result = extractToolCallXMLParser(text, ["tool_name"]);

    if (result && result.name === "tool_name") {
      assert.ok(
        result.arguments,
        "Test Case 2 Failed: Tool arguments should exist",
      );
    } else if (result && result.toolCalls && result.toolCalls.length > 0) {
      const expectedToolCall = {
        tool_name: "tool_name",
        parameters: {},
      };
      assert.strictEqual(
        result.toolCalls.length,
        1,
        "Test Case 2 Failed: Tool call count",
      );
      assert.deepStrictEqual(
        result.toolCalls[0],
        expectedToolCall,
        "Test Case 2 Failed: Tool call content",
      );
      assert.strictEqual(
        result.text,
        "Text before  Text after",
        "Test Case 2 Failed: Remaining text",
      );
    } else {
      assert.fail("Test Case 2 Failed: No valid result returned");
    }
  });

  it("should handle empty parameter tag", () => {
    const text =
      "Text <tool_name><param1></param1><param2>value2</param2></tool_name> After";
    const result = extractToolCallXMLParser(text, ["tool_name"]);

    if (result && result.name === "tool_name") {
      assert.strictEqual(
        result.arguments.param1,
        "",
        "Test Case 3 Failed: Empty parameter should have empty string value",
      );
      assert.strictEqual(
        result.arguments.param2,
        "value2",
        "Test Case 3 Failed: Parameter value mismatch",
      );
    } else if (result && result.toolCalls && result.toolCalls.length > 0) {
      const expectedToolCall = {
        tool_name: "tool_name",
        parameters: { param1: "", param2: "value2" },
      };
      assert.strictEqual(
        result.toolCalls.length,
        1,
        "Test Case 3 Failed: Tool call count",
      );
      assert.deepStrictEqual(
        result.toolCalls[0],
        expectedToolCall,
        "Test Case 3 Failed: Tool call content",
      );
      assert.strictEqual(
        result.text,
        "Text  After",
        "Test Case 3 Failed: Remaining text",
      );
    } else {
      assert.fail("Test Case 3 Failed: No valid result returned");
    }
  });

  it("should handle parameter tag with only whitespace", () => {
    const text =
      "Text <tool_name><param1>  \t </param1><param2>value2</param2></tool_name> After";
    const result = extractToolCallXMLParser(text, ["tool_name"]);

    if (result && result.name === "tool_name") {
      assert.strictEqual(
        result.arguments.param1,
        "  \t ",
        "Test Case 4 Failed: Whitespace parameter value should be preserved",
      );
      assert.strictEqual(
        result.arguments.param2,
        "value2",
        "Test Case 4 Failed: Parameter value mismatch",
      );
    } else if (result && result.toolCalls && result.toolCalls.length > 0) {
      const expectedToolCall = {
        tool_name: "tool_name",
        parameters: { param1: "  \t ", param2: "value2" },
      };
      assert.strictEqual(
        result.toolCalls.length,
        1,
        "Test Case 4 Failed: Tool call count",
      );
      assert.deepStrictEqual(
        result.toolCalls[0],
        expectedToolCall,
        "Test Case 4 Failed: Tool call content",
      );
      assert.strictEqual(
        result.text,
        "Text  After",
        "Test Case 4 Failed: Remaining text",
      );
    } else {
      assert.fail("Test Case 4 Failed: No valid result returned");
    }
  });

  it("should handle extra whitespace around tags and parameters", () => {
    const text =
      "Before \n <tool_name> \n <param1> value1 </param1> \n </tool_name> \n After";
    const result = extractToolCallXMLParser(text, ["tool_name"]);

    if (result && result.name === "tool_name") {
      assert.strictEqual(
        result.arguments.param1,
        " value1 ",
        "Test Case 5 Failed: Parameter value with whitespace mismatch",
      );
    } else if (result && result.toolCalls && result.toolCalls.length > 0) {
      const expectedToolCall = {
        tool_name: "tool_name",
        parameters: { param1: " value1 " },
      };
      assert.strictEqual(
        result.toolCalls.length,
        1,
        "Test Case 5 Failed: Tool call count",
      );
      assert.deepStrictEqual(
        result.toolCalls[0],
        expectedToolCall,
        "Test Case 5 Failed: Tool call content",
      );
      assert.strictEqual(
        result.text,
        "Before \n  \n After",
        "Test Case 5 Failed: Remaining text",
      );
    } else {
      assert.fail("Test Case 5 Failed: No valid result returned");
    }
  });

  it("should handle tool call with leading/trailing whitespace in input string", () => {
    const text = "   <tool_name><param>val</param></tool_name>   ";
    const result = extractToolCallXMLParser(text, ["tool_name"]);

    if (result && result.name === "tool_name") {
      assert.strictEqual(
        result.arguments.param,
        "val",
        "Test Case 6 Failed: Parameter value mismatch",
      );
    } else if (result && result.toolCalls && result.toolCalls.length > 0) {
      const expectedToolCall = {
        tool_name: "tool_name",
        parameters: { param: "val" },
      };
      assert.strictEqual(
        result.toolCalls.length,
        1,
        "Test Case 6 Failed: Tool call count",
      );
      assert.deepStrictEqual(
        result.toolCalls[0],
        expectedToolCall,
        "Test Case 6 Failed: Tool call content",
      );
      assert.strictEqual(
        result.text,
        "      ",
        "Test Case 6 Failed: Remaining text",
      );
    } else {
      assert.fail("Test Case 6 Failed: No valid result returned");
    }
  });
});
