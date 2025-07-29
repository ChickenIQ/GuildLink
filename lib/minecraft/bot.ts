import { ChatMessage } from "prismarine-chat";
import mineflayer from "mineflayer";
import { safe } from "../generic/safe";

export type GuildMessage = {
  author: string;
  content: string;
  message: ChatMessage;
};

const guildExpr = /^Guild > (?:\[[^\]]+\] )?(\S+)(?: \[[^\]]+\])?: (.+)$/;

export class GuildBot {
  private client: mineflayer.Bot;

  private onGuildMessage(callback: (message: GuildMessage) => void) {
    this.client.on("message", (message: ChatMessage) => {
      const match = message.toString().match(guildExpr);
      if (!match || !match[1] || !match[2]) return;

      return callback({
        author: match[1],
        content: match[2],
        message: message,
      });
    });
  }

  constructor(username: string) {
    this.client = mineflayer.createBot({
      profilesFolder: "/app/state",
      host: "mc.hypixel.net.",
      username: username,
      auth: "microsoft",
      version: "1.8.9",
    });

    this.client.once("spawn", () => {
      console.log("Minecraft Bot ready!");
    });

    this.client.on("error", (err) => {
      console.error("Minecraft Bot error:", err);
      process.exit(1);
    });

    this.client.on("end", () => {
      console.error("Minecraft Bot disconnected, exiting...");
      process.exit(1);
    });
  }

  registerCommand(
    aliases: string[],
    callback: (username: string, args: string[]) => Promise<string>
  ) {
    this.onGuildMessage(async (message) => {
      if (!message.content.startsWith("!")) return;
      const args = message.content.split(" ");
      if (!args[0]) return;

      const command = args[0].substring(1).toLowerCase();
      if (!aliases.includes(command)) return;

      const [result, err] = await safe(callback(message.author, args.slice(1)));
      if (err) return console.error("Error in command callback:", err);

      return this.sendCommand(`/gc ${result}`);
    });
  }

  onMessage(callback: (message: GuildMessage) => any) {
    this.onGuildMessage(async (message) => {
      const messageData: GuildMessage = {
        author: message.author,
        content: message.content,
        message: message.message,
      };

      const [_, err] = await safe(callback(messageData));
      if (err) return console.error("Error in command callback:", err);
    });
  }

  sendMessageAsUser(author: string, content: string) {
    if (content.length < 1) return;
    return this.sendCommand(`/gc ${author}: ${content.replace(/\n/g, " ")}`);
  }

  sendCommand(command: string) {
    if (command.length > 256) return;
    return this.client.chat(command);
  }

  getClient = () => this.client;
}
