import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const testFiles = [
  "../streaming/html-with-tool-calls.test.js",
  "../regression/html-buffer-overflow.test.js",
  "../unit/handlers/html-tag-detection.test.js",
  "../unit/utils/buffer-size-limit.test.js",
];

console.log("Running HTML buffer handling tests...");

try {
  for (const file of testFiles) {
    const filePath = path.resolve(__dirname, file);
    console.log(`\n---- Running tests in ${file} ----`);

    try {
      execSync(`npx mocha ${filePath} --experimental-modules`, {
        stdio: "inherit",
      });
      console.log(`✅ Tests passed in ${file}`);
    } catch (_err) {
      console.error(`❌ Tests failed in ${file}`);
      process.exit(1);
    }
  }

  console.log("\n✅ All HTML buffer handling tests passed!");
} catch (error) {
  console.error("Error running tests:", error);
  process.exit(1);
}
