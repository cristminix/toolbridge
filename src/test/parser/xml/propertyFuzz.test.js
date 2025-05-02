import { expect } from "chai";
import { describe, it } from "mocha";
import { detectPotentialToolCall } from "../../../handlers/toolCallHandler.js";

describe("Property-based/Fuzz Testing for XML Tool Detection", function () {
  const knownToolNames = [
    "search",
    "run_code",
    "think",
    "replace_string_in_file",
    "insert_edit_into_file",
    "get_errors",
  ];

  function randomString(length) {
    const chars =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<>/\"'\n\t &";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  function randomToolXml() {
    const tool =
      knownToolNames[Math.floor(Math.random() * knownToolNames.length)];
    const argCount = Math.floor(Math.random() * 4);
    let args = "";
    for (let i = 0; i < argCount; i++) {
      const key = randomString(3 + Math.floor(Math.random() * 5));
      const val = randomString(5 + Math.floor(Math.random() * 10));
      args += `  <${key}>${val}</${key}>\n`;
    }
    return `<${tool}>\n${args}</${tool}>`;
  }

  it("should handle various random inputs without crashing", function () {
    const iterations = 20;
    let pass = 0;

    for (let i = 0; i < iterations; i++) {
      let xml;
      if (Math.random() < 0.7) {
        xml = randomToolXml();
      } else {
        xml = randomString(20 + Math.floor(Math.random() * 40));
      }

      try {
        const result = detectPotentialToolCall(xml, knownToolNames);

        if (result && !result.isPotential) {
          pass++;
        } else if (
          typeof result === "object" &&
          result.isPotential === true &&
          result.mightBeToolCall === true &&
          typeof result.rootTagName === "string" &&
          knownToolNames.includes(result.rootTagName)
        ) {
          pass++;
        }

        expect(true).to.be.true;
      } catch (error) {
        expect.fail(`Fuzz test threw exception: ${error.message}`);
      }
    }

    expect(pass).to.be.at.least(iterations * 0.9);
  });

  it("should correctly identify valid tool calls", function () {
    for (let i = 0; i < 10; i++) {
      const xml = randomToolXml();
      const result = detectPotentialToolCall(xml, knownToolNames);

      expect(result).to.not.be.null;
      expect(result.isPotential).to.be.true;
      expect(result.mightBeToolCall).to.be.true;
      expect(knownToolNames).to.include(result.rootTagName);
    }
  });
});
