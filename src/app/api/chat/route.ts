import {
  convertToModelMessages,
  streamText,
  type UIMessage,
} from "ai";

import { chatModel, systemPrompt } from "@/lib/ai-config";

export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return Response.json(
        { error: "Gemini API key is missing." },
        { status: 500 },
      );
    }

    const { messages }: { messages: UIMessage[] } =
      await request.json();

    const result = streamText({
      model: chatModel,
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      abortSignal: request.signal,

      onError({ error }) {
        console.error("Gemini streaming error:", error);
      },
    });

    return result.toUIMessageStreamResponse({
      originalMessages: messages,

      onError(error) {
        console.error("UI message stream error:", error);
        return "Gemini could not generate a response.";
      },
    });
  } catch (error) {
    console.error("Chat route error:", error);

    return Response.json(
      { error: "Unable to generate a response." },
      { status: 500 },
    );
  }
}