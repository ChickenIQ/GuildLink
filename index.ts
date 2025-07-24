import { getReferencedUsername } from "./lib/discord/utils";
import { HypixelAPIHandler } from "./lib/hypixel/api";
import { getUUID } from "./lib/minecraft/utils";
import { DiscordBot } from "./lib/discord/bot";
import { GuildBot } from "./lib/minecraft/bot";
import safe from "./lib/generic/safe";

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
  const uuid = await getUUID(message.author);
  if (!uuid) return;

  const [err, user] = await safe(hypixelAPI.getDiscordUsername(uuid));
  if (err) return console.error(`Error fetching linked username:`, err);

  return discordBot.sendMessageAsUser(user!, message.content);
});

guildBot.onCommand(["nw", "networth"], async (username, args) => {
  const user = args[0] || username;
  const uuid = await getUUID(user);
  if (!uuid) return;

  const [err, nw] = await safe(hypixelAPI.getNetworth(uuid));
  if (err) return console.error("Error fetching networth:", err);

  return guildBot.sendCommand(`/gc Networth for ${user}: ${nw}`);
});

guildBot.onCommand(["cata", "catacombs"], async (username, args) => {
  const user = args[0] || username;
  const uuid = await getUUID(user);
  if (!uuid) return;

  const [err, cata] = await safe(hypixelAPI.getCatacombsLevel(uuid));
  if (err) return console.error("Error fetching catacombs data:", err);

  return guildBot.sendCommand(`/gc Catacombs Level for ${user}: ${cata}`);
});
