import { DEBUG_MODE } from "../config.js";

import { createLogger } from "./configLogger.js";

const logger = createLogger(DEBUG_MODE);

export default logger;

export const { debug, log, error, warn } = logger;
