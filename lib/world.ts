export type LocationId = "tavern" | "market" | "board" | "home";
export type NpcId = "mira" | "gelan" | "saya" | "nora";
export type LogKind = "narrator" | "player" | "npc" | "system";

export type LocationDefinition = {
  id: LocationId;
  name: string;
  shortName: string;
  subtitle: string;
  description: string;
};

export type NpcDefinition = {
  id: NpcId;
  name: string;
  role: string;
  location: LocationId;
  color: string;
  portrait: string;
  firstImpression: string;
};

export type LogEntry = {
  id: string;
  kind: LogKind;
  text: string;
  speaker?: string;
};

export type MemoryEntry = {
  id: string;
  text: string;
  source: string;
  strength: number;
};

export type IntentEntry = {
  id: string;
  actorId: NpcId;
  text: string;
  dueTurn: number;
  status: "pending" | "resolved";
};

export type GameState = {
  turn: number;
  location: LocationId;
  target: NpcId | null;
  coins: number;
  inventory: ItemRecord[];
  sceneSessions: Record<string, SceneMessage[]>;
  managerSceneTranscript: ManagerSceneEntry[];
  managerNarrationInstruction: string;
  questStatus: "available" | "active" | "completed";
  favorite: NpcId | null;
  heat: Record<NpcId, number>;
  relationship: Record<NpcId, number>;
  memories: MemoryEntry[];
  intents: IntentEntry[];
  facts: { id: string; text: string; source: string }[];
  events: { id: string; turn: number; text: string }[];
  log: LogEntry[];
};

export const LOCATIONS: LocationDefinition[] = [
  {
    id: "tavern",
    name: "旧鸦酒馆",
    shortName: "酒馆",
    subtitle: "消息比麦酒流得更快",
    description:
      "壁炉把潮湿的黄昏烘出一点暖意。杯盏声、低语声和雨水敲窗的声音混在一起。",
  },
  {
    id: "market",
    name: "灰栎集市",
    shortName: "集市",
    subtitle: "铜币、货物与人情",
    description:
      "摊棚沿石路挤在一起，香料、铁屑和湿麻布的气味在冷风里打转。",
  },
  {
    id: "board",
    name: "村口悬赏板",
    shortName: "悬赏板",
    subtitle: "没人愿意亲自处理的麻烦",
    description:
      "木板被雨水泡得发黑，几张告示压在生锈的铁钉下。其中一张墨迹还很新。",
  },
  {
    id: "home",
    name: "你的住所",
    shortName: "住所",
    subtitle: "暂时属于你的安静角落",
    description:
      "炉火已经熄了，桌上还留着早晨没收起的地图。这里足够安静，适合整理思绪。",
  },
];

export const NPCS: NpcDefinition[] = [
  {
    id: "mira",
    name: "米拉",
    role: "酒馆老板娘",
    location: "tavern",
    color: "#c58b55",
    portrait: "米",
    firstImpression: "眼神敏锐，擦杯子时也在听每张桌子的动静。",
  },
  {
    id: "gelan",
    name: "格兰",
    role: "铁匠",
    location: "market",
    color: "#a66c52",
    portrait: "格",
    firstImpression: "话不多，手背上全是新旧交叠的烫伤。",
  },
  {
    id: "saya",
    name: "赛娅",
    role: "行商",
    location: "market",
    color: "#889d70",
    portrait: "赛",
    firstImpression: "笑容很真诚，报价时则完全是另一回事。",
  },
  {
    id: "nora",
    name: "诺拉",
    role: "猎人",
    location: "board",
    color: "#66858b",
    portrait: "诺",
    firstImpression: "靴子沾着北林的红泥，正反复查看一张旧地图。",
  },
];

export const LOCATION_MAP = Object.fromEntries(
  LOCATIONS.map((location) => [location.id, location]),
) as Record<LocationId, LocationDefinition>;

