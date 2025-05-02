import assert from "assert";
import { describe, it } from "mocha";
import { attemptPartialToolCallExtraction } from "../../../utils/xmlUtils.js";

describe("Buffer Size Limit Tests", () => {
  const knownTools = ["insert_edit_into_file", "search", "run_in_terminal"];

  it("should limit buffer size for non-tool content", () => {
    const largeContent = "x".repeat(12 * 1024);

    const result = attemptPartialToolCallExtraction(largeContent, knownTools);

    assert.strictEqual(
      result.complete,
      false,
      "Large non-tool content should not complete as a tool call",
    );
    assert.strictEqual(
      result.partialState.buffer,
      "",
      "Buffer should be empty for large non-tool content",
    );
  });

  it("should keep checking the end of content even when size limit is exceeded", () => {
    const prefix = "x".repeat(12 * 1024);
    const toolCall =
      "<insert_edit_into_file><explanation>Test</explanation><filePath>/test.js</filePath><code>console.log('test');</code></insert_edit_into_file>";

    const content = prefix + toolCall;

    const result = attemptPartialToolCallExtraction(content, knownTools);

    assert.strictEqual(
      result.complete,
      true,
      "Should still detect tool call at end of large content",
    );
    assert.strictEqual(
      result.toolCall.name,
      "insert_edit_into_file",
      "Tool name should be correctly extracted",
    );
  });

  it("should reset buffer when an already-large buffer gets even larger", () => {
    const initialContent = "x".repeat(9 * 1024) + "<partial";

    const initialResult = attemptPartialToolCallExtraction(
      initialContent,
      knownTools,
    );

    const largerContent = initialContent + "x".repeat(3 * 1024);

    const nextResult = attemptPartialToolCallExtraction(
      largerContent,
      knownTools,
      initialResult.partialState,
    );

    assert.strictEqual(
      nextResult.partialState.buffer,
      "",
      "Buffer should be reset when growing beyond the limit with no valid tool",
    );
  });

  it("should still properly buffer valid partial tool calls under the size limit", () => {
    const partialTool =
      "<insert_edit_into_file><explanation>Test</explanation><filePath>/test.js</filePath><code>";

    const firstResult = attemptPartialToolCallExtraction(
      partialTool,
      knownTools,
    );

    const fullTool =
      partialTool + "console.log('test');</code></insert_edit_into_file>";

    const secondResult = attemptPartialToolCallExtraction(
      fullTool,
      knownTools,
      firstResult.partialState,
    );

    assert.strictEqual(
      secondResult.complete,
      true,
      "Complete tool call should be detected",
    );
    assert.strictEqual(
      secondResult.toolCall.name,
      "insert_edit_into_file",
      "Tool name should be correctly extracted",
    );
  });

  it("should correctly process valid tools even if they are large", () => {
    const largeTool = `<insert_edit_into_file>
      <explanation>Large code block</explanation>
      <filePath>/test.js</filePath>
      <code>${"x".repeat(8 * 1024)}</code>
    </insert_edit_into_file>`;

    const result = attemptPartialToolCallExtraction(largeTool, knownTools);

    assert.strictEqual(
      result.complete,
      true,
      "Large but valid tool call should be detected",
    );
    assert.strictEqual(
      result.toolCall.name,
      "insert_edit_into_file",
      "Tool name should be correctly extracted",
    );
    assert.strictEqual(
      result.toolCall.arguments.code.length,
      8 * 1024,
      "Large code content should be preserved",
    );
  });
});
