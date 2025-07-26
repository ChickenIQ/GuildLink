import { getMessageUsername, parseMessageContent } from "./utils";

import {
  Events,
  Client,
  Message,
  WebhookClient,
  GatewayIntentBits,
} from "discord.js";

const intents = [
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.Guilds,
];

export type DiscordBotConfig = {
  webhookURL: string;
  channelID: string;
  guildID: string;
  token: string;
};

export type DiscordMessage = {
  author: string;
  content: string;
  message: Message;
};

export class DiscordBot {
  private webhookClient: WebhookClient;
  private client: Client;
  private channelID: string;
  private guildID: string;

  constructor({ token, guildID, channelID, webhookURL }: DiscordBotConfig) {
    this.webhookClient = new WebhookClient({ url: webhookURL });
    this.client = new Client({ intents });
    this.channelID = channelID;
    this.guildID = guildID;

    this.client.once(Events.ClientReady, () => {
      console.log("Discord Bot ready!");
    });

    this.client.login(token);
  }

  onMessage = (callback: (message: DiscordMessage) => void) => {
    this.client.on(Events.MessageCreate, (message) => {
      if (message.channel.id !== this.channelID) return;
      if (message.author.bot) return;

      const messageData: DiscordMessage = {
        author: getMessageUsername(message),
        content: parseMessageContent(message),
        message: message,
      };

      return callback(messageData);
    });
  };

  sendMessageAsUser = async (username: string, message: string) => {
    const member = await this.getMember(username);
    if (!member) return;

    const content = message.replace(/@everyone|@here|<@!?[0-9]+>/g, "");
    if (!content) return;

    return await this.webhookClient.send({
      username: member.nickname || member.user.displayName,
      avatarURL: member.user.displayAvatarURL(),
      content: content,
    });
  };

  getMember = async (username: string) => {
    const guild = await this.client.guilds.fetch(this.guildID);
    if (!guild) return;

    return (await guild.members.fetch()).find(
      (member) => member.user.username === username
    );
  };

  getClient = () => this.client;
}
