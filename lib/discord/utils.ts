import { Message } from "discord.js";

export const getMessageUsername = (message: Message) => {
  return message.member?.nickname || message.author.username;
};

export const getReferencedUsername = async (message: Message) => {
  const referenceId = message.reference?.messageId;
  if (!referenceId) return null;

  const ref = await message.channel.messages.fetch(referenceId);
  if (!ref.author.bot) return getMessageUsername(ref);

  return ref.author.username;
};

export const parseMessageContent = (message: Message) => {
  message.mentions.members?.forEach((member) => {
    const nickname = member.nickname || member.displayName;

    message.content = message.content.replace(`<@${member.id}>`, `@${nickname}`);
  });

  return message.content;
};
