import { expect } from "chai";
import { after, describe, it } from "mocha";
import { detectPotentialToolCall } from "../../../handlers/toolCallHandler.js";
import { extractToolCallXMLParser } from "../../../utils/xmlUtils.js";

describe("Partial XML Detection Tests", function () {
  const knownToolNames = [
    "insert_edit_into_file",
    "create_file",
    "search",
    "get_files",
    "ls",
  ];

  let passCount = 0;
  let totalTests = 0;

  after(function () {
    console.log(
      `Partial XML Detection Tests: ${passCount}/${totalTests} passing`,
    );
  });

  function simulateStreaming(chunks) {
    let buffer = "";
    let detected = null;
    let extracted = null;
    let error = null;

    for (const chunk of chunks) {
      buffer += chunk;

      if (!detected || !detected.isPotential) {
        detected = detectPotentialToolCall(buffer, knownToolNames);
      }

      if (
        detected &&
        detected.isPotential &&
        detected.mightBeToolCall &&
        !extracted
      ) {
        try {
          extracted = extractToolCallXMLParser(buffer, knownToolNames);
        } catch (e) {
          error = e;
        }
      }
    }

    return { buffer, detected, extracted, error };
  }

  it("should detect a partial tool call at the beginning", function () {
    totalTests++;

    const content = `<insert_edit_into_file>
  <explanation>Add a function</explanation>
  <filePath>/path/to/file.js</filePath>
  <code>function hello() {
    console.log("Hello");
  }</code>
</insert`;

    const result = detectPotentialToolCall(content, knownToolNames);
    expect(result).to.not.be.null;
    expect(result.isPotential).to.be.true;
    expect(result.mightBeToolCall).to.be.true;
    expect(result.rootTagName).to.equal("insert_edit_into_file");

    try {
      const extracted = extractToolCallXMLParser(content);
      expect(extracted).to.be.null;
    } catch (e) {
      expect(e).to.exist;
    }

    passCount++;
  });

  it("should detect a tool call that arrives in chunks", function () {
    totalTests++;

    const chunks = [
      "<insert_edit_",
      "into_file>\n  <explanation>Update code</explanation>\n",
      "  <filePath>/app.js</filePath>\n  <code>const x = 10;</code>\n",
      "</insert_edit_into_file>",
    ];

    const result = simulateStreaming(chunks);

    expect(result.detected).to.not.be.null;
    expect(result.detected.isPotential).to.be.true;
    expect(result.detected.mightBeToolCall).to.be.true;
    expect(result.detected.rootTagName).to.equal("insert_edit_into_file");
    expect(result.extracted).to.not.be.null;
    expect(result.extracted.name).to.equal("insert_edit_into_file");
    expect(result.extracted.arguments).to.have.property(
      "explanation",
      "Update code",
    );

    passCount++;
  });

  it("should handle partial closing tags", function () {
    totalTests++;

    const content = `<create_file>
  <filePath>/test.txt</filePath>
  <content>Hello world</content>
</create_fi`;

    const result = detectPotentialToolCall(content, knownToolNames);
    expect(result).to.not.be.null;
    expect(result.isPotential).to.be.true;
    expect(result.mightBeToolCall).to.be.true;
    expect(result.rootTagName).to.equal("create_file");

    passCount++;
  });

  it("should not extract from partial XML", function () {
    totalTests++;

    const content = `<search>
  <query>How to implement`;

    const result = detectPotentialToolCall(content, knownToolNames);
    expect(result).to.not.be.null;
    expect(result.isPotential).to.be.true;
    expect(result.mightBeToolCall).to.be.true;
    expect(result.rootTagName).to.equal("search");

    const extracted = extractToolCallXMLParser(content);
    expect(extracted).to.be.null;

    passCount++;
  });

  it("should handle nested tags in partial content", function () {
    totalTests++;

    const content = `<insert_edit_into_file>
  <explanation>Add HTML</explanation>
  <filePath>/index.html</filePath>
  <code>
    <div>
      <h1>Title</h1>
      <p>Content</p>
    </div>
  </cod`;

    const result = detectPotentialToolCall(content, knownToolNames);
    expect(result).to.not.be.null;
    expect(result.isPotential).to.be.true;
    expect(result.mightBeToolCall).to.be.true;
    expect(result.rootTagName).to.equal("insert_edit_into_file");

    passCount++;
  });
});