export const NPC_MAP = Object.fromEntries(
  NPCS.map((npc) => [npc.id, npc]),
) as Record<NpcId, NpcDefinition>;

export const STORAGE_KEY = "airp-village-demo-v3";
export const LEGACY_STORAGE_KEYS = ["airp-village-demo-v1", "airp-village-demo-v2"];
export const DEFAULT_MANAGER_NARRATION_INSTRUCTION = "承接我的输入，从行动产生效果的下一拍开始续写。只在必要时使用很短的动作锚点，不要复述或改写我已经写出的对白、动作与内心；主要描写结果、人物反应和环境反馈。";

export function createInitialState(): GameState {
  return {
    turn: 1,
    location: "tavern",
    target: "mira",
    coins: 12,
    inventory: [
      {
        id: "item:old-key",
        name: "旧黄铜钥匙",
        category: "钥匙",
        rarity: "普通",
        appearance: "齿纹磨损的黄铜钥匙，柄部刻着一片灰栎叶。",
        use: "尚不清楚它能打开什么。",
        description: "你来到灰栎村时便带着它，却想不起自己从何处得到。",
        tags: ["钥匙", "旧物", "线索"],
      },
    ],
    sceneSessions: {},
    managerSceneTranscript: [],
    managerNarrationInstruction: DEFAULT_MANAGER_NARRATION_INSTRUCTION,
    questStatus: "available",
    favorite: null,
    heat: { mira: 64, gelan: 31, saya: 24, nora: 47 },
    relationship: { mira: 18, gelan: 4, saya: 2, nora: 8 },
    memories: [
      {
        id: "memory-home",
        text: "你在村西租下了一间带壁炉的小屋。",
        source: "亲身经历",
        strength: 100,
      },
      {
        id: "memory-mira",
        text: "米拉曾在你最狼狈的时候留过一碗热汤。",
        source: "亲身经历",
        strength: 67,
      },
      {
        id: "memory-childhood",
        text: "你小时候似乎来过灰栎村，但记不清原因。",
        source: "模糊旧忆",
        strength: 34,
      },
    ],
    intents: [
      {
        id: "intent-mira-rumor",
        actorId: "mira",
        text: "从来往客人那里确认领主死亡的传闻",
        dueTurn: 3,
        status: "pending",
      },
    ],
    facts: [
      {
        id: "fact-lord-dead",
        text: "领主埃德蒙于三日前死于高热。",
        source: "领主府医官记录",
      },
      {
        id: "fact-courier-missing",
        text: "村庄信使伊安两日前在北林岔路失踪。",
        source: "村务记录",
      },
      {
        id: "fact-rumor-origin",
        text: "一名醉酒脚夫把‘领主秘不发丧’说成了‘领主从坟里回来’。",
        source: "信息溯源记录",
      },
    ],
    events: [
      { id: "event-arrival", turn: 1, text: "玩家在雨夜进入旧鸦酒馆。" },
    ],
    log: [
      {
        id: "opening",
        kind: "narrator",
        text: "灰栎村的雨下了整整一天。你推开旧鸦酒馆的门时，十几道目光短暂地落在你身上，又很快回到各自的杯子和秘密里。",
      },
      {
        id: "opening-mira",
        kind: "npc",
        speaker: "米拉",
        text: "“还是老位置？”米拉把一只干净杯子放到吧台上，像是早就知道你会来。",
      },
    ],
  };
}

export function makeId(prefix: string, state: GameState) {
  return `${prefix}-${state.turn}-${state.log.length}-${state.events.length}`;
}

