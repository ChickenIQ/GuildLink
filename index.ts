import { getReferencedUsername } from "./lib/discord/utils";
import { getMinecraftProfile } from "./lib/minecraft/utils";
import { HypixelAPIHandler } from "./lib/hypixel/api";
import { DiscordBot } from "./lib/discord/bot";
import { GuildBot } from "./lib/minecraft/bot";
import safe from "./lib/generic/safe";
import { numberToHuman } from "./lib/generic/math";

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
  const { uuid } = await getMinecraftProfile(message.author);
  if (!uuid) return;

  const [err, user] = await safe(hypixelAPI.getDiscordUsername(uuid));
  if (err) return console.error(`Error fetching linked username:`, err);

  return discordBot.sendMessageAsUser(user!, message.content);
});

guildBot.onCommand(["nw", "networth"], async (username, args) => {
  const mc = await getMinecraftProfile(args[0] || username);
  if (!mc) return;

  const [err, nw] = await safe(hypixelAPI.getNetworth(mc.uuid));
  if (err) return console.error("Error fetching networth:", err);

  return guildBot.sendCommand(
    `/gc Networth for ${mc.name}: ${numberToHuman(nw)}`
  );
});

guildBot.onCommand(["cata", "catacombs"], async (username, args) => {
  const mc = await getMinecraftProfile(args[0] || username);
  if (!mc) return;

  const [err, cata] = await safe(hypixelAPI.getCatacombsLevel(mc.uuid));
  if (err) return console.error("Error fetching catacombs data:", err);

  return guildBot.sendCommand(
    `/gc Catacombs Level for ${mc.name}: ${cata!.toFixed(2)}`
  );
});

guildBot.onCommand(["lvl", "level"], async (username, args) => {
  const mc = await getMinecraftProfile(args[0] || username);
  if (!mc) return;

  const [err, level] = await safe(hypixelAPI.getSkyblockLevel(mc.uuid));
  if (err) return console.error("Error fetching Skyblock level:", err);

  return guildBot.sendCommand(`/gc Skyblock Level for ${mc.name}: ${level}`);
});

guildBot.onCommand(["check", "checkplayer"], async (_, args) => {
  const mc = await getMinecraftProfile(args[0]!);
  if (!mc) return;

  const cata = await hypixelAPI.getCatacombsLevel(mc.uuid);
  const sb = await hypixelAPI.getSkyblockLevel(mc.uuid);
  const nw = await hypixelAPI.getNetworth(mc.uuid);

  if (!cata || !sb || !nw) return;
  const nwText = numberToHuman(nw);
  const stats = `Skyblock Level: ${sb}, Catacombs Level: ${cata}, Networth: ${nwText}`;

  if (sb < 250 && nw < 9_000_000_000 && cata < 44) {
    return guildBot.sendCommand(
      `/gc ${mc.name} does not meet the requirements: ${stats}`
    );
  }

  return guildBot.sendCommand(
    `/gc ${mc.name} meets the requirements: ${stats}`
  );
});
