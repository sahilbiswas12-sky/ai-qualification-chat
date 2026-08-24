import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";

import { chatModel, systemPrompt } from "@/lib/ai-config";
import { scoreProjectQualification } from "@/lib/tools/score-project-qualification";

export const maxDuration = 30;

const TEST_RATE_LIMIT = "[test:429]";
const TEST_SERVER_ERROR = "[test:500]";
const TEST_SLOW_RESPONSE = "[test:slow]";
const TEST_MID_STREAM = "[test:midstream]";

function getLastUserMessage(messages: UIMessage[]) {
  const lastUserMessage = messages.findLast(
    (message) => message.role === "user",
  );

  if (!lastUserMessage) {
    return "";
  }

  return lastUserMessage.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("")
    .trim()
    .toLowerCase();
}

function delay(milliseconds: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function createInterruptedResponse(response: Response) {
  if (!response.body) {
    return new Response("The AI response was interrupted.", {
      status: 500,
    });
  }

  const reader = response.body.getReader();
  let receivedChunks = 0;

  const interruptedStream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();

        if (done) {
          controller.close();
          return;
        }

        controller.enqueue(value);
        receivedChunks += 1;

        if (receivedChunks >= 3) {
          await reader.cancel();
          controller.error(
            new Error(
              "The connection was interrupted while the AI was responding.",
            ),
          );
        }
      } catch (error) {
        controller.error(error);
      }
    },

    async cancel(reason) {
      await reader.cancel(reason);
    },
  });

  return new Response(interruptedStream, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

export async function POST(request: Request) {
  try {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return new Response(
        "The AI service is not configured. Please contact the administrator.",
        { status: 500 },
      );
    }

    const body = (await request.json()) as {
      messages?: UIMessage[];
    };

    const messages = body.messages ?? [];

    if (messages.length === 0) {
      return new Response(
        "Please enter a project idea before sending.",
        { status: 400 },
      );
    }

    const lastUserMessage = getLastUserMessage(messages);

    if (lastUserMessage === TEST_RATE_LIMIT) {
      return new Response(
        "The AI service is receiving too many requests. Please wait a moment and retry the failed response.",
        {
          status: 429,
          headers: {
            "Retry-After": "5",
          },
        },
      );
    }

    if (lastUserMessage === TEST_SERVER_ERROR) {
      return new Response(
        "The AI service is temporarily unavailable. Please retry the failed response.",
        { status: 500 },
      );
    }

    if (lastUserMessage === TEST_SLOW_RESPONSE) {
      await delay(5000);
    }

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

    const response = result.toUIMessageStreamResponse({
      originalMessages: messages,

      onError(error) {
        console.error("UI message stream error:", error);

        if (
          error instanceof Error &&
          error.message.includes("qualification service")
        ) {
          return error.message;
        }

        return "The AI response was interrupted. Please retry the failed response.";
      },
    });

    if (lastUserMessage === TEST_MID_STREAM) {
      return createInterruptedResponse(response);
    }

    return response;
  } catch (error) {
    console.error("Chat route error:", error);

    if (error instanceof SyntaxError) {
      return new Response(
        "The request contained invalid information. Please try again.",
        { status: 400 },
      );
    }

    return new Response(
      "Unable to generate a response. Please retry the failed response.",
      { status: 500 },
    );
  }
}