export function normalizeLoadedState(value: GameState): GameState {
  const fresh = createInitialState();
  const inventory = Array.isArray(value.inventory)
    ? value.inventory.map((item, index) => typeof item === "string" ? {
        id: `item:legacy-${index}`,
        name: item,
        category: "杂物",
        rarity: "普通" as const,
        appearance: "这件物品的外观尚未记录。",
        use: "用途尚未记录。",
        description: "由早期存档迁移而来。",
        tags: ["旧存档"],
      } : item)
    : fresh.inventory;
  return {
    ...fresh,
    ...value,
    inventory,
    sceneSessions: value.sceneSessions ?? {},
    managerSceneTranscript: value.managerSceneTranscript ?? [],
    managerNarrationInstruction: value.managerNarrationInstruction ?? DEFAULT_MANAGER_NARRATION_INSTRUCTION,
  };
}

export function memoryLabel(strength: number) {
  if (strength >= 80) return { label: "完全记得", tone: "text-[#d2af72]" };
  if (strength >= 50) return { label: "记得一部分", tone: "text-[#9fb39a]" };
  if (strength > 0) return { label: "不太记得", tone: "text-[#87939a]" };
  return { label: "已经遗忘", tone: "text-[#62676b]" };
}

export function formatWorldTime(turn: number) {
  const totalMinutes = 18 * 60 + 10 + (turn - 1) * 20;
  const day = Math.floor(totalMinutes / (24 * 60)) + 1;
  const minutesInDay = totalMinutes % (24 * 60);
  return `第 ${day} 日 · ${String(Math.floor(minutesInDay / 60)).padStart(2, "0")}:${String(minutesInDay % 60).padStart(2, "0")}`;
}

function firstNpcAt(location: LocationId): NpcId | null {
  return NPCS.find((npc) => npc.location === location)?.id ?? null;
}

function findDestination(text: string): LocationId | null {
  const normalized = text.replaceAll(" ", "");
  if (/(旧鸦|酒馆)/.test(normalized) && /(去|前往|回|进入)/.test(normalized)) return "tavern";
  if (/(集市|市场)/.test(normalized) && /(去|前往|回|进入)/.test(normalized)) return "market";
  if (/(悬赏板|告示板|村口)/.test(normalized) && /(去|前往|回|查看)/.test(normalized)) return "board";
  if (/(住所|小屋|家)/.test(normalized) && /(去|前往|回|进入)/.test(normalized)) return "home";
  return null;
}

function npcReply(npcId: NpcId, text: string, state: GameState) {
  const normalized = text.replaceAll(" ", "");
  if (npcId === "mira") {
    if (/(消息|传闻|领主|最近)/.test(normalized)) {
      return "“领主府已经三天没升旗了。”米拉压低声音，“有人说他死了，也有人说他夜里从墓园走了回来。后一句，我只在醉鬼嘴里听过。”";
    }
    return "米拉把杯口转向灯光检查了一遍：“你想知道人们说了什么，还是想知道我相信什么？”";
  }
  if (npcId === "gelan") {
    if (/(信使|北林|悬赏)/.test(normalized)) {
      return "格兰停下锉刀：“伊安出发前来修过马掌。他说北边旧桥附近有人生火，但那一带早就没人住了。”";
    }
    return "格兰敲了敲砧面：“铁不会说谎。人会。你最好问得具体一点。”";
  }
  if (npcId === "saya") {
    if (/(便宜|价格|绷带|买)/.test(normalized)) {
      return `赛娅笑着举起一卷干净绷带：“三枚铜币。你现在有 ${state.coins} 枚，完全付得起。”`;
    }
    return "赛娅把货箱锁扣按紧：“消息也可以买卖，只是它们从来不标价。”";
  }
  if (/(信使|线索|北林|悬赏)/.test(normalized)) {
    return "诺拉用指节压住地图上的岔路：“脚印到这里消失了。不是被雨冲掉，而是有人故意扫过。”";
  }
  return "诺拉抬眼看你：“如果你真要进北林，天亮前来找我。夜里那条路不认生人。”";
}

