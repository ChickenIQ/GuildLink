import { ProfileNetworthCalculator } from "skyhelper-networth";
import { isErr, safe } from "../generic/safe";
import { calcXpCatacombs } from "./utils";
import cache from "memory-cache";

export class HypixelAPIHandler {
  private apiKey: string;

  private async fetchAPI(url: string): Promise<any | Error> {
    url = "https://api.hypixel.net/v2" + url;
    let data = cache.get(url);
    if (data) return data;

    const res = await fetch(url, {
      headers: { "API-Key": this.apiKey },
    });

    if (!res.ok) {
      return new Error(
        `Failed to fetch data from ${url} (${res.status}): ${res.statusText}`
      );
    }

    data = await res.json();
    if (!data) return new Error(`No data found for URL: ${url}`);

    cache.put(url, data, 30 * 60 * 1000);
    return data;
  }

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getDiscordUsername(uuid: string): Promise<string | Error> {
    const data = await this.fetchAPI(`/player?uuid=${uuid}`);
    if (isErr(data)) {
      return new Error(`Failed to fetch player data for UUID: ${uuid}`);
    }

    const discord = data.player?.socialMedia?.links?.DISCORD;
    if (!discord) throw new Error(`No Discord username found for ${uuid}`);

    return discord;
  }

  async getSkyblockProfile(uuid: string): Promise<any | Error> {
    const data = await this.fetchAPI(`/skyblock/profiles?uuid=${uuid}`);
    if (isErr(data)) {
      return new Error(`Failed to fetch Skyblock profile for UUID: ${uuid}`);
    }

    const profile = data.profiles.find(
      (profile: { selected: boolean }) => profile.selected
    );

    if (!profile) return new Error(`No active profile found for ${uuid}`);

    return profile;
  }

  async getMuseum(profileID: string): Promise<any | Error> {
    return this.fetchAPI(`/skyblock/museum?profile=${profileID}`);
  }

  async getNetworth(uuid: string): Promise<number | Error> {
    const profile = await this.getSkyblockProfile(uuid);
    if (isErr(profile)) return profile;

    const museum = await this.getMuseum(profile.profile_id);
    if (isErr(museum)) return museum;

    const networthManager = new ProfileNetworthCalculator(
      profile.members[uuid],
      museum.members[uuid],
      profile.banking?.balance
    );

    const [nw, nwErr] = await safe(networthManager.getNetworth());
    if (nwErr) return nwErr;

    return nw.networth;
  }

  async getSkyblockLevel(uuid: string): Promise<number | Error> {
    const profile = await this.getSkyblockProfile(uuid);
    if (isErr(profile)) return profile;

    const data = profile.members[uuid];
    if (!data || !data.leveling) {
      return new Error(`No leveling data found for ${uuid}`);
    }

    return data.leveling.experience / 100;
  }

  async getCatacombsLevel(uuid: string): Promise<number | Error> {
    const profile = await this.getSkyblockProfile(uuid);
    if (isErr(profile)) return profile;

    const dungeons = profile?.members[uuid]?.dungeons?.dungeon_types?.catacombs;
    const xp = dungeons?.experience;
    if (!dungeons || !xp) {
      return new Error(`No Catacombs data found for ${uuid}`);
    }

    return calcXpCatacombs(xp);
  }
}
