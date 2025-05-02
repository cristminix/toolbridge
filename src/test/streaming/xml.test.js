import { expect } from "chai";
import { describe, it } from "mocha";
import { detectPotentialToolCall } from "../../handlers/toolCallHandler.js";

describe("Streaming XML Detection Tests", function () {
  const knownToolNames = [
    "search",
    "run_code",
    "think",
    "replace_string_in_file",
    "insert_edit_into_file",
    "get_errors",
  ];

  function simulateStreaming(chunks) {
    let buffer = "";
    let detected = false;
    let isPotential = false;
    let mightBeToolCall = false;
    let rootTagName = null;

    for (const chunk of chunks) {
      buffer += chunk;
      const result = detectPotentialToolCall(buffer, knownToolNames);

      if (result && result.isPotential && result.mightBeToolCall) {
        detected = true;
        isPotential = result.isPotential;
        mightBeToolCall = result.mightBeToolCall;
        rootTagName = result.rootTagName;
      }
    }

    return {
      detected,
      isPotential,
      mightBeToolCall,
      rootTagName,
      finalBuffer: buffer,
    };
  }

  it("should detect tool call in streamed chunks", function () {
    const toolCallChunks = [
      "<thi",
      "nk>\n  I need to analyze ",
      "this problem\n</th",
      "ink>",
    ];

    const result = simulateStreaming(toolCallChunks);
    expect(result.detected).to.be.true;
    expect(result.isPotential).to.be.true;
    expect(result.mightBeToolCall).to.be.true;
    expect(result.rootTagName).to.equal("think");
  });

  it("should not detect HTML as tool calls", function () {
    const htmlChunks = [
      "<!DOCTYPE html>\n<ht",
      "ml>\n<head>\n  <title>Test</title>\n</head>\n<bo",
      "dy>\n  <header>\n    <h1>Title</h1>\n  </header>\n</bo",
      "dy>\n</html>",
    ];

    const result = simulateStreaming(htmlChunks);
    expect(result.detected).to.be.false;
  });

  it("should detect tool call in mixed content", function () {
    const mixedChunks = [
      "I need to analyze this:\n\n<th",
      "ink>\n  This code has several issues:\n  1. Performance problems\n  ",
      "2. Security vulnerabilities\n  3. Maintainability concerns\n</thi",
      "nk>\n\nAs you can see from my analysis...",
    ];

    const result = simulateStreaming(mixedChunks);
    expect(result.detected).to.be.true;
    expect(result.isPotential).to.be.true;
    expect(result.mightBeToolCall).to.be.true;
    expect(result.rootTagName).to.equal("think");
  });

  it("should handle malformed XML in streams", function () {
    const malformedChunks = [
      "<thin",
      "k>\n  This is incomplete XML with < illegal characters\n  and missing ",
      "closing brackets </thin",
    ];

    const result = simulateStreaming(malformedChunks);
    expect(result.detected).to.be.true;
    expect(result.isPotential).to.be.true;
    expect(result.mightBeToolCall).to.be.true;
  });

  it("should handle nested tags in streamed content", function () {
    const nestedChunks = [
      "<insert_edit_into_file>\n  <explan",
      "ation>Add HTML</explanation>\n  <filePath>/path.html</filePath>\n  <co",
      "de>\n    <div>\n      <h1>Title</h1>\n    </div>\n  </co",
      "de>\n</insert_edit_into_file>",
    ];

    const result = simulateStreaming(nestedChunks);
    expect(result.detected).to.be.true;
    expect(result.isPotential).to.be.true;
    expect(result.mightBeToolCall).to.be.true;
    expect(result.rootTagName).to.equal("insert_edit_into_file");
  });

  it("should handle unicode characters in streamed content", function () {
    const unicodeChunks = [
      "<th",
      "ink>\n  Unicode: 你好, こんにちは, Привет\n  Emojis: 😀🚀💻\n</th",
      "ink>",
    ];

    const result = simulateStreaming(unicodeChunks);
    expect(result.detected).to.be.true;
    expect(result.isPotential).to.be.true;
    expect(result.mightBeToolCall).to.be.true;
    expect(result.rootTagName).to.equal("think");
  });
});
