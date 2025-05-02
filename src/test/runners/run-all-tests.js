import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const testDir = path.join(process.cwd(), "src", "test");
const mochaPath = path.join(process.cwd(), "node_modules", ".bin", "mocha");

const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: [],
  categories: {},
};

const testCategories = {
  "XML Core": "parser/xml",
  "Edge Cases": "parser/edge-cases",
  "HTML Tests": "parser/html",
  "LLM Patterns": "parser/llm-patterns",
  Streaming: "streaming",
  Integration: "integration",
  "Unit Tests": "unit/utils",
};

console.log("=== XML Tool Parsing Test Suite ===");
console.log("Running all test files to verify parsing robustness\\n");

Object.keys(testCategories).forEach((category) => {
  testResults.categories[category] = {
    total: 0,
    passed: 0,
    failed: 0,
    tests: [],
  };
});

function discoverTestFiles(directory) {
  const fullPath = path.join(testDir, directory);
  if (!fs.existsSync(fullPath)) {
    return [];
  }

  const files = fs.readdirSync(fullPath);
  return files
    .filter((file) => file.endsWith(".test.js"))
    .map((file) => path.join(directory, file));
}

for (const [category, directory] of Object.entries(testCategories)) {
  console.log(`\\n=== Running ${category} Tests ===`);

  const testFiles = discoverTestFiles(directory);
  if (testFiles.length === 0) {
    console.log(`  No test files found in ${directory}`);
    continue;
  }

  console.log(`  Found ${testFiles.length} test file(s)`);

  for (const relativeFilePath of testFiles) {
    const filePath = path.join(testDir, relativeFilePath);
    const displayPath = relativeFilePath;

    console.log(`  Running test: ${displayPath}...`);
    try {
      const command = `${mochaPath} ${filePath}`;

      const output = execSync(command, { encoding: "utf-8", stdio: "pipe" });

      let passingMatch = output.match(/(\d+)\s+passing/);
      let failingMatch = output.match(/(\d+)\s+failing/);

      console.log(
        `    Raw Mocha output: ${passingMatch ? passingMatch[0] : "no passing match"}, ${failingMatch ? failingMatch[0] : "no failing match"}`,
      );

      const passed = passingMatch ? parseInt(passingMatch[1], 10) : 0;
      const failed = failingMatch ? parseInt(failingMatch[1], 10) : 0;
      const total = passed + failed;

      if (total > 0) {
        testResults.total += total;
        testResults.passed += passed;
        testResults.failed += failed;

        testResults.categories[category].total += total;
        testResults.categories[category].passed += passed;
        testResults.categories[category].failed += failed;

        const passingPercentage = Math.round((passed / total) * 100);

        const testResult = {
          file: displayPath,
          passed,
          failed,
          total,
          percentage: passingPercentage,
        };

        testResults.tests.push(testResult);
        testResults.categories[category].tests.push(testResult);

        if (failed > 0) {
          console.log(
            `    ❌ ${failed} failed, ${passed} passed (${total} total)`,
          );
        } else {
          console.log(`    ✅ ${passed} passed (${total} total)`);
        }
      } else if (output.includes("0 passing")) {
        console.log(`    ⚠️ Mocha ran, but no passing tests reported.`);
        const testResult = {
          file: displayPath,
          error: true,
          errorMessage: "Mocha ran but no passing tests reported.",
        };
        testResults.tests.push(testResult);
        testResults.categories[category].tests.push(testResult);
      } else {
        console.log(
          `    ⚠️ Could not parse Mocha results from output for ${displayPath}`,
        );

        const testResult = {
          file: displayPath,
          error: true,
          errorMessage: "Could not parse Mocha results.",
        };
        testResults.tests.push(testResult);
        testResults.categories[category].tests.push(testResult);
      }
    } catch (error) {
      const output = error.stdout || error.message;
      let failingMatch = output.match(/(\\d+)\\s+failing/);
      const failed = failingMatch ? parseInt(failingMatch[1], 10) : 1;

      console.error(
        `    ❌ Error running test file ${displayPath}: ${failed} failing`,
      );

      let passingMatch = output.match(/(\\d+)\\s+passing/);
      const passed = passingMatch ? parseInt(passingMatch[1], 10) : 0;
      const total = passed + failed;

      if (total > 0) {
        testResults.total += total;
        testResults.passed += passed;
        testResults.failed += failed;
        testResults.categories[category].total += total;
        testResults.categories[category].passed += passed;
        testResults.categories[category].failed += failed;
      } else {
        testResults.failed += 1;
        testResults.categories[category].failed += 1;
      }

      const testResult = {
        file: displayPath,
        error: true,
        errorMessage: `Mocha execution failed (${failed} failing)`,
        passed: passed,
        failed: failed,
        total: total > 0 ? total : undefined,
      };

      testResults.tests.push(testResult);
      testResults.categories[category].tests.push(testResult);
    }
  }
}

console.log("\\n=== Test Results Summary ===");

let finalTotal = 0;
let finalPassed = 0;
let finalFailed = 0;
Object.values(testResults.categories).forEach((cat) => {
  finalTotal += cat.total;
  finalPassed += cat.passed;
  finalFailed += cat.failed;
});

const fileErrors = testResults.tests.filter(
  (t) => t.error && t.total === undefined,
).length;
finalFailed += fileErrors;

console.log(
  `Total tests run (approx): ${finalTotal || testResults.tests.length}`,
);
console.log(`Passed: ${finalPassed}`);
console.log(`Failed: ${finalFailed}`);

const overallPercentage =
  finalTotal > 0 ? Math.round((finalPassed / finalTotal) * 100) : 0;

console.log(`Overall passing rate: ${overallPercentage}%`);

console.log("\\n=== Results by Category ===");
for (const [category, results] of Object.entries(testResults.categories)) {
  if (results.total === 0 && results.tests.every((t) => t.total === undefined))
    continue;

  const categoryPercentage =
    results.total > 0 ? Math.round((results.passed / results.total) * 100) : 0;
  const icon =
    results.failed === 0 && results.tests.every((t) => !t.error)
      ? "✅"
      : results.failed > 0 || results.tests.some((t) => t.error)
        ? "❌"
        : "⚠️";

  console.log(
    `${icon} ${category}: ${categoryPercentage}% passed (${results.passed}/${results.total || "?"}) - ${results.failed} failed`,
  );
}

console.log("\\n=== Failures and Errors ===");
let failuresReported = false;
for (const result of testResults.tests) {
  if (result.failed > 0 || result.error) {
    failuresReported = true;
    if (result.error) {
      console.log(`❌ ${result.file}: ERROR - ${result.errorMessage}`);
    } else {
      console.log(
        `❌ ${result.file}: ${result.failed} failed, ${result.passed} passed (${result.total})`,
      );
    }
  }
}
if (!failuresReported) {
  console.log("  No failures or errors reported.");
}

process.exit(finalFailed > 0 ? 1 : 0);
