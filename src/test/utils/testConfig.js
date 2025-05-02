import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../../..");

function readEnvFile() {
  try {
    const envPath = path.join(projectRoot, ".env");
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf8");
      const envVariables = {};

      envContent.split("\n").forEach((line) => {
        line = line.trim();

        if (line && !line.startsWith("#") && !line.startsWith("//")) {
          const match = line.match(/^([^=]+)=(.*)$/);
          if (match) {
            const key = match[1].trim();
            let value = match[2].trim();

            if (
              (value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))
            ) {
              value = value.substring(1, value.length - 1);
            }

            envVariables[key] = value;
          }
        }
      });

      return envVariables;
    }
    return {};
  } catch (error) {
    console.error("Error reading .env file:", error);
    return {};
  }
}

const envVars = readEnvFile();

export const TEST_CONFIG = {
  PROXY_PORT: envVars.PROXY_PORT || process.env.PROXY_PORT || 3000,

  PROXY_HOST: envVars.PROXY_HOST || process.env.PROXY_HOST || "localhost",

  MOCK_PORT: parseInt(process.env.TEST_MOCK_PORT, 10) || 3001,

  TEST_MODEL: envVars.TEST_MODEL || process.env.TEST_MODEL || "gpt-3.5-turbo",

  TEST_API_KEY: envVars.TEST_API_KEY || process.env.TEST_API_KEY || "dummy-key",
};

export function getProxyUrl(path = "") {
  const formattedPath = path ? (path.startsWith("/") ? path : `/${path}`) : "";
  return `http://${TEST_CONFIG.PROXY_HOST}:${TEST_CONFIG.PROXY_PORT}${formattedPath}`;
}

export function getMockServerUrl(path = "") {
  const formattedPath = path ? (path.startsWith("/") ? path : `/${path}`) : "";
  return `http://localhost:${TEST_CONFIG.MOCK_PORT}${formattedPath}`;
}

export async function isProxyRunning() {
  try {
    const axios = (await import("axios")).default;
    await axios.get(getProxyUrl());
    return true;
  } catch (error) {
    if (error.code === "ECONNREFUSED") {
      return false;
    }

    return true;
  }
}
