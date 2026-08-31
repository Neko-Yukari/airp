import { z } from "zod";

export const itemRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  rarity: z.enum(["普通", "精良", "稀有", "珍奇", "传说"]),
  appearance: z.string(),
  use: z.string(),
  description: z.string(),
  tags: z.array(z.string()).default([]),
});

export type ItemRecord = z.infer<typeof itemRecordSchema>;

export const managerRouteSchema = z.object({
  targetEntityId: z.string().nullable(),
  observations: z.array(z.string()),
  heardSpeech: z.array(z.string()),
  intentHint: z.string(),
  responseRequest: z.string(),
});

export const entityTurnSchema = z.object({
  speech: z.string().default(""),
  action: z.string().default(""),
  privateNote: z.string().default(""),
  continueInteraction: z.boolean().default(true),
});

export const dialogueResultSchema = z.object({
  narrative: z.string(),
  targetEntityId: z.string().nullable(),
  targetName: z.string().nullable(),
  managerPacket: managerRouteSchema.nullable(),
  entityTurn: entityTurnSchema.nullable(),
});

export type ManagerRoute = z.infer<typeof managerRouteSchema>;
export type EntityTurn = z.infer<typeof entityTurnSchema>;
export type DialogueResult = z.infer<typeof dialogueResultSchema>;

export type SceneMessage = {
  role: "manager" | "entity";
  content: string;
};

export type ManagerSceneEntry = {
  seq: number;
  kind: "player_input" | "manager_packet" | "entity_turn" | "manager_narrative";
  content: string;
  actorId?: string;
};

export type EntityProfile = {
  id: string;
  name: string;
  role: string;
  locationId: string;
  core: string;
  knowledge: string[];
  style: string;
};

export const ENTITY_PROFILES: EntityProfile[] = [
  {
    id: "mira",
    name: "米拉",
    role: "旧鸦酒馆老板娘",
    locationId: "tavern",
    core: "敏锐、务实、谨慎照顾熟客。她重视酒馆安全，不轻易泄露消息来源。",
    knowledge: [
      "灰栎村位于费伦西部腹地的一条商路支线上，受附近领主和圣武士巡逻队保护。",
      "领主府三天没有升旗，村里正在流传领主病亡的消息。",
      "一名醉酒脚夫夸张地声称领主从墓园归来，米拉并不相信这个说法。",
      "信使伊安两日前在北林岔路失踪。",
    ],
    style: "说话简洁，常先观察对方，再给出半步信息；不使用现代词汇。",
  },
  {
    id: "gelan",
    name: "格兰",
    role: "铁匠",
    locationId: "market",
    core: "沉默、可靠、厌恶夸大的传闻，更相信能触摸和检验的证据。",
    knowledge: ["伊安失踪前修过马掌，并提到北林旧桥附近有人生火。"],
    style: "短句，偶尔用锻造作比喻。",
  },
  {
    id: "saya",
    name: "赛娅",
    role: "行商",
    locationId: "market",
    core: "亲切、精明，把信息和货物都视作可以交换的资源。",
    knowledge: ["近期商路不安稳，北林附近的货运开始涨价。"],
    style: "语气热情，但涉及价格和来源时会留有余地。",
  },
  {
    id: "nora",
    name: "诺拉",
    role: "猎人",
    locationId: "board",
    core: "冷静、警觉、重视准备，不喜欢没有行动价值的闲谈。",
    knowledge: ["伊安的脚印在北林岔路被人为扫除。"],
    style: "直接、克制，习惯描述痕迹和风险。",
  },
];

export function entityAtLocation(locationId: string) {
  return ENTITY_PROFILES.filter((entity) => entity.locationId === locationId);
}

export function parseJsonObject(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(cleaned);
}
