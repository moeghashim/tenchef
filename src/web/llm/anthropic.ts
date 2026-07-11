import { DEFAULT_ANTHROPIC_MODEL } from "./models";

function headers(apiKey: string): Record<string, string> {
  return {
    "content-type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "anthropic-dangerous-direct-browser-access": "true"
  };
}

export async function callAnthropic(
  apiKey: string,
  prompt: string,
  model: string = DEFAULT_ANTHROPIC_MODEL
): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: headers(apiKey),
    body: JSON.stringify({
      model,
      // Current Sonnet models think adaptively by default and thinking counts
      // toward max_tokens, so leave generous headroom for the JSON revision.
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }]
    })
  });
  if (!response.ok) throw new Error(`Anthropic request failed: ${response.status}`);
  const data = (await response.json()) as { content?: Array<{ type?: string; text?: string }> };
  const text = data.content?.find((part) => part.type === "text" && part.text)?.text;
  if (!text) throw new Error("Anthropic returned no text.");
  return text;
}

export async function validateAnthropicKey(apiKey: string, model: string): Promise<string | null> {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: headers(apiKey),
      body: JSON.stringify({ model, max_tokens: 1, messages: [{ role: "user", content: "ping" }] })
    });
    if (response.ok) return null;
    if (response.status === 401) return "Anthropic rejected this API key.";
    if (response.status === 404) return `Anthropic does not recognize the model "${model}".`;
    return `Anthropic returned an error (${response.status}). Check the key and model.`;
  } catch {
    return "Could not reach the Anthropic API. Check your connection.";
  }
}
