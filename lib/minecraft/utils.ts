import cache from "memory-cache";

export const getUUID = async (username: string) => {
  let data = cache.get(`uuid:${username}`);
  if (data) return data;

  const res = await fetch(
    `https://api.mojang.com/users/profiles/minecraft/${username}`
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch UUID (${res.status}): ${res.statusText}`);
  }

  data = ((await res.json()) as { id: string }).id;
  if (!data) throw new Error(`UUID not found for username: ${username}`);

  cache.put(`uuid:${username}`, data, 30 * 60 * 1000);
  return data;
};
