import { formatTime, formatNumber } from "./lib/generic/math";
import { getReferencedUsername } from "./lib/discord/utils";
import { HypixelAPIHandler } from "./lib/hypixel/api";
import { getMinecraft } from "./lib/minecraft/utils";
import { DiscordBot } from "./lib/discord/bot";
import { GuildBot } from "./lib/minecraft/bot";

// Fix this later...
if (!process.env.WEBHOOK_URL) throw new Error("$WEBHOOK_URL is not set!");
if (!process.env.CHANNEL_ID) throw new Error("$CHANNEL_ID is not set!");
if (!process.env.GUILD_ID) throw new Error("$GUILD_ID is not set!");
if (!process.env.TOKEN) throw new Error("$TOKEN is not set!");
if (!process.env.USERNAME) throw new Error("$WEBHOOK_URL is not set!");
if (!process.env.API_KEY) throw new Error("$API_KEY is not set!");

const hypixelAPI = new HypixelAPIHandler(process.env.API_KEY);
const guildBot = new GuildBot(process.env.USERNAME);
const discordBot = new DiscordBot({
  webhookURL: process.env.WEBHOOK_URL,
  channelID: process.env.CHANNEL_ID,
  guildID: process.env.GUILD_ID,
  token: process.env.TOKEN,
});

// Discord Message Handler
discordBot.onMessage(async (message) => {
  if (message.message.reference) {
    const referencedName = await getReferencedUsername(message.message);
    message.author = message.author + "➡" + referencedName;
  }

  return guildBot.sendMessageAsUser(message.author, message.content);
});

// Guild Message Handler
guildBot.onMessage(async (message) => {
  return discordBot.sendMessageAsUser({
    content: message.content.replace(/@everyone|@here|<@!?[0-9]+>/g, ""),
    avatarURL: `https://mc-heads.net/avatar/${message.author}/128`,
    author: message.author,
  });
});

// Command Handlers
guildBot.registerCommand(["nw", "networth"], async (username, args) => {
  const mc = await getMinecraft(args[0] || username);
  const nw = await hypixelAPI.getNetworth(mc.uuid);

  return `Networth for ${mc.name}: ${formatNumber(nw)}`;
});

guildBot.registerCommand(["cata", "catacombs"], async (username, args) => {
  const mc = await getMinecraft(args[0] || username);
  const cata = await hypixelAPI.getDungeonsStats(mc.uuid);

  return `Cata Level for ${mc.name}: ${cata.catacombsLevel} (Class: ${cata.selectedClass} Lvl ${cata.selectedClassLevel}, Avg: ${cata.classAverage}) M7 PB: ${cata.M7.formattedPB} (${cata.M7.completions} Runs)`;
});

guildBot.registerCommand(["lvl", "level"], async (username, args) => {
  const mc = await getMinecraft(args[0] || username);
  const level = await hypixelAPI.getSkyBlockLevel(mc.uuid);

  return `Skyblock Level for ${mc.name}: ${level}`;
});

guildBot.registerCommand(["check", "gcheck"], async (username, args) => {
  const mc = await getMinecraft(args[0] || username);

  const stats = await hypixelAPI.getSkyBlockStats(mc.uuid);
  const nwText = formatNumber(stats.networth);

  const output = `Skyblock Level: ${stats.level}, Catacombs Level: ${stats.dungeons.catacombsLevel}, Networth: ${nwText}`;

  if (stats.level < 250 && stats.dungeons.catacombsLevel < 44 && stats.networth < 9_000_000_000) {
    return `${mc.name} does not meet the requirements: ${output}`;
  }

  return `${mc.name} meets the requirements: ${output}`;
});

guildBot.registerCommand(["stats", "stat"], async (username, args) => {
  const mc = await getMinecraft(args[0] || username);
  const stats = await hypixelAPI.getSkyBlockStats(mc.uuid);

  const m7PB = stats.dungeons.M7.formattedPB;
  const M7Comps = stats.dungeons.M7.completions || 0;

  const cataLvl = stats.dungeons.catacombsLevel;
  const classAvg = stats.dungeons.classAverage;
  const nwText = formatNumber(stats.networth);

  return `Stats for ${mc.name}: Level: ${stats.level}, Networth: ${nwText}, Cata Level: ${cataLvl}, Class Average ${classAvg}, M7 PB: ${m7PB} (${M7Comps} Runs)`;
});

guildBot.registerCommand(["help", "commands"], async () => {
  return `Available commands: \`nw\`, \`cata\`, \`lvl\`, \`check\`, \`stats\`, \`help\`. Use \`<command> <username>\` to specify a player.`;
});
