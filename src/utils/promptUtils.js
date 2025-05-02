function formatToolsForBackendPromptXML(tools) {
  if (!tools || tools.length === 0) return "";

  const toolDescriptions = tools
    .map((toolSpec) => {
      if (toolSpec.type !== "function" || !toolSpec.function) return "";

      const { name, description, parameters } = toolSpec.function;
      let result = `Tool Name: ${name}\nDescription: ${
        description || "No description provided"
      }\nParameters:`;

      if (parameters && parameters.properties) {
        const props = parameters.properties;
        const required = parameters.required || [];

        Object.keys(props).forEach((paramName) => {
          const param = props[paramName];
          const paramDesc = param.description || "No description";
          const isRequired = required.includes(paramName);

          result += `\n* ${paramName} (${param.type || "any"}): ${paramDesc}${
            isRequired ? " (required)" : ""
          }`;
        });
      } else {
        result += "\n* No parameters defined";
      }

      return result;
    })
    .join("\n\n");

  const exampleTools = [];

  if (tools && tools.length > 0) {
    const noParamTool = tools.find(
      (t) =>
        !t.function.parameters ||
        !t.function.parameters.properties ||
        Object.keys(t.function.parameters.properties).length === 0,
    );

    const singleParamTool = tools.find(
      (t) =>
        t.function.parameters?.properties &&
        Object.keys(t.function.parameters.properties).length === 1,
    );

    const multiParamTool = tools.find(
      (t) =>
        t.function.parameters?.properties &&
        Object.keys(t.function.parameters.properties).length > 1,
    );

    if (noParamTool) {
      exampleTools.push({
        name: noParamTool.function.name,
        desc: "Tool with no parameters",
        example: `<${noParamTool.function.name}></${noParamTool.function.name}>`,
      });
    }

    if (singleParamTool) {
      const paramName = Object.keys(
        singleParamTool.function.parameters.properties,
      )[0];
      const paramType =
        singleParamTool.function.parameters.properties[paramName].type ||
        "string";
      let paramValue = "example value";

      if (paramType === "number") paramValue = "42";
      else if (paramType === "boolean") paramValue = "true";
      else if (paramName.includes("query"))
        paramValue = "What is the capital of France?";
      else if (paramName.includes("url")) paramValue = "https://example.com";

      exampleTools.push({
        name: singleParamTool.function.name,
        desc: `Tool with a single ${paramType} parameter: '${paramName}'`,
        example: `<${singleParamTool.function.name}>\n  <${paramName}>${paramValue}</${paramName}>\n</${singleParamTool.function.name}>`,
      });
    }

    if (multiParamTool) {
      const params = Object.entries(
        multiParamTool.function.parameters.properties,
      );
      const paramLines = params
        .map(([name, schema]) => {
          const type = schema.type || "string";
          let value = "example";

          if (type === "number") value = "42";
          else if (type === "boolean") value = "true";
          else if (name.includes("date")) value = "2025-05-15";
          else if (name.includes("email")) value = "user@example.com";
          else if (name.includes("url")) value = "https://example.com";
          else if (name.includes("name")) value = "Example Name";

          return `  <${name}>${value}</${name}>`;
        })
        .join("\n");

      exampleTools.push({
        name: multiParamTool.function.name,
        desc: `Tool with ${params.length} parameters of various types`,
        example: `<${multiParamTool.function.name}>\n${paramLines}\n</${multiParamTool.function.name}>`,
      });
    }
  }

  if (exampleTools.length < 2) {
    if (!exampleTools.some((t) => t.desc.includes("no parameters"))) {
      exampleTools.push({
        name: "getCurrentWeather",
        desc: "Generic example: Tool with no parameters",
        example: "<getCurrentWeather></getCurrentWeather>",
      });
    }

    if (!exampleTools.some((t) => t.desc.includes("single"))) {
      exampleTools.push({
        name: "searchWeb",
        desc: "Generic example: Tool with a single string parameter",
        example:
          "<searchWeb>\n  <query>What is the capital of France?</query>\n</searchWeb>",
      });
    }

    if (!exampleTools.some((t) => t.desc.includes("various types"))) {
      exampleTools.push({
        name: "bookFlight",
        desc: "Generic example: Tool with multiple parameters of different types",
        example:
          "<bookFlight>\n  <destination>Tokyo</destination>\n  <departureDate>2025-05-15</departureDate>\n  <returnDate>2025-05-30</returnDate>\n  <passengers>2</passengers>\n  <businessClass>true</businessClass>\n</bookFlight>",
      });
    }
  }

  exampleTools.push({
    name: "createUserProfile",
    desc: "Advanced example: Tool with nested object parameters",
    example:
      "<createUserProfile>\n  <userData>\n    <n>John Doe</n>\n    <email>john.doe@example.com</email>\n    <preferences>\n      <theme>dark</theme>\n      <notifications>true</notifications>\n    </preferences>\n  </userData>\n</createUserProfile>",
  });

  exampleTools.push({
    name: "insert_edit_into_file",
    desc: "Tool with raw HTML content in parameters (never escape HTML and other such tags)",
    example:
      '<insert_edit_into_file>\n  <explanation>Update HTML content</explanation>\n  <filePath>/path/to/file.html</filePath>\n  <code><div class="container">\n  <h1>Raw HTML tags</h1>\n  <p>This content has <b>unescaped</b> HTML tags</p>\n</div></code>\n</insert_edit_into_file>',
  });

  const examplesText = exampleTools
    .map((tool, index) => `Example ${index + 1}: ${tool.desc}\n${tool.example}`)
    .join("\n\n");

  return `# TOOL USAGE INSTRUCTIONS

## Available Tools
You have access to the following tools:

${toolDescriptions}

## Response Format
When using a tool, ONLY output the raw XML for the tool call without any additional text, code blocks, or explanations.

## Examples of Correct Tool Usage
${examplesText}

## Critical Rules
1. ONLY output raw XML when calling a tool - no explanations, backticks, or code blocks
2. Never mention XML format or tools to users - they are internal only
3. Always use the EXACT tool name as specified above - do NOT create new tool names
4. For HTML content in parameters: ALWAYS use raw tags (<div>, <p>, etc.) - NEVER use HTML entities (&lt;div&gt;)

## XML Formatting Requirements
- Root element MUST be the EXACT tool name as listed above
- Each parameter must be a child element
- For arrays: repeat the element name for each value (e.g., '<tags>tag1</tags><tags>tag2</tags>')
- For empty values: use '<param></param>' or self-closing '<param/>'
- For boolean values: use '<param>true</param>' or '<param>false</param>'
- For HTML/code content: include raw HTML tags directly (<div>, <span>, etc.) - never use HTML entities
- For object parameters: use proper nesting of elements
- Ensure every opening tag has a matching closing tag

## When to Use Tools
- When the user's request requires specific capabilities provided by a tool
- When the context or workflow explicitly calls for tool usage
- When you need to perform actions outside your standard capabilities

## Handling Errors
- If a tool call fails, carefully review the error message
- Correct any formatting issues or invalid parameters
- Retry with proper parameters as indicated by the error

Remember that tools are invisible to the user - focus on addressing their needs, not explaining the tools.`;
}

function createToolReminderMessage(tools) {
  if (!tools || tools.length === 0) return "";

  const toolNames = tools
    .filter((t) => t.type === "function" && t.function)
    .map((t) => t.function.name)
    .join(", ");

  return `REMINDER: You have access to these tools: ${toolNames}. 
  
Use ONLY these EXACT tool names with XML format.
Output raw XML only when calling tools - no code blocks or backticks.
For HTML content: ALWAYS use raw tags (<div>) - NEVER use HTML entities (&lt;div&gt;).`;
}

function estimateTokenCount(message) {
  if (!message || !message.content) return 0;

  return Math.ceil(message.content.length / 4);
}

function needsToolReinjection(messages, tokenCount, messageCount) {
  if (!messages || messages.length === 0) return false;

  let msgCount = 0;
  let tokCount = 0;
  let foundSystemMsg = false;

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];

    if (msg.role === "system") {
      foundSystemMsg = true;
      break;
    }

    msgCount++;
    tokCount += estimateTokenCount(msg);
  }

  return !foundSystemMsg || msgCount >= messageCount || tokCount >= tokenCount;
}

export {
  createToolReminderMessage,
  estimateTokenCount,
  formatToolsForBackendPromptXML,
  needsToolReinjection,
};
