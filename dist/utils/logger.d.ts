import pino from "pino";
/**
 * Root pino logger instance.
 */
export declare const logger: pino.Logger<never, boolean>;
/**
 * Creates a child logger tagged with a module name.
 * @param moduleName Name of the module or subsystem
 */
export declare function createModuleLogger(moduleName: string): pino.Logger<never, boolean>;
export default logger;
