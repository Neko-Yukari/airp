import { NextResponse } from "next/server";
import { z } from "zod";

import { itemRecordSchema, parseJsonObject } from "@/lib/airp-core";
import { FAERUN_SETTING } from "@/lib/airp-prompts";
import { callDeepSeekJson } from "@/lib/deepseek";

const requestSchema = z.object({ idea: z.string().min(1).max(1000) });

export async function POST(request: Request) {
  try {
    const { idea } = requestSchema.parse(await request.json());
    const content = await callDeepSeekJson([
      { role: "system", content: `你是费伦物品设计器。${FAERUN_SETTING}\n根据用户想法生成一件克制、可用于叙事的物品。只输出 JSON：{"id":"item:英文短标识","name":"中文名","category":"类别","rarity":"普通|精良|稀有|珍奇|传说","appearance":"外观","use":"用途","description":"背景与细节","tags":["标签"]}` },
      { role: "user", content: idea },
    ], 0.8);
    return NextResponse.json(itemRecordSchema.parse(parseJsonObject(content)));
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
