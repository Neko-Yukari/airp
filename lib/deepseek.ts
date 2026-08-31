export type DeepSeekMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function callDeepSeekJson(messages: DeepSeekMessage[], temperature = 0.7) {
  const apiKey = process.env.DEEPSEEK_API_KEY ?? process.env.deepseek_api;
  if (!apiKey) throw new Error("站点尚未配置 DeepSeek API 密钥");

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages,
          response_format: { type: "json_object" },
          temperature,
        }),
      });
      if (!response.ok) {
        const retryable = response.status === 429 || response.status >= 500;
        const error = new Error(`DeepSeek 请求失败（${response.status}）`);
        if (!retryable) throw error;
        lastError = error;
        continue;
      }
      const data = await response.json() as { choices?: { message?: { content?: string } }[] };
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("DeepSeek 返回了空响应");
      return content;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("DeepSeek 调用失败");
      if (attempt === 1) break;
    }
  }
  throw lastError ?? new Error("DeepSeek 调用失败");
}
