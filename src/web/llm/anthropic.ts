export async function callAnthropic(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-latest",
      max_tokens: 1400,
      messages: [{ role: "user", content: prompt }]
    })
  });
  if (!response.ok) throw new Error(`Anthropic request failed: ${response.status}`);
  const data = (await response.json()) as { content?: Array<{ type?: string; text?: string }> };
  const text = data.content?.find((part) => part.type === "text" || part.text)?.text;
  if (!text) throw new Error("Anthropic returned no text.");
  return text;
}
