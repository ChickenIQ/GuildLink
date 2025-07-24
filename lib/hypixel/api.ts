import { ProfileNetworthCalculator } from "skyhelper-networth";
import { numberToHuman } from "../generic/math";
import { calcXpCatacombs } from "./utils";
import cache from "memory-cache";

export class HypixelAPIHandler {
  private apiKey: string;

  private async fetchAPI(url: string): Promise<any> {
    url = "https://api.hypixel.net/v2" + url;
    let data = cache.get(url);
    if (data) return data;

    const res = await fetch(url, {
      headers: { "API-Key": this.apiKey },
    });

    if (!res.ok) {
      throw new Error(
        `Failed to fetch data from ${url} (${res.status}): ${res.statusText}`
      );
    }

    data = await res.json();
    if (!data) throw new Error(`No data found for URL: ${url}`);

    cache.put(url, data, 30 * 60 * 1000);
    return data;
  }

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getDiscordUsername(uuid: string) {
    const data = await this.fetchAPI(`/player?uuid=${uuid}`);

    const discord = data.player?.socialMedia?.links?.DISCORD;
    if (!discord) throw new Error(`No Discord username found for ${uuid}`);

    return discord;
  }

  async getSkyblockProfile(uuid: string) {
    const data = await this.fetchAPI(`/skyblock/profiles?uuid=${uuid}`);

    const profile = data.profiles.find(
      (profile: { selected: boolean }) => profile.selected
    );

    if (!profile) throw new Error(`No active profile found for ${uuid}`);

    return profile;
  }

  async getMuseum(profileID: string) {
    return this.fetchAPI(`/skyblock/museum?profile=${profileID}`);
  }

  async getNetworth(uuid: string) {
    const profile = await this.getSkyblockProfile(uuid);
    if (!profile) throw new Error(`Profile not found for UUID: ${uuid}`);

    const museum = await this.getMuseum(profile.profile_id);
    if (!museum) {
      throw new Error(`Museum not found for profile: ${profile.profile_id}`);
    }

    const networthManager = new ProfileNetworthCalculator(
      profile.members[uuid],
      museum.members[uuid],
      profile.banking?.balance
    );

    return numberToHuman((await networthManager.getNetworth()).networth);
  }

  async getCatacombsLevel(uuid: string) {
    const profile = await this.getSkyblockProfile(uuid);
    if (!profile) return;

    const dungeons = profile?.members[uuid]?.dungeons?.dungeon_types?.catacombs;
    const xp = dungeons?.experience;
    if (!dungeons || !xp) return;

    return calcXpCatacombs(xp).toFixed(2);
  }
}
