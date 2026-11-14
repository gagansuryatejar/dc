/**
 * Heart Voice Reward Shop & Economy Engine for NEXUS AI.
 * Allows members to redeem coins earned from voice participation for exclusive titles,
 * badges, and profile decorations.
 */
export type ShopCategory = "title" | "badge" | "decoration";
export interface ShopItem {
    id: string;
    name: string;
    category: ShopCategory;
    price: number;
    description: string;
    emoji: string;
}
export declare const SHOP_CATALOG: ShopItem[];
export declare class HeartShopService {
    /**
     * Retrieves the full reward shop catalog.
     */
    getCatalog(): ShopItem[];
    /**
     * Find item by ID.
     */
    getItemById(itemId: string): ShopItem | undefined;
    /**
     * Purchases an item from the reward shop using member coins.
     */
    purchaseItem(guildId: string, userId: string, username: string, itemId: string): Promise<{
        success: boolean;
        message: string;
        remainingCoins?: number;
        item?: ShopItem;
    }>;
    /**
     * Equips a title owned by the member.
     */
    equipTitle(guildId: string, userId: string, titleName: string): Promise<boolean>;
}
export declare const heartShopService: HeartShopService;
