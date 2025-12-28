import { getReferencedUsername } from "./lib/discord/utils";
import { HypixelAPIHandler } from "./lib/hypixel/api";
import { getMinecraft } from "./lib/minecraft/utils";
import { formatNumber } from "./lib/generic/math";
import { DiscordBot } from "./lib/discord/bot";
import { GuildBot } from "./lib/minecraft/bot";

// Fix this later...
if (!process.env.WEBHOOK_URL) throw new Error("$WEBHOOK_URL is not set!");
if (!process.env.CHANNEL_ID) throw new Error("$CHANNEL_ID is not set!");
if (!process.env.USERNAMES) throw new Error("$USERNAMES is not set!");
if (!process.env.GUILD_ID) throw new Error("$GUILD_ID is not set!");
if (!process.env.API_KEY) throw new Error("$API_KEY is not set!");
if (!process.env.TOKEN) throw new Error("$TOKEN is not set!");

const guildBots = process.env.USERNAMES.split(",").map((username) => new GuildBot(username.trim()));
const hypixelAPI = new HypixelAPIHandler(process.env.API_KEY);
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

  return Promise.all(guildBots.map((bot) => bot.sendMessageAsUser(message.author, message.content)));
});

guildBots.forEach((bot) => {
  // Guild to guilds message handler
  bot.onMessage(async (message) => {
    return Promise.all(
      guildBots.map((otherBot) => {
        if (otherBot === bot) return;

        return otherBot.sendMessageAsUser(message.author, message.content);
      })
    );
  });

  // Guild to discord message handler
  bot.onMessage(async (message) => {
    return discordBot.sendMessageAsUser({
      content: message.content.replace(/@everyone|@here|<@!?[0-9]+>/g, ""),
      avatarURL: `https://mc-heads.net/avatar/${message.author}/128`,
      author: message.author,
    });
  });

  // Command Handlers
  bot.registerCommand(["nw", "networth"], async (username, args) => {
    const mc = await getMinecraft(args[0] || username);
    const nw = await hypixelAPI.getNetworth(mc.uuid);

    return `Networth for ${mc.name}: ${formatNumber(nw)}`;
  });

  bot.registerCommand(["cata", "catacombs"], async (username, args) => {
    const mc = await getMinecraft(args[0] || username);
    const cata = await hypixelAPI.getDungeonsStats(mc.uuid);

    return `Cata Level for ${mc.name}: ${cata.catacombsLevel} (Class: ${cata.selectedClass} Lvl ${cata.selectedClassLevel}, Avg: ${cata.classAverage}) M7 PB: ${cata.M7.formattedPB} (${cata.M7.completions} Runs)`;
  });

  bot.registerCommand(["lvl", "level"], async (username, args) => {
    const mc = await getMinecraft(args[0] || username);
    const level = await hypixelAPI.getSkyBlockLevel(mc.uuid);

    return `Skyblock Level for ${mc.name}: ${level}`;
  });

  bot.registerCommand(["check", "gcheck"], async (username, args) => {
    const mc = await getMinecraft(args[0] || username);
    const stats = await hypixelAPI.getSkyBlockStats(mc.uuid);

    const output = `Skyblock Level: ${stats.level}, Catacombs Level: ${stats.dungeons.catacombsLevel}`;
    if (stats.level < 350 && stats.dungeons.catacombsLevel < 47) {
      return `${mc.name} does not meet the requirements: ${output}`;
    }

    return `${mc.name} meets the requirements: ${output}`;
  });

  bot.registerCommand(["stats", "stat"], async (username, args) => {
    const mc = await getMinecraft(args[0] || username);
    const stats = await hypixelAPI.getSkyBlockStats(mc.uuid);
    const networth = formatNumber(await hypixelAPI.getNetworth(mc.uuid));

    const m7PB = stats.dungeons.M7.formattedPB;
    const M7Comps = stats.dungeons.M7.completions || 0;

    const cataLvl = stats.dungeons.catacombsLevel;
    const classAvg = stats.dungeons.classAverage;

    return `Stats for ${mc.name}: Level: ${stats.level}, Networth: ${networth}, Cata Level: ${cataLvl}, Class Average ${classAvg}, M7 PB: ${m7PB} (${M7Comps} Runs)`;
  });

  bot.registerCommand(["help", "commands"], async () => {
    return `Available commands: \`nw\`, \`cata\`, \`lvl\`, \`check\`, \`stats\`, \`help\`. Use \`<command> <username>\` to specify a player.`;
  });
});
