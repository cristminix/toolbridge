import { expect } from "chai";
import { describe, it } from "mocha";
import { extractToolCallXMLParser } from "../../../utils/xmlUtils.js";

describe("HTML in Tool Call Tests", function () {
  const knownToolNames = ["create_file", "insert_edit_into_file", "run_code"];

  it("should handle HTML content within tool call parameters", function () {
    const htmlToolCall = `<create_file>
  <filePath>/path/to/file.html</filePath>
  <content>
    <!DOCTYPE html>
    <html>
      <head>
        <title>Sample Page</title>
      </head>
      <body>
        <div class="container">
          <h1>Hello World</h1>
          <p>This is a paragraph with <strong>bold text</strong> and <em>italics</em>.</p>
        </div>
      </body>
    </html>
  </content>
</create_file>`;

    const result = extractToolCallXMLParser(htmlToolCall, knownToolNames);

    expect(result).to.not.be.null;
    expect(result.name).to.equal("create_file");
    expect(result.arguments).to.have.property("filePath", "/path/to/file.html");
    expect(result.arguments).to.have.property("content");
    expect(result.arguments.content).to.include("<html>");
    expect(result.arguments.content).to.include('<div class="container">');
  });

  it("should handle JavaScript/XML code inside run_code parameters", function () {
    const codeToolCall = `<run_code>
  <language>javascript</language>
  <code>
    const parseXml = (input) => {
      if (input.includes("<tag>") && input.includes("</tag>")) {
        return {
          tag: input.match(/<tag>(.*?)<\\/tag>/)[1]
        };
      }
      return null;
    };
    
    console.log(parseXml("<tag>content</tag>"));
  </code>
</run_code>`;

    const result = extractToolCallXMLParser(codeToolCall, knownToolNames);

    expect(result).to.not.be.null;
    expect(result.name).to.equal("run_code");
    expect(result.arguments).to.have.property("language", "javascript");
    expect(result.arguments).to.have.property("code");
    expect(result.arguments.code).to.include("const parseXml");
    expect(result.arguments.code).to.include("<tag>");
    expect(result.arguments.code).to.include("</tag>");
  });
});
