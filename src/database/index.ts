/**
 * NEXUS AI — Database Barrel Export
 * Exports the Prisma client, connection helpers, and all repositories.
 */

export { prisma, connectDatabase, disconnectDatabase, databaseHealth } from "./client.js";
export { guildRepository } from "../repositories/guildRepository.js";
export { memberRepository } from "../repositories/memberRepository.js";
export { moduleConfigRepository } from "../repositories/moduleConfigRepository.js";
export { auditRepository } from "../repositories/auditRepository.js";
