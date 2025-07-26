import { getReferencedUsername } from "./lib/discord/utils";
import { getMinecraft } from "./lib/minecraft/utils";
import { HypixelAPIHandler } from "./lib/hypixel/api";
import { numberToHuman } from "./lib/generic/math";
import { DiscordBot } from "./lib/discord/bot";
import { GuildBot } from "./lib/minecraft/bot";
import { isErr } from "./lib/generic/safe";

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

discordBot.onMessage(async (message) => {
  if (message.message.reference) {
    const referencedName = await getReferencedUsername(message.message);
    message.author = message.author + "➡" + referencedName;
  }

  return guildBot.sendMessageAsUser(message.author, message.content);
});

guildBot.onMessage(async (message) => {
  const mc = await getMinecraft(message.author);
  if (isErr(mc)) return mc;

  const user = await hypixelAPI.getDiscordUsername(mc.uuid);
  if (isErr(user)) return user;

  return discordBot.sendMessageAsUser(user, message.content);
});

guildBot.onCommand(["nw", "networth"], async (username, args) => {
  const mc = await getMinecraft(args[0] || username);
  if (isErr(mc)) return mc;

  const nw = await hypixelAPI.getNetworth(mc.uuid);
  if (isErr(nw)) return nw;

  return `Networth for ${mc.name}: ${numberToHuman(nw)}`;
});

guildBot.onCommand(["cata", "catacombs"], async (username, args) => {
  const mc = await getMinecraft(args[0] || username);
  if (isErr(mc)) return mc;

  const cata = await hypixelAPI.getCatacombsLevel(mc.uuid);
  if (isErr(cata)) return cata;

  return `Catacombs Level for ${mc.name}: ${cata!.toFixed(2)}`;
});

guildBot.onCommand(["lvl", "level"], async (username, args) => {
  const mc = await getMinecraft(args[0] || username);
  if (isErr(mc)) return mc;

  const level = await hypixelAPI.getSkyblockLevel(mc.uuid);
  if (isErr(level)) return level;

  return `Skyblock Level for ${mc.name}: ${level}`;
});

guildBot.onCommand(["check", "checkplayer"], async (username, args) => {
  const mc = await getMinecraft(args[0] || username);
  if (isErr(mc)) return mc;

  const cata = await hypixelAPI.getCatacombsLevel(mc.uuid);
  if (isErr(cata)) return cata;

  const sb = await hypixelAPI.getSkyblockLevel(mc.uuid);
  if (isErr(sb)) return sb;

  const nw = await hypixelAPI.getNetworth(mc.uuid);
  if (isErr(nw)) return nw;

  const nwText = numberToHuman(nw);
  const cataText = cata.toFixed(2);
  const stats = `Skyblock Level: ${sb}, Catacombs Level: ${cataText}, Networth: ${nwText}`;

  if (sb < 250 && nw < 9_000_000_000 && cata < 44) {
    return `${mc.name} does not meet the requirements: ${stats}`;
  }

  return `${mc.name} meets the requirements: ${stats}`;
});
