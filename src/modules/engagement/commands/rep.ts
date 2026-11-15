/**
 * NEXUS AI — /rep command
 * Give reputation points to another member (24h cooldown per target).
 */

import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
} from "discord.js";
import { memberRepository } from "../../../database/index.js";
import { REP_COOLDOWN_MS } from "../../../utils/constants.js";

// In-memory cooldown tracking (in production, use Redis)
const repCooldowns = new Map<string, number>();

export const data = new SlashCommandBuilder()
  .setName("rep")
  .setDescription("Give a reputation point to another member")
  .addUserOption((option) =>
    option.setName("user").setDescription("Member to give rep to").setRequired(true),
  )
  .addStringOption((option) =>
    option.setName("reason").setDescription("Reason for the rep (optional)").setMaxLength(100),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId!;
  const giverId = interaction.user.id;
  const targetUser = interaction.options.getUser("user", true);
  const reason = interaction.options.getString("reason") || "No reason provided";

  if (targetUser.bot) {
    await interaction.reply({ content: "You cannot give reputation to bots.", flags: 64 });
    return;
  }

  if (targetUser.id === giverId) {
    await interaction.reply({ content: "You cannot give reputation to yourself.", flags: 64 });
    return;
  }

  // Check cooldown
  const cooldownKey = `${guildId}:${giverId}:${targetUser.id}`;
  const now = Date.now();
  const lastGiven = repCooldowns.get(cooldownKey) || 0;

  if (now - lastGiven < REP_COOLDOWN_MS) {
    const remaining = REP_COOLDOWN_MS - (now - lastGiven);
    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    await interaction.reply({
      content: `You can give rep to this user again in ${hours}h ${minutes}m.`,
      flags: 64,
    });
    return;
  }

  // Award reputation
  const targetMember = await memberRepository.findOrCreate({ guildId, userId: targetUser.id, username: targetUser.username });
  const newRep = targetMember.reputation + 1;
  await memberRepository.update(guildId, targetUser.id, { reputation: newRep });

  // Set cooldown
  repCooldowns.set(cooldownKey, now);

  // Also give giver a small XP bonus
  const giverMember = await memberRepository.findOrCreate({ guildId, userId: giverId, username: interaction.user.username });
  await memberRepository.update(guildId, giverId, { xp: giverMember.xp + 5 });

  const embed = new EmbedBuilder()
    .setTitle("🤝 Reputation Given!")
    .setDescription(`${interaction.user} gave a reputation point to ${targetUser}`)
    .setColor(0x00ff00)
    .addFields(
      { name: "Reason", value: reason, inline: false },
      { name: "New Total", value: newRep.toString(), inline: true },
    )
    .setFooter({ text: "NEXUS AI Community" });

  await interaction.reply({ embeds: [embed] });
}