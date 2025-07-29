import { safe } from "../generic/safe";
import cache from "memory-cache";

export type MinecraftProfile = {
  name: string;
  uuid: string;
};

export const getMinecraft = async (
  username: string
): Promise<MinecraftProfile> => {
  let data = cache.get(`mc:${username}`);
  if (data) return data;

  const res = await fetch(
    `https://api.mojang.com/users/profiles/minecraft/${username}`
  );

  if (!res.ok) {
    throw new Error(
      `Failed to fetch UUID for ${username} (${res.status}): ${res.statusText}`
    );
  }

  data = await res.json();
  if (!data || !data.id || !data.name) {
    throw new Error(`Invalid UUID response for username: ${username}`);
  }

  const profile: MinecraftProfile = {
    name: data.name,
    uuid: data.id,
  };

  cache.put(`mc:${username}`, profile, 30 * 60 * 1000);
  return profile;
};

export const getMinecraftAvatar = async (
  username: string
): Promise<string | null> => {
  const [data, err] = await safe(getMinecraft(username));
  if (err) return null;

  return `https://crafatar.com/avatars/${data.uuid}`;
};
