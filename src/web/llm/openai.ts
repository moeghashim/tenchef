import { DEFAULT_OPENAI_MODEL } from "./models";

export async function callOpenAi(
  apiKey: string,
  prompt: string,
  model: string = DEFAULT_OPENAI_MODEL
): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }]
    })
  });
  if (!response.ok) throw new Error(`OpenAI request failed: ${response.status}`);
  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("OpenAI returned no text.");
  return text;
}
