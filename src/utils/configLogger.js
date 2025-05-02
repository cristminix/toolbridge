export function debug(debugMode, ...args) {
  if (debugMode) {
    console.log(...args);
  }
}

export function error(...args) {
  console.error(...args);
}

export function warn(...args) {
  console.warn(...args);
}

export function createLogger(debugMode) {
  return {
    debug: (...args) => debug(debugMode, ...args),
    log: (...args) => debug(debugMode, ...args),
    error,
    warn,
  };
}

export default { debug, error, warn, createLogger };
