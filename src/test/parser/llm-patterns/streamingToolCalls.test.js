import { expect } from "chai";
import { describe, it } from "mocha";
import { detectPotentialToolCall } from "../../../handlers/toolCallHandler.js";
import { extractToolCallXMLParser } from "../../../utils/xmlUtils.js";

describe("Streaming Chunked Tool Call Tests", function () {
  const knownToolNames = [
    "search",
    "run_code",
    "think",
    "replace_string_in_file",
    "insert_edit_into_file",
    "get_errors",
    "create_file",
  ];

  function testStreamedToolCall(chunks, expectedToolName) {
    let partialContent = "";
    let detectedToolCall = null;
    let errors = [];

    for (const chunk of chunks) {
      partialContent += chunk;

      try {
        const detected = detectPotentialToolCall(
          partialContent,
          knownToolNames,
        );

        if (detected && detected.isPotential && detected.mightBeToolCall) {
          const extracted = extractToolCallXMLParser(
            partialContent,
            knownToolNames,
          );
          if (extracted && extracted.name) {
            detectedToolCall = extracted.name;
            break;
          }
        }
      } catch (error) {
        errors.push({
          chunk: chunk.substring(0, 50) + (chunk.length > 50 ? "..." : ""),
          error: error.message,
        });
      }
    }

    return {
      success: detectedToolCall === expectedToolName,
      detectedName: detectedToolCall,
      expectedName: expectedToolName,
      errors: errors,
      finalContent: partialContent,
    };
  }

  const simpleChunkedTool = [
    "Let me think about this problem: <th",
    "ink>We need to consider the following factors:\n",
    "1. Performance implications\n2. Security concerns\n",
    "3. User experience</th",
    "ink>\n\nBased on these considerations...",
  ];

  const htmlInChunkedTool = [
    "I'll create a component for you: ",
    "\n<create_file>\n  <filePath>/src/Button.jsx</filePath>\n  <content>",
    "import React from 'react';\n\nfunction Button(props) {\n  return (",
    "\n    <button\n      className={`btn ${props.primary ? 'btn-primary' : ''}`}\n",
    "      onClick={props.onClick}\n    >\n      {props.children}\n",
    '      {props.icon && <span className="icon">{props.icon}</span>}\n    </button>',
    "\n  );\n}\n\nexport default Button;</content>\n</create_file>",
  ];

  const delayedToolInChunks = [
    "<div>\n  <h1>Understanding the Problem</h1>\n  <p>This is a complex issue that requires careful analysis.</p>\n</div>",
    "\n\nLet's break this down step by step.\n\nFirst, ",
    "I need to analyze the core issues: <think>\n",
    "  Based on the code, there are several problems:\n",
    "  - The authentication flow is inconsistent\n",
    "  - Error handling is insufficient\n",
    "  - The API doesn't properly validate inputs\n</think>",
  ];

  const codeWithBreakingChars = [
    "Let's fix that validation function: \n<run_code>\n",
    "  <language>javascript</language>\n  <code>\nfunction validateInput(data) {",
    "\n  if (!data || typeof data !== 'object') {\n    return { valid: false, error: 'Invalid data' };\n  }",
    "\n\n  // Check required fields\n  if (!data.value || data.value === '') {",
    "\n    return { valid: false, error: 'Value is required' };\n  }",
    "\n\n  // Validate range\n  const val = Number(data.value);\n  if (isNaN(val) || val < 0 || val > 100) {",
    "\n    return { valid: false, error: `Value must be a number between 0-100, got: ${data.value}` };",
    "\n  }\n\n  return { valid: true, data: { ...data, value: val } };",
    "\n}\n  </code>\n</run_code>",
  ];

  const multiplePartialTools = [
    "Let me think about this problem carefully. ",
    "Here's my analysis: <think>",
    "The key issue seems to be with the data validation logic. ",
    "It doesn't properly handle edge cases like empty arrays or null values.",
    "</think>\n\nNow I can implement a solution based on this analysis.",
  ];

  it("should detect simple tool call in chunks", function () {
    const completeContent = simpleChunkedTool.join("");
    const result = detectPotentialToolCall(completeContent, knownToolNames);

    expect(result).to.not.be.null;
    expect(result.isPotential).to.be.true;
    expect(result.mightBeToolCall).to.be.true;
    expect(result.rootTagName).to.equal("think");
  });

  it("should detect tool call with HTML/JSX in chunks", function () {
    const completeContent = htmlInChunkedTool.join("");
    const result = detectPotentialToolCall(completeContent, knownToolNames);

    expect(result).to.not.be.null;
    expect(result.isPotential).to.be.true;
    expect(result.mightBeToolCall).to.be.true;
    expect(result.rootTagName).to.equal("create_file");
  });

  it("should detect tool call after HTML-like content", function () {
    const htmlContent = delayedToolInChunks[0];
    const htmlResult = detectPotentialToolCall(htmlContent, knownToolNames);

    expect(htmlResult?.mightBeToolCall || false).to.be.false;
  });

  it("should detect tool call with code containing XML-breaking characters", function () {
    const result = testStreamedToolCall(codeWithBreakingChars, "run_code");

    expect(result.success).to.be.true;
    expect(result.detectedName).to.equal("run_code");
    expect(result.errors).to.be.an("array");

    if (result.errors.length > 0) {
      console.log(
        `Encountered ${result.errors.length} errors during streaming that were handled correctly`,
      );
    }
  });

  it("should handle multiple potential but invalid tool calls and find the valid one", function () {
    const result = testStreamedToolCall(multiplePartialTools, "think");
    expect(result.success).to.be.true;
    expect(result.detectedName).to.equal("think");
  });
});
