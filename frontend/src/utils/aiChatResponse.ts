const API_KEY =
  import.meta.env.PUBLIC_AI_API_KEY ||
  import.meta.env.VITE_AI_API_KEY ||
  import.meta.env.VITE_GOOGLE_API_KEY;

type IncomingMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type GeminiPart = { text: string };
type GeminiContent = {
  role: "user" | "model";
  parts: GeminiPart[];
};

function toGeminiContents(messages: IncomingMessage[]): GeminiContent[] {
  return messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
}

function extractGeminiText(data: any): string {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((p) => (typeof p?.text === "string" ? p.text : ""))
    .join("\n")
    .trim();
}

export async function POST(req: Request) {
  try {
    if (!API_KEY) {
      return Response.json(
        { error: { message: "Missing Gemini API key" } },
        { status: 500 }
      );
    }

    const { messages } = await req.json();
    const incomingMessages: IncomingMessage[] = Array.isArray(messages)
      ? messages
      : [];

    const systemInstruction = `Answer only questions about local locations, local businesses, and local trip planning.
If the user asks anything outside local places/trips, politely refuse and redirect back to local recommendations.
Never ask the user to provide or confirm their location.
Use the context provided in the conversation for current location and selected POIs.
Use bullet points with the symbol • for recommendation lists.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
        API_KEY
      )}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
          contents: toGeminiContents(incomingMessages),
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 800,
          },
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      return Response.json(data, { status: response.status });
    }

    const assistantText = extractGeminiText(data);
    const normalized = assistantText || "I could not generate a response.";

    return Response.json({
      choices: [{ message: { content: normalized } }],
      provider: "gemini",
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: { message: "Failed to communicate with Gemini" } },
      { status: 500 }
    );
  }
}
