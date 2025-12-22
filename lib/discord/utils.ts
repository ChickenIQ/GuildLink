import { Message } from "discord.js";

export const getMessageUsername = (message: Message) => {
  return message.member?.nickname || message.author.displayName || message.author.username;
};

export const getReferencedUsername = async (message: Message) => {
  const ref = message.reference?.messageId;
  if (!ref) return null;

  const msg = await message.channel.messages.fetch(ref);
  return getMessageUsername(msg);
};

export const parseMessageContent = (message: Message) => {
  message.mentions.members?.forEach((member) => {
    const nickname = member.nickname || member.displayName;

    message.content = message.content.replace(`<@${member.id}>`, `@${nickname}`);
  });

  return message.content;
};
