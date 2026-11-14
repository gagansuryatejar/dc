/**
 * Module loader for NEXUS AI.
 * Discovers, loads, registers commands & events, and manages lifecycle of all NexusModule instances.
 */
import { Collection, type Client } from "discord.js";
import type { NexusModule } from "../types/index.js";
import type { ModuleName } from "../config/features.js";
export declare class ModuleLoader {
    /** All loaded modules keyed by name. */
    readonly modules: Collection<ModuleName, NexusModule>;
    /** Map of active event listeners per module for clean unloading. */
    private readonly eventListeners;
    private client?;
    /**
     * Bind the Discord client instance to the module loader.
     */
    setClient(client: Client): void;
    /**
     * Register and load a module, binding commands and event listeners.
     */
    load(mod: NexusModule): Promise<void>;
    /**
     * Attach a module's events to the Discord client.
     */
    private attachEvents;
    /**
     * Attach events for all currently loaded modules (called after client initialization).
     */
    attachAllEvents(client: Client): void;
    /**
     * Unload a module, detaching listeners and clearing commands.
     */
    unload(name: ModuleName): Promise<void>;
    /**
     * Get a module by name.
     */
    get(name: ModuleName): NexusModule | undefined;
    /**
     * Get all loaded modules.
     */
    getAll(): NexusModule[];
    /**
     * Get the count of loaded modules.
     */
    get size(): number;
}
/** Singleton module loader instance. */
export declare const moduleLoader: ModuleLoader;
export default moduleLoader;
