import fs from "fs";
import Mocha from "mocha";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testDir = path.resolve(__dirname, "..");

const mocha = new Mocha({
  timeout: 10000,
  reporter: "spec",
});

const testPatterns = [
  "unit/handlers/toolCallHandler.test.js",
  "unit/utils/partialToolExtraction.test.js",
  "unit/utils/xmlUtils.test.js",

  "integration/toolCallStreaming.test.js",
  "integration/htmlTool.test.js",

  "parser/tool-calls/edgeCases.test.js",
  "parser/tool-calls/regression.test.js",
];

testPatterns.forEach((pattern) => {
  const fullPath = path.join(testDir, pattern);
  if (fs.existsSync(fullPath)) {
    mocha.addFile(fullPath);
    console.log(`Added test file: ${pattern}`);
  } else {
    console.warn(`Warning: Test file not found: ${pattern}`);
  }
});

console.log("Running tool call tests...");
mocha.run((failures) => {
  process.exitCode = failures ? 1 : 0;
});
