import pino from "pino";
import { config } from "../config/index.js";
/**
 * Root pino logger instance.
 */
export const logger = pino({
    level: config.logLevel,
    transport: config.isDev
        ? {
            target: "pino-pretty",
            options: {
                colorize: true,
                translateTime: "yyyy-mm-dd HH:MM:ss.l",
                ignore: "pid,hostname",
            },
        }
        : undefined,
});
/**
 * Creates a child logger tagged with a module name.
 * @param moduleName Name of the module or subsystem
 */
export function createModuleLogger(moduleName) {
    return logger.child({ module: moduleName });
}
export default logger;
//# sourceMappingURL=logger.js.map