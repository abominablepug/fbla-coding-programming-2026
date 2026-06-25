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

// Convert OpenAI-style chat roles into Gemini-compatible content structure.
function toGeminiContents(messages: IncomingMessage[]): GeminiContent[] {
  return messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
}

// Read combined plain text response from Gemini candidate parts.
function extractGeminiText(data: any): string {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((p) => (typeof p?.text === "string" ? p.text : ""))
    .join("\n")
    .trim();
}

// Get finish reason to detect truncation and request continuation.
function extractFinishReason(data: any): string {
  const finishReason = data?.candidates?.[0]?.finishReason;
  return typeof finishReason === "string" ? finishReason : "";
}

// Send one generation request using shared system instructions and settings.
async function requestGemini(
  systemInstruction: string,
  contents: GeminiContent[],
  maxOutputTokens = 2048
) {
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
        contents,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens,
        },
      }),
    }
  );

  const data = await response.json();
  return { response, data };
}

// Handle chat request and stitch continuation when token limit is reached.
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

    const baseContents = toGeminiContents(incomingMessages);
    let combinedText = "";

    const first = await requestGemini(systemInstruction, baseContents, 2048);
    const { response } = first;
    const data = first.data;
    if (!response.ok) {
      return Response.json(data, { status: response.status });
    }
    combinedText = extractGeminiText(data);

    const finishReason = extractFinishReason(data);
    if (finishReason === "MAX_TOKENS" && combinedText) {
      const continuationContents: GeminiContent[] = [
        ...baseContents,
        { role: "model", parts: [{ text: combinedText }] },
        {
          role: "user",
          parts: [{ text: "Continue from exactly where you stopped. Do not repeat prior lines." }],
        },
      ];
      const second = await requestGemini(systemInstruction, continuationContents, 1536);
      if (second.response.ok) {
        const continuation = extractGeminiText(second.data);
        if (continuation) {
          combinedText = `${combinedText}\n${continuation}`.trim();
        }
      }
    }

    const normalized = combinedText || "I could not generate a response.";

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
