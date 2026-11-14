/**
 * Module loader for NEXUS AI.
 * Discovers, loads, registers commands & events, and manages lifecycle of all NexusModule instances.
 */
import { Collection } from "discord.js";
import { commandHandler } from "./commandHandler.js";
import logger from "../logger/index.js";
export class ModuleLoader {
    /** All loaded modules keyed by name. */
    modules = new Collection();
    /** Map of active event listeners per module for clean unloading. */
    eventListeners = new Map();
    client;
    /**
     * Bind the Discord client instance to the module loader.
     */
    setClient(client) {
        this.client = client;
    }
    /**
     * Register and load a module, binding commands and event listeners.
     */
    async load(mod) {
        this.modules.set(mod.name, mod);
        // 1. Register module commands
        for (const cmd of mod.commands) {
            commandHandler.register(cmd);
        }
        // 2. Register module events if client is available
        if (this.client) {
            this.attachEvents(mod);
        }
        await mod.onLoad();
        logger.info(`Module loaded: ${mod.name} v${mod.version} (${mod.commands.length} commands, ${mod.events.length} events)`);
    }
    /**
     * Attach a module's events to the Discord client.
     */
    attachEvents(mod) {
        if (!this.client)
            return;
        const listeners = [];
        for (const event of mod.events) {
            const listener = (...args) => {
                try {
                    event.execute(...args);
                }
                catch (err) {
                    logger.error({ err, event: event.name, module: mod.name }, "Error in module event listener");
                }
            };
            if (event.once) {
                this.client.once(event.name, listener);
            }
            else {
                this.client.on(event.name, listener);
            }
            listeners.push({ name: event.name, handler: listener });
        }
        this.eventListeners.set(mod.name, listeners);
    }
    /**
     * Attach events for all currently loaded modules (called after client initialization).
     */
    attachAllEvents(client) {
        this.client = client;
        for (const mod of this.modules.values()) {
            if (!this.eventListeners.has(mod.name)) {
                this.attachEvents(mod);
            }
        }
    }
    /**
     * Unload a module, detaching listeners and clearing commands.
     */
    async unload(name) {
        const mod = this.modules.get(name);
        if (!mod)
            return;
        // Detach event listeners
        const listeners = this.eventListeners.get(name);
        if (listeners && this.client) {
            for (const { name: evtName, handler } of listeners) {
                this.client.removeListener(evtName, handler);
            }
            this.eventListeners.delete(name);
        }
        await mod.onUnload();
        this.modules.delete(name);
        logger.info(`Module unloaded: ${name}`);
    }
    /**
     * Get a module by name.
     */
    get(name) {
        return this.modules.get(name);
    }
    /**
     * Get all loaded modules.
     */
    getAll() {
        return Array.from(this.modules.values());
    }
    /**
     * Get the count of loaded modules.
     */
    get size() {
        return this.modules.size;
    }
}
/** Singleton module loader instance. */
export const moduleLoader = new ModuleLoader();
export default moduleLoader;
//# sourceMappingURL=moduleLoader.js.map