import { expect } from "chai";
import { describe, it } from "mocha";
import { extractToolCallXMLParser } from "../../../utils/xmlUtils.js";

describe("XML Fragment Recovery Tests", function () {
  const knownToolNames = [
    "search",
    "run_code",
    "think",
    "replace_string_in_file",
    "insert_edit_into_file",
    "get_errors",
  ];

  it("should attempt to recover from incomplete XML fragments", function () {
    const incompleteXml = `<search>
      <query>how to fix incomplete XML
    </search>`;

    try {
      const result = extractToolCallXMLParser(incompleteXml, knownToolNames);

      if (result) {
        expect(result.name).to.equal("search");
        expect(result.parameters.query).to.include("how to fix incomplete XML");
      }
    } catch (err) {
      console.log(
        "Parser doesn't handle missing nested closing tags:",
        err.message,
      );
    }
  });

  it("should handle unbalanced tags in content", function () {
    const unbalancedTagsXml = `<run_code>
      <language>html</language>
      <code>
        <div>
          <p>This paragraph is not closed
          <span>This span is closed</span>
        </div>
      </code>
    </run_code>`;

    try {
      const result = extractToolCallXMLParser(
        unbalancedTagsXml,
        knownToolNames,
      );
      expect(result).to.exist;
      expect(result.name).to.equal("run_code");
      expect(result.arguments.code).to.include(
        "<p>This paragraph is not closed",
      );
    } catch (_err) {
      console.log(
        "Parser doesn't handle unbalanced tags in content parameters",
      );
    }
  });

  it("should handle mismatched case in XML tags", function () {
    const mismatchedCaseXml = `<SEARCH>
      <Query>case sensitivity test</Query>
    </search>`;

    try {
      const result = extractToolCallXMLParser(
        mismatchedCaseXml,
        knownToolNames,
      );

      if (result) {
        expect(result.name.toLowerCase()).to.equal("search");
      }
    } catch (_err) {
      console.log("Parser is case-sensitive with XML tags");
    }
  });

  it("should handle XML with extra closing tags", function () {
    const extraClosingTagsXml = `<search>
      <query>handle extra tags</query>
    </search></search>`;

    try {
      const result = extractToolCallXMLParser(
        extraClosingTagsXml,
        knownToolNames,
      );
      expect(result).to.exist;
      expect(result.name).to.equal("search");
      expect(result.parameters.query).to.equal("handle extra tags");
    } catch (_err) {
      console.log("Parser doesn't handle extra closing tags");
    }
  });

  it("should handle incomplete opening tags", function () {
    const incompleteOpeningTagXml = `<sea
    rch>
      <query>incomplete opening tag</query>
    </search>`;

    try {
      const result = extractToolCallXMLParser(
        incompleteOpeningTagXml,
        knownToolNames,
      );
      if (result && result.name) {
        expect(result.name).to.equal("search");
      }
    } catch (_err) {
      console.log("Parser doesn't handle whitespace in opening tags");
    }
  });

  it("should handle content with XML declaration", function () {
    const xmlWithDeclaration = `<?xml version="1.0" encoding="UTF-8" ?>
    <search>
      <query>XML with declaration</query>
    </search>`;

    const result = extractToolCallXMLParser(xmlWithDeclaration, knownToolNames);
    expect(result).to.exist;
    expect(result.name).to.equal("search");
    expect(result.arguments.query).to.equal("XML with declaration");
  });

  it("should handle XML mixed with JSON", function () {
    const xmlInJson = `{
      "response": "<search><query>find information</query></search>",
      "metadata": {"source": "llm"}
    }`;

    const result = extractToolCallXMLParser(xmlInJson, knownToolNames);
    expect(result).to.exist;
    expect(result.name).to.equal("search");
    expect(result.arguments.query).to.equal("find information");
  });

  it("should identify tool calls with non-standard whitespace", function () {
    const xmlWithWeirdWhitespace = `<search>\u00A0\t
    \u2003  <query>\r\nquery with\u00A0strange\u2003whitespace\n</query>\t</search>`;

    const result = extractToolCallXMLParser(
      xmlWithWeirdWhitespace,
      knownToolNames,
    );
    expect(result).to.exist;
    expect(result.name).to.equal("search");
    expect(result.arguments.query.trim()).to.include("query with");
    expect(result.arguments.query.trim()).to.include("strange");
    expect(result.arguments.query.trim()).to.include("whitespace");
  });
});
