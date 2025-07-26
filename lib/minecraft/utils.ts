import cache from "memory-cache";

export interface MinecraftProfile {
  name: string;
  uuid: string;
}

export const getMinecraft = async (
  username: string
): Promise<MinecraftProfile | Error> => {
  let data = cache.get(`mc:${username}`);
  if (data) return data;

  const res = await fetch(
    `https://api.mojang.com/users/profiles/minecraft/${username}`
  );

  if (!res.ok) {
    return new Error(
      `Failed to fetch UUID for ${username} (${res.status}): ${res.statusText}`
    );
  }

  data = await res.json();
  if (!data) return new Error(`UUID not found for username: ${username}`);

  const playerData = {
    name: data.name,
    uuid: data.id,
  };

  cache.put(`mc:${username}`, playerData, 30 * 60 * 1000);
  return playerData;
};
