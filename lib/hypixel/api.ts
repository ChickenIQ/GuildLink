import { ProfileNetworthCalculator } from "skyhelper-networth";
import { calcXpCatacombs } from "./utils";
import { safe } from "../generic/safe";
import cache from "memory-cache";

export type SkyBlockStats = {
  catacombs: number;
  M7Stats: M7Stats;
  networth: number;
  level: number;
};

export type M7Stats = {
  personalBest: number;
  completions: number;
};

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

  async getDiscordUsername(uuid: string): Promise<string> {
    const [data, apiErr] = await safe(this.fetchAPI(`/player?uuid=${uuid}`));
    if (apiErr) {
      throw new Error(
        `Failed to Discord Username for UUID: ${uuid} - ${apiErr.message}`
      );
    }

    const discord = data.player?.socialMedia?.links?.DISCORD;
    if (!discord) throw new Error(`No Discord username found for ${uuid}`);

    return discord;
  }

  async getSkyblockProfile(uuid: string): Promise<any> {
    const [data, apiErr] = await safe(
      this.fetchAPI(`/skyblock/profiles?uuid=${uuid}`)
    );
    if (apiErr) {
      throw new Error(
        `Failed to fetch SkyBlock Profile for UUID: ${uuid} - ${apiErr.message}`
      );
    }

    const profile = data.profiles.find(
      (profile: { selected: boolean }) => profile.selected
    );

    if (!profile) throw new Error(`No active profile found for ${uuid}`);

    return profile;
  }

  async getMuseum(profileID: string): Promise<any> {
    const [data, apiErr] = await safe(
      this.fetchAPI(`/skyblock/museum?profile=${profileID}`)
    );
    if (apiErr) {
      throw new Error(
        `Failed to fetch Museum data for profile ID: ${profileID} - ${apiErr.message}`
      );
    }

    return data;
  }

  async getNetworth(uuid: string): Promise<number> {
    const profile = await this.getSkyblockProfile(uuid);
    const museum = await this.getMuseum(profile.profile_id);

    const networthManager = new ProfileNetworthCalculator(
      profile.members[uuid],
      museum.members[uuid],
      profile.banking?.balance
    );

    const [nw, err] = await safe(networthManager.getNetworth());
    if (err) {
      throw new Error(
        `Failed to calculate networth for UUID: ${uuid} - ${err.message}`
      );
    }

    return nw.networth;
  }

  async getSkyBlockLevel(uuid: string): Promise<number> {
    const profile = await this.getSkyblockProfile(uuid);
    const data = profile.members[uuid];
    if (!data || !data.leveling) {
      throw new Error(`No leveling data found for UUID: ${uuid}`);
    }

    return data.leveling.experience / 100;
  }

  async getCatacombsLevel(uuid: string): Promise<number> {
    const profile = await this.getSkyblockProfile(uuid);
    const cata = profile?.members[uuid]?.dungeons?.dungeon_types?.catacombs;

    return calcXpCatacombs(cata?.experience || 0);
  }

  async getM7Stats(uuid: string): Promise<M7Stats> {
    const profile = await this.getSkyblockProfile(uuid);
    const dungeon = profile?.members[uuid]?.dungeons?.dungeon_types;

    return {
      personalBest: dungeon?.master_catacombs?.personal_best?.["7"] || 0,
      completions: dungeon?.master_catacombs?.completions || 0,
    };
  }

  async getSkyBlockStats(uuid: string): Promise<SkyBlockStats> {
    return {
      catacombs: await this.getCatacombsLevel(uuid),
      level: await this.getSkyBlockLevel(uuid),
      networth: await this.getNetworth(uuid),
      M7Stats: await this.getM7Stats(uuid),
    };
  }
}