function tickWorld(state: GameState): GameState {
  const nextTurn = state.turn + 1;
  const heat = { ...state.heat };
  (Object.keys(heat) as NpcId[]).forEach((id) => {
    heat[id] = Math.max(5, Math.min(100, heat[id] + (state.favorite === id ? 1 : -2)));
  });

  const log = [...state.log];
  const events = [...state.events];
  const intents = state.intents.map((intent) => {
    if (intent.status === "resolved" || intent.dueTurn > nextTurn) return intent;
    const actor = NPC_MAP[intent.actorId];
    if (intent.id.startsWith("return-")) {
      const returnLines: Record<NpcId, string> = {
        mira: "一个跑腿孩子在门外追上你，递来米拉折得整整齐齐的纸条：墓园昨夜确实有人点过灯，但脚印是从外面走进去的。",
        gelan: "格兰托人送来一枚刚磨亮的小铜扣。他在背面刻了北林旧桥的记号，显然希望你去找他。",
        saya: "赛娅的货童找到你，说她刚收来一只属于失踪信使的皮袋，袋底还粘着北林的红泥。",
        nora: "一支绑着灰羽的箭钉在你附近的木柱上。诺拉用这种方式告诉你：她在北林找到了新线索。",
      };
      log.push({
        id: `return-log-${nextTurn}-${intent.actorId}`,
        kind: "narrator",
        text: returnLines[intent.actorId],
      });
      events.push({
        id: `return-event-${nextTurn}-${intent.actorId}`,
        turn: nextTurn,
        text: `${actor.name}完成后台意图，并通过可信渠道重新联系玩家。`,
      });
    } else {
      events.push({
        id: `intent-event-${nextTurn}-${intent.actorId}`,
        turn: nextTurn,
        text: `${actor.name}完成意图：${intent.text}。`,
      });
      if (state.location === actor.location) {
        log.push({
          id: `intent-log-${nextTurn}-${intent.actorId}`,
          kind: "system",
          text: `${actor.name}似乎刚从另一段交谈里确认了什么。一个后台意图已经发生。`,
        });
      }
    }
    return { ...intent, status: "resolved" as const };
  });

  return { ...state, turn: nextTurn, heat, intents, log, events };
}

