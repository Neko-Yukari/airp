import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const prompts = await readFile(new URL("../lib/airp-prompts.ts", import.meta.url), "utf8");
const core = await readFile(new URL("../lib/airp-core.ts", import.meta.url), "utf8");

test("preserves exact player speech in manager perception packets", () => {
  assert.match(prompts, /heardSpeech 必须逐字保留玩家说出口的原话/);
});

test("distinguishes deliberate deception from unsupported memory", () => {
  assert.match(prompts, /你可以撒谎、误导、隐瞒或编造掩护说法/);
  assert.match(prompts, /在 privateNote 中自然说明你实际知道什么/);
  assert.match(prompts, /不需要套用固定分类/);
  assert.doesNotMatch(core, /responseMode|privateBasis/);
});

test("continues from player input instead of replaying it", () => {
  assert.match(prompts, /从玩家行动产生效果的时刻开始续写/);
  assert.match(prompts, /不要再次引用、转述或改写玩家已经说出口的对白/);
  assert.match(prompts, /主要篇幅用于新信息/);
  assert.match(prompts, /玩家当前叙事偏好/);
  assert.match(prompts, /只调整最终文本的表达方式/);
});
