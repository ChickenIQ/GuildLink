import { ChatMessage } from "prismarine-chat";
import mineflayer from "mineflayer";

export interface GuildMessage {
  author: string;
  content: string;
  message: ChatMessage;
}

const guildExpr = /^Guild > (?:\[[^\]]+\] )?(\S+)(?: \[[^\]]+\])?: (.+)$/;

export class GuildBot {
  private client: mineflayer.Bot;

  private onGuildMessage(callback: (message: GuildMessage) => void) {
    this.client.on("message", (message: ChatMessage) => {
      const match = message.toString().match(guildExpr);
      if (!match || !match[1] || !match[2]) return;
      if (match[1] === this.client.username) return;

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

  onCommand(
    aliases: string[],
    callback: (username: string, args: string[]) => void
  ) {
    this.onGuildMessage((message) => {
      if (!message.content.startsWith("!")) return;
      const parts = message.content.split(" ");
      if (!parts[0]) return;

      const command = parts[0].substring(1).toLowerCase();
      if (!aliases.includes(command)) return;

      return callback(message.author, parts.slice(1));
    });
  }

  onMessage(callback: (message: GuildMessage) => void) {
    this.onGuildMessage((message) => {
      if (message.content.startsWith("!")) return;
      return callback({
        author: message.author,
        content: message.content,
        message: message.message,
      });
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