export function resolvePlayerAction(current: GameState, rawText: string): GameState {
  const text = rawText.trim();
  const destination = findDestination(text);
  let state = { ...current };

  if (destination && destination !== state.location) {
    const location = LOCATION_MAP[destination];
    state = {
      ...state,
      location: destination,
      target: firstNpcAt(destination),
      log: [
        ...state.log,
        {
          id: makeId("travel", state),
          kind: "narrator" as const,
          text: `你离开${LOCATION_MAP[state.location].shortName}，沿着湿漉漉的石路来到${location.name}。${location.description}`,
        },
      ],
      events: [
        ...state.events,
        { id: makeId("movement", state), turn: state.turn, text: `玩家移动至${location.name}。` },
      ],
    };
    return tickWorld(state);
  }

  const mentionedNpc = NPCS.find(
    (npc) => npc.location === state.location && text.includes(npc.name),
  );
  const target = mentionedNpc?.id ?? state.target ?? firstNpcAt(state.location);

  if (state.location === "market" && /(购买|买).*(绷带)|(绷带).*(购买|买)/.test(text)) {
    if (state.coins >= 3) {
      state = {
        ...state,
        coins: state.coins - 3,
        inventory: [...state.inventory, {
          id: `item:clean-bandage-${state.turn}`,
          name: "干净绷带",
          category: "医疗用品",
          rarity: "普通",
          appearance: "卷得紧实的亚麻绷带，油纸内带着淡淡薄荷味。",
          use: "用于包扎普通伤口。",
          description: "赛娅从商队货箱中取出的常用旅行补给。",
          tags: ["医疗", "消耗品"],
        }],
        target: "saya",
        log: [
          ...state.log,
          { id: makeId("saya", state), kind: "npc", speaker: "赛娅", text: "“三枚铜币，成交。”赛娅用油纸包好绷带，并在绳结上压了一片干薄荷。" },
          { id: makeId("trade", state), kind: "system", text: "交易完成：铜币 −3，获得「干净绷带」。" },
        ],
        events: [
          ...state.events,
          { id: makeId("trade-event", state), turn: state.turn, text: "玩家以三枚铜币从赛娅处购入干净绷带。" },
        ],
      };
    } else {
      state = {
        ...state,
        log: [...state.log, { id: makeId("trade-fail", state), kind: "system", text: "你摸了摸钱袋，铜币不够完成这笔交易。" }],
      };
    }
    return tickWorld(state);
  }

  if (state.location === "board" && /(接受|接下|领取|悬赏)/.test(text)) {
    if (state.questStatus === "available") {
      state = {
        ...state,
        questStatus: "active",
        target: "nora",
        log: [
          ...state.log,
          { id: makeId("quest", state), kind: "narrator", text: "你取下那张墨迹未干的告示，在名字下方按下指印。纸背还残留着北林潮湿的松脂味。" },
          { id: makeId("nora", state), kind: "npc", speaker: "诺拉", text: "“既然接了，就别只带勇气。”诺拉把一小段画有岔路的地图递给你。" },
        ],
        memories: [
          ...state.memories,
          { id: "memory-courier", text: "你接受了寻找失踪信使伊安的悬赏。", source: "亲身经历", strength: 100 },
        ],
        events: [
          ...state.events,
          { id: makeId("quest-event", state), turn: state.turn, text: "玩家正式接受悬赏：寻找失踪的信使。" },
        ],
      };
    } else {
      state = {
        ...state,
        log: [...state.log, { id: makeId("quest-known", state), kind: "system", text: "这份悬赏已经登记在你的名下。" }],
      };
    }
    return tickWorld(state);
  }

  if (state.location === "home" && /(休息|睡|整理|坐一会)/.test(text)) {
    state = {
      ...state,
      log: [
        ...state.log,
        { id: makeId("rest", state), kind: "narrator", text: "你重新点燃壁炉，让雨声退到窗外。短暂的安静把今天听到的话分成了事实、猜测和仍需追问的部分。" },
        { id: makeId("rest-system", state), kind: "system", text: "你整理了记忆；所有条目仍在库中，并按当前回忆强度等待下次注入。" },
      ],
      events: [...state.events, { id: makeId("rest-event", state), turn: state.turn, text: "玩家在住所休息并整理记忆。" }],
    };
    return tickWorld(tickWorld(state));
  }

  if (target) {
    const npc = NPC_MAP[target];
    const reply = npcReply(target, text, state);
    const isRumor = target === "mira" && /(消息|传闻|领主|最近)/.test(text);
    const alreadyKnowsRumor = state.memories.some((memory) => memory.id === "memory-zombie-rumor");
    state = {
      ...state,
      target,
      relationship: { ...state.relationship, [target]: Math.min(100, state.relationship[target] + 1) },
      heat: { ...state.heat, [target]: Math.min(100, state.heat[target] + 4) },
      log: [...state.log, { id: makeId("npc", state), kind: "npc", speaker: npc.name, text: reply }],
      memories:
        isRumor && !alreadyKnowsRumor
          ? [...state.memories, { id: "memory-zombie-rumor", text: "米拉说：领主可能已经死亡，也有人声称他从墓园走了回来。", source: "米拉转述", strength: 100 }]
          : state.memories,
      events: [...state.events, { id: makeId("speech-event", state), turn: state.turn, text: `${npc.name}回应了玩家；对话内容进入双方可回忆记录。` }],
    };
    return tickWorld(state);
  }

  return tickWorld({
    ...state,
    log: [...state.log, { id: makeId("manager", state), kind: "narrator", text: "管理者让场景继续向前：雨势稍缓，附近的人仍按各自的意图活动。你的动作没有触发新的持久状态。" }],
  });
}
import type { ItemRecord, ManagerSceneEntry, SceneMessage } from "./airp-core";
