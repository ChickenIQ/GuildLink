import { ProfileNetworthCalculator } from "skyhelper-networth";
import { calcXpCatacombs } from "./utils";
import { safe } from "../generic/safe";
import cache from "memory-cache";
import { formatTime } from "../generic/math";

export type DungeonClasses = {
  berserk: number;
  archer: number;
  healer: number;
  mage: number;
  tank: number;
};

export type DungeonsStats = {
  catacombsLevel: number;
  classLevel: DungeonClasses;

  selectedClassLevel: number;
  selectedClass: string;

  secretsFound: number;
  classAverage: number;

  M7: {
    formattedPB: string;
    completions: number;
    personalBest: number;
  };
};

export type SkyBlockStats = {
  dungeons: DungeonsStats;
  level: number;
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
      throw new Error(`Failed to fetch data from ${url} (${res.status}): ${res.statusText}`);
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
      throw new Error(`Failed to Discord Username for UUID: ${uuid} - ${apiErr.message}`);
    }

    const discord = data.player?.socialMedia?.links?.DISCORD;
    if (!discord) throw new Error(`No Discord username found for ${uuid}`);

    return discord;
  }

  async getSkyblockProfile(uuid: string): Promise<any> {
    const [data, apiErr] = await safe(this.fetchAPI(`/skyblock/profiles?uuid=${uuid}`));
    if (apiErr) {
      throw new Error(`Failed to fetch SkyBlock Profile for UUID: ${uuid} - ${apiErr.message}`);
    }

    const profile = data.profiles.find((profile: { selected: boolean }) => profile.selected);

    if (!profile) throw new Error(`No active profile found for ${uuid}`);

    return profile;
  }

  async getMuseum(profileID: string): Promise<any> {
    const [data, apiErr] = await safe(this.fetchAPI(`/skyblock/museum?profile=${profileID}`));
    if (apiErr) {
      throw new Error(`Failed to fetch Museum data for profile ID: ${profileID} - ${apiErr.message}`);
    }

    return data;
  }

  async getNetworth(uuid: string): Promise<number> {
    const profile = await this.getSkyblockProfile(uuid);
    const museum = await this.getMuseum(profile.profile_id);

    const networthManager = new ProfileNetworthCalculator(profile.members[uuid], museum.members[uuid], profile.banking?.balance);

    const [nw, err] = await safe(networthManager.getNetworth());
    if (err) {
      throw new Error(`Failed to calculate networth for UUID: ${uuid} - ${err.message}`);
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

  async getDungeonsStats(uuid: string): Promise<DungeonsStats> {
    const profile = await this.getSkyblockProfile(uuid);
    const dungeons = profile?.members[uuid]?.dungeons;
    const M7 = dungeons?.dungeon_types?.master_catacombs;

    const classLevels = Object.fromEntries(
      ["healer", "mage", "tank", "berserk", "archer"].map((className) => [className, calcXpCatacombs(dungeons?.player_classes?.[className]?.experience || 0)])
    ) as DungeonClasses;

    const m7PB = M7?.fastest_time?.["7"] || null;
    const m7Comps = M7?.tier_completions?.["7"] || null;
    const selectedClass: string = dungeons?.selected_dungeon_class || "None";
    const selectedClassLevel = selectedClass !== "None" ? classLevels[selectedClass as keyof DungeonClasses] : 0;

    return {
      classAverage: Math.round((Object.values(classLevels).reduce((a, b) => a + b, 0) / 5) * 100) / 100,
      catacombsLevel: calcXpCatacombs(dungeons?.dungeon_types.catacombs.experience || 0),
      selectedClass: selectedClass.charAt(0).toUpperCase() + selectedClass.slice(1),
      selectedClassLevel: selectedClassLevel,
      secretsFound: dungeons?.secrets || 0,
      classLevel: classLevels,
      M7: {
        formattedPB: m7PB ? formatTime(m7PB) : "N/A",
        completions: m7Comps || 0,
        personalBest: m7PB,
      },
    };
  }

  async getSkyBlockStats(uuid: string): Promise<SkyBlockStats> {
    return {
      dungeons: await this.getDungeonsStats(uuid),
      level: await this.getSkyBlockLevel(uuid),
    };
  }
}
