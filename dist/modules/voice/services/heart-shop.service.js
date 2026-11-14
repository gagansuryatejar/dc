/**
 * Heart Voice Reward Shop & Economy Engine for NEXUS AI.
 * Allows members to redeem coins earned from voice participation for exclusive titles,
 * badges, and profile decorations.
 */
import { prisma, memberRepository } from "../../../database/index.js";
import { heartConfigService } from "./heart-config.service.js";
import { createModuleLogger } from "../../../utils/logger.js";
const logger = createModuleLogger("voice:heart-shop");
export const SHOP_CATALOG = [
    // ── TITLES ──────────────────────────────────────────────
    {
        id: "title_voice_royalty",
        name: "Voice Royalty",
        category: "title",
        price: 500,
        description: "Reign supreme in every voice conversation.",
        emoji: "👑",
    },
    {
        id: "title_midnight_chiller",
        name: "Midnight Chiller",
        category: "title",
        price: 350,
        description: "Late night voice sessions are your home.",
        emoji: "🌙",
    },
    {
        id: "title_community_sweetheart",
        name: "Community Sweetheart",
        category: "title",
        price: 400,
        description: "Brings warmth, care, and sweetness to every call.",
        emoji: "❤️",
    },
    {
        id: "title_lofi_guru",
        name: "Lofi Guru",
        category: "title",
        price: 300,
        description: "Always relaxed with chill lofi vibes.",
        emoji: "🎧",
    },
    {
        id: "title_server_heartbeat",
        name: "Server Heartbeat",
        category: "title",
        price: 750,
        description: "The vital, energetic pulse of our community.",
        emoji: "💓",
    },
    // ── BADGES ─────────────────────────────────────────────
    {
        id: "badge_sweet_companion",
        name: "Sweet Companion",
        category: "badge",
        price: 250,
        description: "Recognized as a remarkably sweet companion.",
        emoji: "🌸",
    },
    {
        id: "badge_heart_streak7",
        name: "7-Day Voice Master",
        category: "badge",
        price: 600,
        description: "Awarded for dedicated 7-day voice attendance.",
        emoji: "🔥",
    },
    {
        id: "badge_heart_legend",
        name: "Legendary Friend",
        category: "badge",
        price: 1500,
        description: "The highest badge of voice community friendship.",
        emoji: "👑",
    },
    // ── PROFILE DECORATIONS ────────────────────────────────
    {
        id: "deco_cherry_blossom",
        name: "Cherry Blossom Aura",
        category: "decoration",
        price: 350,
        description: "Adorns your profile with falling cherry blossom petals.",
        emoji: "🌸",
    },
    {
        id: "deco_starlight_glow",
        name: "Starlight Glow",
        category: "decoration",
        price: 400,
        description: "Surrounds your profile with twinkling star magic.",
        emoji: "✨",
    },
    {
        id: "deco_golden_crown",
        name: "Golden Crown",
        category: "decoration",
        price: 600,
        description: "A prestigious royal golden crown on your cards.",
        emoji: "👑",
    },
    {
        id: "deco_neon_heart",
        name: "Neon Heart",
        category: "decoration",
        price: 500,
        description: "A pulsating neon heart badge decoration.",
        emoji: "💖",
    },
];
export class HeartShopService {
    /**
     * Retrieves the full reward shop catalog.
     */
    getCatalog() {
        return [...SHOP_CATALOG];
    }
    /**
     * Find item by ID.
     */
    getItemById(itemId) {
        return SHOP_CATALOG.find((i) => i.id === itemId);
    }
    /**
     * Purchases an item from the reward shop using member coins.
     */
    async purchaseItem(guildId, userId, username, itemId) {
        const item = this.getItemById(itemId);
        if (!item) {
            return { success: false, message: `Item \`${itemId}\` was not found in the Heart Reward Shop.` };
        }
        // Check if already claimed / owned
        const existing = await prisma.heartReward.findFirst({
            where: {
                guildId,
                userId,
                milestone: item.id,
            },
        });
        if (existing) {
            return {
                success: false,
                message: `You already own **${item.name}**! Use \`/heart profile\` or \`/heart settings\` to equip it.`,
            };
        }
        const member = await memberRepository.findOrCreate(guildId, userId, username);
        if (member.coins < item.price) {
            return {
                success: false,
                message: `Insufficient coins! **${item.name}** costs **${item.price} coins**, but you currently have **${member.coins} coins**. Participate more in voice channels to earn coins!`,
            };
        }
        // Deduct coins & apply purchase
        const newCoins = member.coins - item.price;
        await prisma.guildMember.update({
            where: { guildId_userId: { guildId, userId } },
            data: { coins: newCoins },
        });
        // Record purchase receipt in HeartReward table
        await prisma.heartReward.create({
            data: {
                guildId,
                userId,
                milestone: item.id,
                rewardType: "shop_purchase",
                rewardValue: item.name,
                coinsAwarded: -item.price,
            },
        });
        // Automatically equip or add to inventory
        const userPrefs = await heartConfigService.getUserPreferences(guildId, userId);
        if (item.category === "title") {
            await heartConfigService.updateUserPreferences(guildId, userId, { activeTitle: item.name });
        }
        else if (item.category === "decoration") {
            const decorations = [...userPrefs.decorations];
            if (!decorations.includes(item.name))
                decorations.push(item.name);
            await heartConfigService.updateUserPreferences(guildId, userId, { decorations });
        }
        else if (item.category === "badge") {
            const badges = JSON.parse(member.badges || "[]");
            if (!badges.includes(item.id))
                badges.push(item.id);
            await prisma.guildMember.update({
                where: { guildId_userId: { guildId, userId } },
                data: { badges: JSON.stringify(badges) },
            });
        }
        logger.info({ guildId, userId, itemId: item.id, price: item.price }, "Member purchased shop item");
        return {
            success: true,
            message: `🎉 Successfully purchased and equipped **${item.name}** for **${item.price} coins**!`,
            remainingCoins: newCoins,
            item,
        };
    }
    /**
     * Equips a title owned by the member.
     */
    async equipTitle(guildId, userId, titleName) {
        await heartConfigService.updateUserPreferences(guildId, userId, { activeTitle: titleName });
        return true;
    }
}
export const heartShopService = new HeartShopService();
//# sourceMappingURL=heart-shop.service.js.map