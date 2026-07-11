import { DEFAULT_OPENAI_MODEL } from "./models";

function headers(apiKey: string): Record<string, string> {
  return {
    "content-type": "application/json",
    authorization: `Bearer ${apiKey}`
  };
}

export async function callOpenAi(
  apiKey: string,
  prompt: string,
  model: string = DEFAULT_OPENAI_MODEL
): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: headers(apiKey),
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

export async function validateOpenAiKey(apiKey: string, model: string): Promise<string | null> {
  try {
    const response = await fetch(`https://api.openai.com/v1/models/${encodeURIComponent(model)}`, {
      method: "GET",
      headers: headers(apiKey)
    });
    if (response.ok) return null;
    if (response.status === 401) return "OpenAI rejected this API key.";
    if (response.status === 404) return `OpenAI does not recognize the model "${model}".`;
    return `OpenAI returned an error (${response.status}). Check the key and model.`;
  } catch {
    return "Could not reach the OpenAI API. Check your connection.";
  }
}
