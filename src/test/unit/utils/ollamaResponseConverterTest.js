import { expect } from "chai";
import { describe, it } from "mocha";
import { convertOllamaResponseToOllama } from "../../../utils/format/ollama/responseConverter.js";

describe("Ollama response conversion", function () {
  it("should add ToolCalls to template if not already present", function () {
    const ollamaResponse = {
      model: "llama2",
      template: "{{system}}\n{{user}}\n{{assistant}}",
      response: "Hello, I'm an AI assistant.",
    };

    const converted = convertOllamaResponseToOllama(ollamaResponse);

    expect(converted.template).to.include("ToolCalls");
    expect(converted.template).to.equal(
      "{{system}}\n{{user}}\n{{assistant}} ToolCalls",
    );
  });

  it("should not modify template if ToolCalls is already present", function () {
    const ollamaResponse = {
      model: "llama2",
      template: "{{system}}\n{{user}}\n{{assistant}} ToolCalls",
      response: "Hello, I'm an AI assistant.",
    };

    const converted = convertOllamaResponseToOllama(ollamaResponse);

    expect(converted.template).to.equal(
      "{{system}}\n{{user}}\n{{assistant}} ToolCalls",
    );
  });

  it("should handle responses without a template property", function () {
    const ollamaResponse = {
      model: "llama2",
      response: "Hello, I'm an AI assistant.",
    };

    const converted = convertOllamaResponseToOllama(ollamaResponse);

    expect(converted).to.deep.equal(ollamaResponse);
  });

  it("should add template with ToolCalls when response has tool calls but no template", function () {
    const ollamaResponse = {
      model: "llama2",
      tool_calls: [{ function: { name: "search", arguments: {} } }],
      response: "",
    };

    const converted = convertOllamaResponseToOllama(ollamaResponse);

    expect(converted.template).to.equal(
      "{{system}}\n{{user}}\n{{assistant}} ToolCalls",
    );
  });

  it("should add template with ToolCalls when response might have XML tool calls", function () {
    const ollamaResponse = {
      model: "llama2",
      response:
        "Let me search for information <search><query>AI assistants</query></search>",
    };

    const converted = convertOllamaResponseToOllama(ollamaResponse);

    expect(converted.template).to.equal(
      "{{system}}\n{{user}}\n{{assistant}} ToolCalls",
    );
  });
});
