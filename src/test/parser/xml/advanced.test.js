import assert from "assert";
import { after, describe, it } from "mocha";
import { extractToolCallXMLParser } from "../../../utils/xmlUtils.js";

describe("Advanced XML Tests", function () {
  const _knownToolNames = [
    "insert_edit_into_file",
    "create_file",
    "search",
    "get_files",
    "ls",
  ];

  let passCount = 0;
  let totalTests = 0;

  function testParser(name, content, shouldParse, _expectedToolName = null) {
    it(`should ${shouldParse ? "parse" : "reject"} ${name}`, function () {
      const parsed = extractToolCallXMLParser(content, _knownToolNames);

      if (shouldParse) {
        assert.ok(parsed, `Expected ${name} to parse successfully`);
        passCount++;
      } else {
        assert.ok(!parsed, `Expected ${name} to be rejected`);
        passCount++;
      }

      totalTests++;
    });
  }

  testParser(
    "basic valid XML",
    "<insert_edit_into_file>test</insert_edit_into_file>",
    true,
  );

  after(function () {
    console.log(
      `SUMMARY: ${passCount}/${totalTests} tests passed (${Math.round((passCount / totalTests) * 100)}%)`,
    );
  });
});
