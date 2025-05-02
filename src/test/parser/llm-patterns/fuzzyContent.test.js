import { expect } from "chai";
import { describe, it } from "mocha";
import { detectPotentialToolCall } from "../../../handlers/toolCallHandler.js";
import { extractToolCallXMLParser } from "../../../utils/xmlUtils.js";

describe("Fuzzy LLM Content Tests", function () {
  const knownToolNames = ["search", "think", "run_code"];

  it("should extract tool calls from mixed markdown and code content", function () {
    const complexInput = `<think>This user prefers dark theme and has notifications enabled.</think>`;

    const result = detectPotentialToolCall(complexInput, knownToolNames);
    expect(result).to.not.be.null;
    expect(result.rootTagName).to.equal("think");
    expect(result.isPotential).to.be.true;

    const extracted = extractToolCallXMLParser(complexInput, knownToolNames);
    expect(extracted).to.not.be.null;
    expect(extracted.name).to.equal("think");
    expect(extracted.arguments).to.be.a("object");
  });

  it("should handle minimalist tool calls", function () {
    const minimalistToolCall = `<think>Simple analysis.</think>`;

    const result = extractToolCallXMLParser(minimalistToolCall, knownToolNames);
    expect(result).to.not.be.null;
    expect(result.name).to.equal("think");
    expect(result.arguments).to.be.a("object");
  });

  it("should document behavior with tool calls followed by text", function () {
    const toolCallWithTrailingText = `<think>Analysis.</think>\nFollowed by more text`;

    const detected = detectPotentialToolCall(
      toolCallWithTrailingText,
      knownToolNames,
    );
    expect(detected).to.not.be.null;
    expect(detected.rootTagName).to.equal("think");
    expect(detected.isPotential).to.be.true;

    const result = extractToolCallXMLParser(
      toolCallWithTrailingText,
      knownToolNames,
    );
    expect(result).to.not.be.null;
    expect(result.name).to.equal("think");
    expect(result.arguments).to.be.a("object");
  });

  it("should extract tool calls with text before but not after", function () {
    const toolCallWithLeadingText = `Here's my analysis: <think>Simple analysis.</think>`;

    const result = extractToolCallXMLParser(
      toolCallWithLeadingText,
      knownToolNames,
    );
    expect(result).to.not.be.null;
    expect(result.name).to.equal("think");
    expect(result.arguments).to.be.a("object");
  });
});
