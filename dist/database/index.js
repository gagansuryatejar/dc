export { prisma, connectDatabase, disconnectDatabase } from "./client.js";
import { GuildRepository } from "./repositories/guild.repository.js";
import { MemberRepository } from "./repositories/member.repository.js";
import { AuditRepository } from "./repositories/audit.repository.js";
import { ModuleConfigRepository } from "./repositories/module-config.repository.js";
// Export repository classes
export { GuildRepository } from "./repositories/guild.repository.js";
export { MemberRepository } from "./repositories/member.repository.js";
export { AuditRepository } from "./repositories/audit.repository.js";
export { ModuleConfigRepository } from "./repositories/module-config.repository.js";
// Singleton repository instances
export const guildRepository = new GuildRepository();
export const memberRepository = new MemberRepository();
export const auditRepository = new AuditRepository();
export const moduleConfigRepository = new ModuleConfigRepository();
//# sourceMappingURL=index.js.map