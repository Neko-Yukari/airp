"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  Beer,
  Check,
  ChevronRight,
  ClipboardList,
  Coins,
  Eye,
  Flame,
  Heart,
  House,
  MapPin,
  MessageCircle,
  MoonStar,
  Package,
  RotateCcw,
  ScrollText,
  Send,
  ShieldCheck,
  Sparkles,
  Store,
  UsersRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  createInitialState,
  DEFAULT_MANAGER_NARRATION_INSTRUCTION,
  formatWorldTime,
  LOCATION_MAP,
  LEGACY_STORAGE_KEYS,
  LOCATIONS,
  makeId,
  memoryLabel,
  normalizeLoadedState,
  NPC_MAP,
  NPCS,
  STORAGE_KEY,
  type GameState,
  type LocationId,
  type NpcId,
} from "@/lib/world";
import type { DialogueResult, ItemRecord } from "@/lib/airp-core";

const LOCATION_ICONS = {
  tavern: Beer,
  market: Store,
  board: ClipboardList,
  home: House,
};

function SoftBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-[11px] tracking-wide text-[#aeb5b1]">
      {children}
    </span>
  );
}

export default function HomePage() {
  const [game, setGame] = useState<GameState>(() => createInitialState());
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    LEGACY_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setGame(normalizeLoadedState(JSON.parse(saved) as GameState));
      } catch {
        setGame(createInitialState());
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
  }, [game, hydrated]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [game.log.length, thinking]);

  const location = LOCATION_MAP[game.location];
  const nearbyNpcs = useMemo(
    () => NPCS.filter((npc) => npc.location === game.location),
    [game.location],
  );
  const target = game.target ? NPC_MAP[game.target] : null;
  const visibleMemories = game.memories.filter((memory) => memory.strength > 0);

  const quickActions: Record<LocationId, string[]> = {
    tavern: ["向米拉打听最近的消息", "和米拉随意聊聊", "问米拉是否听说过失踪的信使"],
    market: ["购买一卷绷带", "和格兰谈谈北林", "前往酒馆"],
    board: ["查看并接受悬赏", "询问诺拉有关信使的线索", "回到酒馆"],
    home: ["休息片刻并整理记忆", "回想今天听到的消息", "前往集市"],
  };

  async function submitAction(action = input) {
    const trimmed = action.trim();
    if (!trimmed || thinking) return;
    const requestState = game;
    setGame((current) => ({
      ...current,
      log: [
        ...current.log,
        { id: makeId("player", current), kind: "player", text: trimmed },
      ],
    }));
    setInput("");
    setThinking(true);
    setError(null);
    try {
      const response = await fetch("/api/dialogue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerText: trimmed,
          locationId: requestState.location,
          locationDescription: LOCATION_MAP[requestState.location].description,
          sessions: requestState.sceneSessions,
          managerTranscript: requestState.managerSceneTranscript,
          managerNarrationInstruction: requestState.managerNarrationInstruction,
        }),
      });
      const payload = await response.json() as DialogueResult & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "对话调用失败");
      setGame((current) => {
        const sessions = { ...current.sceneSessions };
        const nextSeq = current.managerSceneTranscript.length;
        const managerEntries: GameState["managerSceneTranscript"] = [
          { seq: nextSeq, kind: "player_input", content: trimmed },
          ...(payload.managerPacket ? [{
            seq: nextSeq + 1,
            kind: "manager_packet" as const,
            content: JSON.stringify(payload.managerPacket),
            actorId: payload.targetEntityId ?? undefined,
          }] : []),
          ...(payload.entityTurn ? [{
            seq: nextSeq + 2,
            kind: "entity_turn" as const,
            content: JSON.stringify(payload.entityTurn),
            actorId: payload.targetEntityId ?? undefined,
          }] : []),
          {
            seq: nextSeq + (payload.entityTurn ? 3 : 2),
            kind: "manager_narrative",
            content: payload.narrative,
          },
        ];
        if (payload.targetEntityId && payload.managerPacket && payload.entityTurn) {
          sessions[payload.targetEntityId] = [
            ...(sessions[payload.targetEntityId] ?? []),
            { role: "manager", content: JSON.stringify(payload.managerPacket) },
            { role: "entity", content: JSON.stringify(payload.entityTurn) },
          ].slice(-24);
        }
        return {
          ...current,
          turn: current.turn + 1,
          target: (payload.targetEntityId as NpcId | null) ?? current.target,
          sceneSessions: sessions,
          managerSceneTranscript: [...current.managerSceneTranscript, ...managerEntries].slice(-200),
          log: [...current.log, {
            id: makeId("manager-result", current),
            kind: "narrator",
            text: payload.narrative,
          }],
        };
      });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "对话调用失败";
      setError(message);
      setGame((current) => ({ ...current, log: [...current.log, {
        id: makeId("dialogue-error", current), kind: "system", text: `本轮没有提交：${message}`,
      }] }));
    } finally {
      setThinking(false);
    }
  }

  async function generateItem(idea: string) {
    const response = await fetch("/api/items/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idea }),
    });
    const payload = await response.json() as ItemRecord & { error?: string };
    if (!response.ok) throw new Error(payload.error ?? "物品生成失败");
    setGame((current) => ({ ...current, inventory: [...current.inventory, payload] }));
    return payload;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitAction();
    }
  }

  function toggleFavorite(id: NpcId) {
    setGame((current) => {
      if (current.favorite === id) {
        return {
          ...current,
          favorite: null,
          log: [
            ...current.log,
            {
              id: makeId("unfocus", current),
              kind: "system",
              text: `你让对${NPC_MAP[id].name}的关注回到普通水平。`,
            },
          ],
        };
      }
      const hasReturnIntent = current.intents.some(
        (intent) =>
          intent.id.startsWith(`return-${id}`) && intent.status === "pending",
      );
      return {
        ...current,
        favorite: id,
        heat: { ...current.heat, [id]: Math.min(100, current.heat[id] + 22) },
        relationship: {
          ...current.relationship,
          [id]: Math.min(100, current.relationship[id] + 5),
        },
        intents: hasReturnIntent
          ? current.intents
          : [
              ...current.intents,
              {
                id: `return-${id}-${current.turn}`,
                actorId: id,
                text: "寻找符合自身处境的方式再次联系玩家",
                dueTurn: current.turn + 3,
                status: "pending",
              },
            ],
        log: [
          ...current.log,
          {
            id: makeId("focus", current),
            kind: "system",
            text: `你开始格外留意${NPC_MAP[id].name}。这段关系获得了更高的后台活动优先级。`,
          },
        ],
      };
    });
  }

  function forgetMemory(id: string) {
    setGame((current) => ({
      ...current,
      memories: current.memories.map((memory) =>
        memory.id === id ? { ...memory, strength: 0 } : memory,
      ),
      log: [
        ...current.log,
        {
          id: makeId("forget", current),
          kind: "system",
          text: "你选择让这条记忆退出普通回忆上下文；原始记录仍可由管理者追溯。",
        },
      ],
    }));
  }

  function resetStory() {
    const fresh = createInitialState();
    setGame(fresh);
    setInput("");
    setError(null);
    LEGACY_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  }

  return (
    <main className="world-shell min-h-screen text-[#e5e0d4]">
      <header className="border-b border-white/[0.075] bg-[#111513]/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-xl border border-[#d0a366]/25 bg-[#d0a366]/10 text-[#d8af75]">
              <MoonStar className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <h1 className="truncate font-serif text-base font-semibold tracking-[0.08em] text-[#f1eadb] sm:text-lg">
                  灰栎村
                </h1>
                <span className="hidden text-[10px] uppercase tracking-[0.24em] text-[#737c77] sm:inline">
                  faerûn agent scene
                </span>
              </div>
              <p className="truncate text-[11px] text-[#87918b]">
                费伦 · 管理者调度 · 独立人物上下文
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2 text-xs text-[#9ba39e] md:flex">
              <MoonStar className="size-3.5 text-[#c7a46f]" />
              {formatWorldTime(game.turn)} · 回合 {game.turn}
            </div>
            <div className="hidden items-center gap-1.5 text-[11px] text-[#7f8b84] sm:flex">
              <Check className="size-3.5 text-[#7fa07d]" />本地自动保存
            </div>
            <Button variant="outline" size="sm" onClick={resetStory} disabled={thinking} className="border-white/10 bg-white/[0.035] text-[#cbd0cb] hover:bg-white/[0.075] hover:text-white">
              <RotateCcw className="size-4" /><span className="hidden sm:inline">重新测试</span>
            </Button>
            <ManagerSheet
              game={game}
              onReset={resetStory}
              onNarrationInstructionChange={(value) => setGame((current) => ({ ...current, managerNarrationInstruction: value }))}
            />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1600px] gap-4 p-3 sm:p-4 xl:grid-cols-[272px_minmax(0,1fr)_326px]">
        <aside className="order-2 space-y-4 xl:order-1">
          <section className="panel-surface overflow-hidden p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="eyebrow">村庄地图</p>
                <h2 className="mt-1 font-serif text-lg text-[#e8dfcf]">雨夜中的灰栎村</h2>
              </div>
              <MapPin className="size-4 text-[#b68e5a]" />
            </div>
            <div className="village-map relative grid grid-cols-2 gap-2.5">
              {LOCATIONS.map((item) => {
                const Icon = LOCATION_ICONS[item.id];
                const active = item.id === game.location;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => undefined}
                    disabled={!active || thinking}
                    title={active ? "当前场景" : "移动与离场判定将在阶段 2 接入"}
                    className={`group relative z-10 min-h-24 rounded-2xl border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c79b62]/60 ${
                      active
                        ? "border-[#c79b62]/40 bg-[#c79b62]/12 shadow-[0_0_24px_rgba(186,137,78,0.08)]"
                        : "cursor-not-allowed border-white/[0.055] bg-black/10 opacity-55"
                    }`}
                  >
                    <div className={`mb-3 grid size-8 place-items-center rounded-xl ${active ? "bg-[#c79b62]/18 text-[#d9ae76]" : "bg-white/5 text-[#7f8b84] group-hover:text-[#b9bcb5]"}`}>
                      <Icon className="size-4" />
                    </div>
                    <p className={`text-sm font-medium ${active ? "text-[#efe3ce]" : "text-[#bdc2bc]"}`}>{item.shortName}</p>
                    <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-[#66716a]">{item.subtitle}</p>
                    {active && <span className="absolute right-2.5 top-2.5 size-1.5 rounded-full bg-[#e3b570] shadow-[0_0_8px_#e3b570]" />}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="panel-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <div><p className="eyebrow">此地人物</p><p className="mt-1 text-xs text-[#727d76]">选择交谈对象或提升关注</p></div>
              <UsersRound className="size-4 text-[#748a7d]" />
            </div>
            {nearbyNpcs.length ? (
              <div className="space-y-2">
                {nearbyNpcs.map((npc) => (
                  <NpcCard
                    key={npc.id}
                    npcId={npc.id}
                    selected={game.target === npc.id}
                    favored={game.favorite === npc.id}
                    thinking={thinking}
                    onSelect={() => setGame((current) => ({ ...current, target: npc.id }))}
                    onTalk={() => submitAction(`我和${npc.name}谈谈`)}
                    onFavorite={() => toggleFavorite(npc.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center">
                <House className="mx-auto size-5 text-[#5f6963]" />
                <p className="mt-2 text-xs text-[#727c76]">这里只听得到雨声和炉火声</p>
              </div>
            )}
          </section>
        </aside>

        <section className="order-1 flex min-h-[680px] min-w-0 flex-col overflow-hidden rounded-[22px] border border-white/[0.085] bg-[#151a17]/94 shadow-[0_24px_80px_rgba(0,0,0,0.28)] xl:order-2 xl:h-[calc(100vh-98px)] xl:min-h-[720px]">
          <div className="scene-banner relative overflow-hidden border-b border-white/[0.075] px-5 py-5 sm:px-7">
            <div className="relative z-10 flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Badge className="border-[#c89b62]/20 bg-[#c89b62]/10 text-[#d6ae77]">当前位置</Badge>
                  <span className="text-[11px] text-[#6f7a73] md:hidden">{formatWorldTime(game.turn)}</span>
                </div>
                <h2 className="font-serif text-2xl font-semibold tracking-wide text-[#f0e6d5] sm:text-[28px]">{location.name}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#939c96]">{location.description}</p>
              </div>
              <div className="hidden shrink-0 items-center gap-2 rounded-full border border-white/8 bg-black/15 px-3 py-1.5 text-[11px] text-[#869089] sm:flex">
                <Sparkles className="size-3.5 text-[#b48d5d]" />管理者正在维持场景
              </div>
            </div>
          </div>

          <div className="scrollbar-thin flex-1 overflow-y-auto px-4 py-5 sm:px-7 sm:py-6">
            <div className="mx-auto max-w-3xl space-y-5">
              {game.log.map((entry) => (
                <StoryEntry key={entry.id} entry={entry} />
              ))}
              {thinking && (
                <div className="flex items-center gap-2 py-3 text-xs text-[#7f8a83]">
                  <span className="thinking-dot" /><span className="thinking-dot [animation-delay:120ms]" /><span className="thinking-dot [animation-delay:240ms]" />
                  <span className="ml-1">管理者正在询问场内人物</span>
                </div>
              )}
              {error && <p className="text-center text-xs text-[#c98472]">{error}</p>}
              <div ref={logEndRef} />
            </div>
          </div>

          <div className="border-t border-white/[0.075] bg-[#111512]/88 px-4 py-4 backdrop-blur sm:px-6">
            <div className="mx-auto max-w-3xl">
              <div className="scrollbar-none mb-3 flex gap-2 overflow-x-auto pb-1">
                {quickActions[game.location].map((action) => (
                  <button key={action} type="button" disabled={thinking} onClick={() => submitAction(action)} className="shrink-0 rounded-full border border-white/[0.085] bg-white/[0.035] px-3 py-1.5 text-[11px] text-[#a5ada7] transition hover:border-[#ad8758]/30 hover:bg-[#ad8758]/10 hover:text-[#d2b184] disabled:opacity-40">
                    {action}
                  </button>
                ))}
              </div>
              <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-black/20 p-2 focus-within:border-[#b58d5b]/35 focus-within:shadow-[0_0_0_3px_rgba(181,141,91,0.06)]">
                <Textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={target ? `对${target.name}说些什么，或描述你的行动…` : "描述你接下来想做什么…"}
                  aria-label="玩家行动输入"
                  className="min-h-12 resize-none border-0 bg-transparent px-2 py-2.5 text-sm leading-6 text-[#dedbd2] shadow-none placeholder:text-[#58615c] focus-visible:ring-0"
                />
                <Button size="icon" aria-label="提交行动" onClick={() => submitAction()} disabled={!input.trim() || thinking} className="size-10 shrink-0 rounded-xl bg-[#bd925d] text-[#171813] hover:bg-[#d0a56e] disabled:bg-white/8 disabled:text-[#59615c]">
                  <Send className="size-4" />
                </Button>
              </div>
              <p className="mt-2 text-center text-[10px] text-[#515a55]">Enter 提交 · Shift + Enter 换行 · 当前验证 Manager ↔ Entity 场景会话</p>
            </div>
          </div>
        </section>

        <aside className="order-3 min-w-0">
          <PlayerPanel
            game={game}
            targetId={game.target}
            visibleMemories={visibleMemories}
            thinking={thinking}
            onFavorite={toggleFavorite}
            onForget={forgetMemory}
            onAction={submitAction}
            onGenerateItem={generateItem}
          />
        </aside>
      </div>
    </main>
  );
}

function StoryEntry({ entry }: { entry: GameState["log"][number] }) {
  if (entry.kind === "player") {
    return <div className="flex justify-end"><div className="max-w-[84%] rounded-2xl rounded-br-md border border-[#8c7451]/25 bg-[#8c7451]/12 px-4 py-3 text-sm leading-6 text-[#e5dac7]">{entry.text}</div></div>;
  }
  if (entry.kind === "system") {
    return <div className="flex items-center gap-3 py-1 text-[11px] leading-5 text-[#6f7a73] before:h-px before:flex-1 before:bg-white/[0.065] after:h-px after:flex-1 after:bg-white/[0.065]"><span className="max-w-[78%] text-center">{entry.text}</span></div>;
  }
  if (entry.kind === "npc") {
    return (
      <div className="flex gap-3">
        <div className="mt-1 grid size-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 font-serif text-xs text-[#c9a978]">{entry.speaker?.slice(0, 1)}</div>
        <div className="max-w-[86%]">
          <p className="mb-1.5 text-[11px] font-medium tracking-wide text-[#b99463]">{entry.speaker}</p>
          <div className="rounded-2xl rounded-tl-md border border-white/[0.075] bg-white/[0.035] px-4 py-3 text-sm leading-7 text-[#d5d5cd]">{entry.text}</div>
        </div>
      </div>
    );
  }
  return <div className="relative py-1 pl-5 font-serif text-[15px] leading-8 text-[#b9bbb4] before:absolute before:left-0 before:top-3 before:h-[calc(100%-20px)] before:w-px before:bg-gradient-to-b before:from-[#b48d5d]/50 before:to-transparent">{entry.text}</div>;
}

function NpcCard({ npcId, selected, favored, thinking, onSelect, onTalk, onFavorite }: { npcId: NpcId; selected: boolean; favored: boolean; thinking: boolean; onSelect: () => void; onTalk: () => void; onFavorite: () => void }) {
  const npc = NPC_MAP[npcId];
  return (
    <div className={`rounded-2xl border p-3 transition ${selected ? "border-[#b8905d]/30 bg-[#b8905d]/8" : "border-white/[0.065] bg-black/10"}`}>
      <button type="button" className="flex w-full items-center gap-3 text-left" onClick={onSelect}>
        <div className="grid size-10 shrink-0 place-items-center rounded-full border border-white/10 text-sm font-semibold" style={{ backgroundColor: `${npc.color}18`, color: npc.color }}>{npc.portrait}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><p className="truncate text-sm font-medium text-[#dcd9d0]">{npc.name}</p>{favored && <Heart className="size-3 fill-[#bc725f] text-[#bc725f]" />}</div>
          <p className="text-[11px] text-[#747f78]">{npc.role}</p>
        </div>
        <ChevronRight className={`size-4 ${selected ? "text-[#c29a66]" : "text-[#4f5853]"}`} />
      </button>
      {selected && (
        <div className="mt-3 border-t border-white/[0.065] pt-3">
          <p className="text-[11px] leading-5 text-[#7e8882]">{npc.firstImpression}</p>
          <div className="mt-3 flex items-center gap-2">
            <Button size="sm" className="h-8 flex-1 bg-[#b58b57]/18 text-[#d9b27e] hover:bg-[#b58b57]/28" onClick={onTalk} disabled={thinking}><MessageCircle className="size-3.5" />交谈</Button>
            <Button size="icon" variant="outline" aria-label={favored ? `取消关注${npc.name}` : `关注${npc.name}`} className={`size-8 border-white/10 ${favored ? "bg-[#b96859]/15 text-[#ce7a68]" : "bg-transparent text-[#737e77] hover:text-[#ce7a68]"}`} onClick={onFavorite}><Heart className={`size-3.5 ${favored ? "fill-current" : ""}`} /></Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ManagerSheet({ game, onReset, onNarrationInstructionChange }: { game: GameState; onReset: () => void; onNarrationInstructionChange: (value: string) => void }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="border-white/10 bg-white/[0.035] text-[#cbd0cb] hover:bg-white/[0.075] hover:text-white"><Eye className="size-4" /><span className="hidden sm:inline">管理者视角</span></Button>
      </SheetTrigger>
      <SheetContent className="w-[92vw] border-white/10 bg-[#141916] text-[#e7e2d7] sm:max-w-[500px]">
        <SheetHeader className="border-b border-white/8 px-6 py-5">
          <SheetTitle className="flex items-center gap-2 font-serif text-xl text-[#eee5d5]"><ShieldCheck className="size-5 text-[#cba46c]" />管理者视角</SheetTitle>
          <SheetDescription className="text-[#89938d]">管理者与世界规则读取事实、后台意图和事件记录；实体 agent 接收各自的投影视图。</SheetDescription>
        </SheetHeader>
        <div className="scrollbar-thin flex-1 space-y-7 overflow-y-auto px-6 py-5">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="eyebrow">玩家叙事偏好</h2>
                <p className="mt-1 text-[11px] leading-5 text-[#707b74]">作为最终成文的附加提示；不改变事实、权限或实体认知。</p>
              </div>
              <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[10px] text-[#8b958f]" onClick={() => onNarrationInstructionChange(DEFAULT_MANAGER_NARRATION_INSTRUCTION)}>恢复默认</Button>
            </div>
            <Textarea
              value={game.managerNarrationInstruction}
              onChange={(event) => onNarrationInstructionChange(event.target.value)}
              aria-label="管理者叙事偏好"
              className="min-h-32 border-white/10 bg-black/15 text-xs leading-6 text-[#c4c7c0]"
              placeholder="例如：少复述我的输入，多描写行动结果与人物反应……"
            />
          </section>
          <section>
            <div className="mb-3 flex items-center justify-between"><h2 className="eyebrow">权威事实</h2><Badge className="border-[#c69b62]/20 bg-[#c69b62]/10 text-[#d3ad79]">{game.facts.length}</Badge></div>
            <div className="space-y-2">{game.facts.map((fact) => <div key={fact.id} className="rounded-xl border border-white/8 bg-black/15 p-3.5"><p className="text-sm leading-6 text-[#d8d8cf]">{fact.text}</p><p className="mt-1.5 text-[11px] text-[#66716a]">来源：{fact.source} · {fact.id}</p></div>)}</div>
          </section>
          <section>
            <div className="mb-3 flex items-center justify-between"><h2 className="eyebrow">意图队列</h2><Badge className="border-[#6f9586]/20 bg-[#6f9586]/10 text-[#93b2a6]">{game.intents.filter((intent) => intent.status === "pending").length} 待处理</Badge></div>
            <div className="space-y-2">{game.intents.map((intent) => <div key={intent.id} className="flex gap-3 rounded-xl border border-white/8 bg-black/15 p-3.5"><div className="grid size-7 shrink-0 place-items-center rounded-full bg-white/5 text-xs">{NPC_MAP[intent.actorId].portrait}</div><div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><p className="text-sm text-[#d8d8cf]">{NPC_MAP[intent.actorId].name}</p><span className={intent.status === "pending" ? "text-[11px] text-[#c59d67]" : "text-[11px] text-[#69716c]"}>{intent.status === "pending" ? `回合 ${intent.dueTurn}` : "已解决"}</span></div><p className="mt-1 text-xs leading-5 text-[#858e88]">{intent.text}</p></div></div>)}</div>
          </section>
          <section>
            <h2 className="mb-3 eyebrow">最近事件</h2>
            <div className="relative space-y-0 pl-4 before:absolute before:inset-y-1 before:left-[3px] before:w-px before:bg-white/10">{game.events.slice(-8).reverse().map((event) => <div key={event.id} className="relative pb-4 pl-3 text-sm leading-5 text-[#aeb5af] before:absolute before:left-[-15px] before:top-1.5 before:size-2 before:rounded-full before:border before:border-[#b18c5d] before:bg-[#171c19]"><span className="mr-2 text-[10px] text-[#5f6963]">T{event.turn}</span>{event.text}</div>)}</div>
          </section>
        </div>
        <div className="border-t border-white/8 p-5"><Button variant="outline" className="w-full border-white/10 bg-transparent text-[#aeb6b0] hover:bg-white/5 hover:text-white" onClick={onReset}>重新开始这个雨夜</Button></div>
      </SheetContent>
    </Sheet>
  );
}

function PlayerPanel({ game, targetId, visibleMemories, thinking, onFavorite, onForget, onAction, onGenerateItem }: { game: GameState; targetId: NpcId | null; visibleMemories: GameState["memories"]; thinking: boolean; onFavorite: (id: NpcId) => void; onForget: (id: string) => void; onAction: (action: string) => void; onGenerateItem: (idea: string) => Promise<ItemRecord> }) {
  const target = targetId ? NPC_MAP[targetId] : null;
  const [itemIdea, setItemIdea] = useState("一件来自费伦商路、适合新冒险者的实用小物");
  const [selectedItem, setSelectedItem] = useState<ItemRecord | null>(game.inventory[0] ?? null);
  const [generatingItem, setGeneratingItem] = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);

  async function createItem() {
    if (!itemIdea.trim() || generatingItem) return;
    setGeneratingItem(true);
    setItemError(null);
    try {
      const item = await onGenerateItem(itemIdea.trim());
      setSelectedItem(item);
    } catch (cause) {
      setItemError(cause instanceof Error ? cause.message : "物品生成失败");
    } finally {
      setGeneratingItem(false);
    }
  }
  return (
    <section className="panel-surface overflow-hidden xl:h-[calc(100vh-98px)] xl:min-h-[720px]">
      <Tabs defaultValue="now" className="h-full gap-0">
        <TabsList variant="line" className="grid h-12 w-full grid-cols-3 border-b border-white/[0.075] px-3"><TabsTrigger value="now" className="text-xs text-[#77827b] data-[state=active]:text-[#d8c6aa]">此刻</TabsTrigger><TabsTrigger value="memory" className="text-xs text-[#77827b] data-[state=active]:text-[#d8c6aa]">记忆</TabsTrigger><TabsTrigger value="quest" className="text-xs text-[#77827b] data-[state=active]:text-[#d8c6aa]">任务</TabsTrigger></TabsList>
        <div className="scrollbar-thin h-[calc(100%-48px)] overflow-y-auto p-4">
          <TabsContent value="now" className="space-y-5">
            <section><p className="eyebrow">玩家状态</p><div className="mt-3 grid grid-cols-2 gap-2"><div className="stat-card"><Coins className="size-4 text-[#caa15f]" /><div><p className="text-[10px] text-[#6d7771]">铜币</p><p className="text-lg font-semibold text-[#ded5c6]">{game.coins}</p></div></div><div className="stat-card"><Package className="size-4 text-[#7e9b8b]" /><div><p className="text-[10px] text-[#6d7771]">物品</p><p className="text-lg font-semibold text-[#ded5c6]">{game.inventory.length}</p></div></div></div></section>
            <section>
              <div className="mb-3 flex items-center justify-between"><p className="eyebrow">正在交谈</p>{target && <SoftBadge>{target.role}</SoftBadge>}</div>
              {target ? <div className="rounded-2xl border border-white/[0.075] bg-black/15 p-4"><div className="flex items-center gap-3"><div className="grid size-12 place-items-center rounded-full border border-white/10 font-semibold" style={{ backgroundColor: `${target.color}18`, color: target.color }}>{target.portrait}</div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="font-serif text-lg text-[#e0d9cd]">{target.name}</h3>{game.favorite === target.id && <Heart className="size-3.5 fill-[#c87866] text-[#c87866]" />}</div><p className="text-[11px] text-[#737e77]">关系 {game.relationship[target.id]} · 热度 {game.heat[target.id]}</p></div></div><div className="mt-4 space-y-3"><Meter label="关系" value={game.relationship[target.id]} color="[#77947f]" /><Meter label="热度" value={game.heat[target.id]} color="[#bd775a]" flame /></div><Button variant="outline" size="sm" className={`mt-4 w-full border-white/10 ${game.favorite === target.id ? "bg-[#b96757]/10 text-[#cb7866]" : "bg-transparent text-[#a2aaa4]"}`} onClick={() => onFavorite(target.id)}><Heart className={`size-3.5 ${game.favorite === target.id ? "fill-current" : ""}`} />{game.favorite === target.id ? "正在受到聚光" : "让这段关系更受关注"}</Button></div> : <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-xs text-[#6e7872]">当前场景没有交谈对象</div>}
            </section>
            <section>
              <p className="eyebrow">随身物品</p>
              <div className="mt-3 space-y-2">{game.inventory.map((item) => <button key={item.id} type="button" onClick={() => setSelectedItem(item)} className={`w-full rounded-xl border p-3 text-left transition ${selectedItem?.id === item.id ? "border-[#b8905d]/30 bg-[#b8905d]/8" : "border-white/[0.07] bg-black/10 hover:bg-white/[0.035]"}`}><div className="flex items-center justify-between gap-2"><span className="text-sm text-[#d5d4cc]">{item.name}</span><span className="text-[10px] text-[#9b865f]">{item.rarity}</span></div><p className="mt-1 text-[10px] text-[#68736c]">{item.category}</p></button>)}</div>
              {selectedItem && <article className="mt-3 rounded-2xl border border-white/[0.075] bg-black/15 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-serif text-base text-[#e1d9ca]">{selectedItem.name}</h3><p className="mt-1 text-[10px] text-[#8f7958]">{selectedItem.rarity} · {selectedItem.category}</p></div><Package className="size-4 text-[#8aa08f]" /></div><p className="mt-3 text-xs leading-5 text-[#9ca49e]">{selectedItem.appearance}</p><p className="mt-3 text-xs leading-5 text-[#c0c3bc]">用途：{selectedItem.use}</p><p className="mt-3 border-t border-white/7 pt-3 text-[11px] leading-5 text-[#747f78]">{selectedItem.description}</p><div className="mt-3 flex flex-wrap gap-1.5">{selectedItem.tags.map((tag) => <SoftBadge key={tag}>{tag}</SoftBadge>)}</div></article>}
              <div className="mt-4 space-y-2"><Textarea value={itemIdea} onChange={(event) => setItemIdea(event.target.value)} aria-label="物品生成想法" className="min-h-20 border-white/10 bg-black/15 text-xs leading-5" /><Button type="button" variant="outline" size="sm" className="w-full border-white/10 bg-transparent text-[#b9bdb7]" disabled={generatingItem || !itemIdea.trim()} onClick={createItem}>{generatingItem ? "正在生成物品…" : "生成一件测试物品"}</Button>{itemError && <p className="text-[11px] text-[#c98472]">{itemError}</p>}</div>
            </section>
          </TabsContent>
          <TabsContent value="memory" className="space-y-3">
            <div className="mb-4"><p className="eyebrow">角色可回忆内容</p><p className="mt-2 text-xs leading-5 text-[#707b74]">记忆永久入库；当前强度决定注入实体 agent 时的表达精度。</p></div>
            {visibleMemories.map((memory) => { const level = memoryLabel(memory.strength); return <article key={memory.id} className="rounded-2xl border border-white/[0.075] bg-black/12 p-3.5"><div className="mb-2 flex justify-between"><span className={`text-[11px] font-medium ${level.tone}`}>{level.label}</span><span className="text-[10px] text-[#59635d]">{memory.strength}%</span></div><p className="text-sm leading-6 text-[#c7cac3]">{memory.text}</p><div className="mt-3 flex justify-between"><span className="text-[10px] text-[#606a64]">{memory.source}</span><button type="button" onClick={() => onForget(memory.id)} className="text-[10px] text-[#707a74] hover:text-[#b77868]">选择淡忘</button></div></article>; })}
            {!visibleMemories.length && <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-xs text-[#66716a]">普通回忆上下文为空</div>}
          </TabsContent>
          <TabsContent value="quest" className="space-y-4">
            <div><p className="eyebrow">当前任务</p><p className="mt-2 text-xs leading-5 text-[#707b74]">悬赏板把叙事目标映射为可追踪的世界状态。</p></div>
            <article className={`rounded-2xl border p-4 ${game.questStatus === "active" ? "border-[#b58b57]/30 bg-[#b58b57]/8" : "border-white/[0.075] bg-black/12"}`}><div className="flex items-start justify-between"><div className="grid size-9 place-items-center rounded-xl bg-[#b58b57]/12 text-[#cda46f]"><ScrollText className="size-4" /></div><Badge className={game.questStatus === "active" ? "border-[#77947f]/20 bg-[#77947f]/12 text-[#9bb3a1]" : "border-white/10 bg-white/5 text-[#7e8882]"}>{game.questStatus === "active" ? "进行中" : "尚未接受"}</Badge></div><h3 className="mt-4 font-serif text-lg text-[#dfd7ca]">失踪的信使</h3><p className="mt-2 text-xs leading-6 text-[#7f8983]">信使伊安两日前前往北林，此后没有回村。找到他，或者带回足以确认其下落的证据。</p><div className="mt-4 flex justify-between border-t border-white/[0.065] pt-3 text-[11px]"><span className="text-[#68726c]">委托：村务所</span><span className="text-[#c59c63]">报酬 24 铜币</span></div>{game.questStatus === "available" && game.location !== "board" && <Button size="sm" variant="outline" className="mt-4 w-full border-white/10 bg-transparent text-[#a7afa9]" onClick={() => onAction("前往悬赏板")} disabled={thinking}>前往悬赏板</Button>}</article>
            {game.questStatus === "active" && <div className="rounded-2xl border border-white/[0.075] bg-white/[0.025] p-4"><p className="text-xs font-medium text-[#aeb5af]">已知线索</p><ul className="mt-3 space-y-2 text-xs leading-5 text-[#747f78]"><li>· 最后出现地点是北林岔路。</li><li>· 诺拉认为脚印被人为扫除。</li></ul></div>}
          </TabsContent>
        </div>
      </Tabs>
    </section>
  );
}

function Meter({ label, value, flame }: { label: string; value: number; color: string; flame?: boolean }) {
  return <div><div className="mb-1.5 flex justify-between text-[10px] text-[#6e7972]"><span className="flex items-center gap-1">{flame && <Flame className="size-3" />}{label}</span><span>{value}%</span></div><Progress value={value} className={`h-1.5 bg-white/7 ${flame ? "[&_[data-slot=progress-indicator]]:bg-[#bd775a]" : "[&_[data-slot=progress-indicator]]:bg-[#77947f]"}`} /></div>;
}
