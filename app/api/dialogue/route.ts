import { NextResponse } from "next/server";
import { z } from "zod";

import {
  ENTITY_PROFILES,
  entityAtLocation,
  entityTurnSchema,
  managerRouteSchema,
  parseJsonObject,
  type ManagerSceneEntry,
  type SceneMessage,
} from "@/lib/airp-core";
import {
  compactSession,
  entityPrompt,
  managerNarrationPrompt,
  managerRoutingPrompt,
  managerSceneContext,
  packetText,
} from "@/lib/airp-prompts";
import { callDeepSeekJson } from "@/lib/deepseek";

const requestSchema = z.object({
  playerText: z.string().min(1).max(4000),
  locationId: z.string(),
  locationDescription: z.string().max(2000),
  sessions: z.record(z.string(), z.array(z.object({
    role: z.enum(["manager", "entity"]),
    content: z.string().max(6000),
  }))).default({}),
  managerTranscript: z.array(z.object({
    seq: z.number().int().nonnegative(),
    kind: z.enum(["player_input", "manager_packet", "entity_turn", "manager_narrative"]),
    content: z.string().max(8000),
    actorId: z.string().optional(),
  })).max(200).default([]),
  managerNarrationInstruction: z.string().max(4000).default(""),
});

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());
    const nearby = entityAtLocation(body.locationId);
    const managerHistory = managerSceneContext(body.managerTranscript as ManagerSceneEntry[]);
    const routeRaw = await callDeepSeekJson([
      { role: "system", content: managerRoutingPrompt(nearby) },
      { role: "user", content: `场景：${body.locationDescription}\n\n本 Scene 中管理者此前的完整记录：\n${managerHistory}\n\n玩家本轮：${body.playerText}` },
    ], 0.2);
    const packet = managerRouteSchema.parse(parseJsonObject(routeRaw));

    if (!packet.targetEntityId) {
      const finalRaw = await callDeepSeekJson([
        { role: "system", content: managerNarrationPrompt(body.managerNarrationInstruction) },
        { role: "user", content: `本 Scene 中管理者此前的完整记录：\n${managerHistory}\n\n本轮已裁定材料：\n${JSON.stringify({ managerPacket: packet, entityTurn: null })}` },
      ], 0.4);
      const narrative = z.object({ narrative: z.string() }).parse(parseJsonObject(finalRaw)).narrative;
      console.info("airp.dialogue", { managerHistoryEntries: body.managerTranscript.length, entityHistoryEntries: 0, targetEntityId: null });
      return NextResponse.json({ narrative, targetEntityId: null, targetName: null, managerPacket: packet, entityTurn: null });
    }

    const entity = ENTITY_PROFILES.find((candidate) => candidate.id === packet.targetEntityId && candidate.locationId === body.locationId);
    if (!entity) throw new Error("管理者选择了当前场景之外的人物");
    const history = (body.sessions[entity.id] ?? []) as SceneMessage[];
    const entityRaw = await callDeepSeekJson([
      { role: "system", content: entityPrompt(entity) },
      ...compactSession(history),
      { role: "user", content: packetText(packet) },
    ], 0.4);
    const entityTurn = entityTurnSchema.parse(parseJsonObject(entityRaw));

    const finalRaw = await callDeepSeekJson([
      { role: "system", content: managerNarrationPrompt(body.managerNarrationInstruction) },
      { role: "user", content: `本 Scene 中管理者此前的完整记录：\n${managerHistory}\n\n本轮已裁定材料：\n${JSON.stringify({ managerPacket: packet, publicEntityTurn: { speech: entityTurn.speech, action: entityTurn.action } })}` },
    ], 0.4);
    const narrative = z.object({ narrative: z.string() }).parse(parseJsonObject(finalRaw)).narrative;
    console.info("airp.dialogue", { managerHistoryEntries: body.managerTranscript.length, entityHistoryEntries: history.length, targetEntityId: entity.id });
    return NextResponse.json({ narrative, targetEntityId: entity.id, targetName: entity.name, managerPacket: packet, entityTurn });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
