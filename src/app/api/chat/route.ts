import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";

import { chatModel, systemPrompt } from "@/lib/ai-config";
import { scoreProjectQualification } from "@/lib/tools/score-project-qualification";

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

      system: `${systemPrompt}

You have access to the scoreProjectQualification tool.

Call this tool when:
- The user asks to score, assess, evaluate or qualify a project.
- The user requests a readiness analysis.
- The project details are sufficiently clear.
- The user asks for the final qualification score.

Before calling the tool, collect the project name, problem, target users and core features. Technology, timeline and budget are optional.

After the tool returns its result, briefly explain the most important recommendation. Do not reproduce the complete result as plain text because the interface renders it as a visual score card.`,

      messages: await convertToModelMessages(messages),

      tools: {
        scoreProjectQualification,
      },

      stopWhen: stepCountIs(5),
      abortSignal: request.signal,

      onError({ error }) {
        console.error("Gemini streaming error:", error);
      },
    });

    return result.toUIMessageStreamResponse({
      originalMessages: messages,

      onError(error) {
        console.error("UI message stream error:", error);

        if (
          error instanceof Error &&
          error.message.includes("qualification service")
        ) {
          return error.message;
        }

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