import chalk from "chalk";

export function logRequest(req, routeName) {
  const timestamp = new Date().toISOString();
  const method = formatMethod(req.method);
  const endpoint = chalk.cyan(req.originalUrl);

  console.log(
    `${chalk.blue("➤")} ${chalk.dim(timestamp)} ${method} ${endpoint} ${chalk.yellow(routeName)}`,
  );

  if (
    routeName.includes("CHAT COMPLETIONS") &&
    req.body &&
    req.body.stream === true
  ) {
    console.log(`  ${chalk.dim("stream:")} ${chalk.yellow("enabled")}`);
  }
}

export function logResponse(status, routeName, duration) {
  const statusColor = getStatusColor(status);
  const statusText = statusColor(`${status} ${getStatusText(status)}`);

  let output = `${chalk.blue("⮑")} ${statusText} ${chalk.yellow(routeName)}`;

  if (duration) {
    output += ` ${chalk.dim("in")} ${chalk.magenta(duration + "ms")}`;
  }

  console.log(output);
}

function formatMethod(method) {
  method = method.toUpperCase();

  switch (method) {
    case "GET":
      return chalk.green(method);
    case "POST":
      return chalk.yellow(method);
    case "PUT":
      return chalk.blue(method);
    case "DELETE":
      return chalk.red(method);
    case "PATCH":
      return chalk.cyan(method);
    default:
      return chalk.white(method);
  }
}

function getStatusColor(status) {
  if (status >= 500) return chalk.red;
  if (status >= 400) return chalk.yellow;
  if (status >= 300) return chalk.cyan;
  if (status >= 200) return chalk.green;
  return chalk.white;
}

function getStatusText(status) {
  const statusMap = {
    200: "OK",
    201: "Created",
    204: "No Content",
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    500: "Internal Server Error",
    502: "Bad Gateway",
    503: "Service Unavailable",
  };

  return statusMap[status] || "";
}

export default {
  logRequest,
  logResponse,
};
