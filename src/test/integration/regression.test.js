import { expect } from "chai";
import { describe, it } from "mocha";
import { detectPotentialToolCall } from "../../handlers/toolCallHandler.js";
import { extractToolCallXMLParser } from "../../utils/xmlUtils.js";

const knownToolNames = [
  "search",
  "run_code",
  "think",
  "replace_string_in_file",
  "insert_edit_into_file",
  "get_errors",
];

describe("Running Regression Tests", function () {
  it("should not detect regular XML tags as potential tool calls", function () {
    const xmlContent = `<custom-tag>
      This is not a tool call
    </custom-tag>`;

    const result = detectPotentialToolCall(xmlContent, knownToolNames);
    expect(result.isPotential).to.be.false;
  });

  it("should extract tool call XML correctly without text duplication", function () {
    const textWithTool = `I'll help you find information about that:

<search>
  <query>regression test query</query>
</search>`;

    const result = extractToolCallXMLParser(textWithTool);

    expect(result).to.not.be.null;
    expect(result.name).to.equal("search");
    expect(result.arguments.query).to.equal("regression test query");
  });

  it("should parse nested XML correctly", function () {
    const nestedXmlContent = `<think>
    <analysis>
      <point>First point</point>
      <point>Second point with <code>some code</code> in it</point>
    </analysis>
    <conclusion>The <em>final</em> conclusion</conclusion>
  </think>`;

    const result = extractToolCallXMLParser(nestedXmlContent);

    expect(result).to.not.be.null;
    expect(result.name).to.equal("think");
    expect(result.arguments.analysis).to.not.be.undefined;
    expect(result.arguments.conclusion).to.be.a("string");
    expect(result.arguments.conclusion).to.include("final");
  });

  it("should reject malformed XML", function () {
    const malformedXml = `<search>
    <query>This query has no closing tag
    <nested>This is nested</nested>
  </search>`;

    const result = extractToolCallXMLParser(malformedXml);
    expect(result).to.be.null;
  });

  it("should reject uppercase tool names", function () {
    const mixedCaseXml = `<THINK>
    This uses uppercase but our tools are defined in lowercase
  </THINK>`;

    const result = detectPotentialToolCall(mixedCaseXml, knownToolNames);
    expect(result.isPotential).to.be.false;
    expect(result.mightBeToolCall).to.be.false;
  });

  it("should handle XML in code blocks", function () {
    const codeBlockXml =
      "```javascript\n<think>This is inside a code block</think>\n```";

    const result = extractToolCallXMLParser(codeBlockXml);
    expect(result).to.not.be.null;
    expect(result.name).to.equal("think");

    if (typeof result.arguments === "string") {
      expect(result.arguments).to.equal("This is inside a code block");
    } else {
      expect(JSON.stringify(result.arguments)).to.include("code block");
    }
  });
});
