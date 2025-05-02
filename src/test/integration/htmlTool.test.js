import assert from "assert";
import { before, describe, it } from "mocha";
import { detectPotentialToolCall } from "../../handlers/toolCallHandler.js";
import { extractToolCallXMLParser } from "../../utils/xmlUtils.js";

const htmlToolContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!-- Comments with < and > characters -->
    <script>
        if (x < 10 && y > 5) {
            console.log("This would break XML validation");
        }
    </script>
    <style>
        body > div {
            color: red;
        }
    </style>
</head>
<body>
    <img src="image.jpg">
    <br>
    <input type="text">
</body>
</html>`;

function createOpenAIDeltaChunk(content) {
  return `data: ${JSON.stringify({
    id: "chatcmpl-123",
    object: "chat.completion.chunk",
    created: Date.now(),
    model: "gpt-4",
    choices: [
      {
        index: 0,
        delta: { content },
        finish_reason: null,
      },
    ],
  })}\n\n`;
}

describe("HTML in Tool Parameters Tests", function () {
  const chunks = [];

  before(function () {
    chunks.push(createOpenAIDeltaChunk("<insert_edit_into_file>\n"));
    chunks.push(
      createOpenAIDeltaChunk(
        "  <explanation>Add HTML content to the file</explanation>\n",
      ),
    );
    chunks.push(
      createOpenAIDeltaChunk("  <filePath>/path/to/file.html</filePath>\n"),
    );
    chunks.push(createOpenAIDeltaChunk("  <code>"));

    const chunkSize = 50;
    for (let i = 0; i < htmlToolContent.length; i += chunkSize) {
      const contentPiece = htmlToolContent.substring(
        i,
        Math.min(i + chunkSize, htmlToolContent.length),
      );
      chunks.push(createOpenAIDeltaChunk(contentPiece));
    }

    chunks.push(createOpenAIDeltaChunk("</code>\n"));
    chunks.push(createOpenAIDeltaChunk("</insert_edit_into_file>"));

    chunks.push("data: [DONE]\n\n");
  });

  describe("XML Parser with HTML in tool", function () {
    it("should correctly parse XML with HTML content", async function () {
      let completeXml = "<insert_edit_into_file>\n";
      completeXml +=
        "  <explanation>Add HTML content to the file</explanation>\n";
      completeXml += "  <filePath>/path/to/file.html</filePath>\n";
      completeXml += "  <code>" + htmlToolContent + "</code>\n";
      completeXml += "</insert_edit_into_file>";

      const knownToolNames = ["insert_edit_into_file"];
      const result = extractToolCallXMLParser(completeXml, knownToolNames);

      assert.ok(result, "Result should not be null");
      assert.strictEqual(
        result.name,
        "insert_edit_into_file",
        "Tool name should match",
      );
      assert.ok(
        Object.keys(result.arguments).includes("code"),
        "Arguments should include code",
      );
      assert.ok(
        result.arguments.code.includes("<!DOCTYPE html>"),
        "HTML in code param should be preserved",
      );
      assert.ok(
        result.arguments.code.includes("if (x < 10 && y > 5)"),
        "JS comparison operators should be preserved",
      );
      assert.ok(
        result.arguments.code.includes('<img src="image.jpg">'),
        "Self-closing HTML tags should be preserved",
      );
    });
  });

  describe("Accumulated buffer parsing with HTML in tool", function () {
    it("should correctly process and accumulate XML with HTML content", async function () {
      const knownToolNames = ["insert_edit_into_file"];
      let buffer = "";
      let isComplete = false;
      let isPotential = false;
      let toolCallResult = null;

      for (let i = 0; i < chunks.length - 1; i++) {
        const chunk = chunks[i];
        const match = chunk.match(/data: (.*)\n\n/);
        if (match && match[1]) {
          try {
            const data = JSON.parse(match[1]);
            const contentDelta = data.choices?.[0]?.delta?.content;
            if (contentDelta) {
              buffer += contentDelta;

              const potential = detectPotentialToolCall(buffer, knownToolNames);
              isPotential = potential.isPotential;

              if (potential.isCompletedXml) {
                isComplete = true;
                try {
                  toolCallResult = extractToolCallXMLParser(
                    buffer,
                    knownToolNames,
                  );
                  break;
                } catch (_err) {
                  console.log(
                    "Expected parse error during test:",
                    _err.message,
                  );
                }
              }
            }
          } catch (_err) {
            console.log("Error during HTML tool test:", _err.message);
          }
        }
      }

      assert.ok(buffer.length > 0, "Buffer should accumulate content");
      assert.ok(isPotential, "Should detect potential tool call");
      assert.ok(isComplete, "Should detect completed XML");
      assert.ok(toolCallResult, "Should successfully parse tool call");
      assert.strictEqual(
        toolCallResult.name,
        "insert_edit_into_file",
        "Tool name should match",
      );
      assert.ok(
        Object.keys(toolCallResult.arguments).includes("code"),
        "Arguments should include code",
      );
      assert.ok(
        toolCallResult.arguments.code.includes("<!DOCTYPE html>"),
        "HTML content should be preserved",
      );
      assert.ok(
        toolCallResult.arguments.code.includes("if (x < 10 && y > 5)"),
        "JS comparison operators should be preserved",
      );
    });
  });
});
