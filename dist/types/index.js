// ── Permission levels ───────────────────────────────────
/**
 * Hierarchical permission tiers used by the command system.
 * Higher numeric values imply broader privileges.
 */
export var PermissionLevel;
(function (PermissionLevel) {
    /** Default level — any server member. */
    PermissionLevel[PermissionLevel["MEMBER"] = 0] = "MEMBER";
    /** Moderators — users with Manage Messages or a mod role. */
    PermissionLevel[PermissionLevel["MODERATOR"] = 1] = "MODERATOR";
    /** Administrators — users with the Administrator permission. */
    PermissionLevel[PermissionLevel["ADMIN"] = 2] = "ADMIN";
    /** Bot owner — the account ID listed in the config. */
    PermissionLevel[PermissionLevel["OWNER"] = 3] = "OWNER";
})(PermissionLevel || (PermissionLevel = {}));
//# sourceMappingURL=index.js.map