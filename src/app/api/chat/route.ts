import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";

import { chatModel, systemPrompt } from "@/lib/ai-config";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";
import { scoreProjectQualification } from "@/lib/tools/score-project-qualification";

export const maxDuration = 30;

const MAX_REQUEST_BYTES = 32_000;
const MAX_MESSAGES = 20;
const MAX_TEXT_CHARACTERS = 8_000;

const TEST_RATE_LIMIT = "[test:429]";
const TEST_SERVER_ERROR = "[test:500]";
const TEST_SLOW_RESPONSE = "[test:slow]";
const TEST_MID_STREAM = "[test:midstream]";

const MIDSTREAM_TEST_COOKIE = "ai-qualification-midstream-tested";

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

function countTextCharacters(messages: UIMessage[]) {
  return messages.reduce((messageTotal, message) => {
    const partTotal = message.parts.reduce((total, part) => {
      if (part.type !== "text") {
        return total;
      }

      return total + part.text.length;
    }, 0);

    return messageTotal + partTotal;
  }, 0);
}

function isValidMessageList(value: unknown): value is UIMessage[] {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.every((message) => {
    if (
      typeof message !== "object" ||
      message === null ||
      !("role" in message) ||
      !("parts" in message)
    ) {
      return false;
    }

    return typeof message.role === "string" && Array.isArray(message.parts);
  });
}

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function hasMidstreamTestCookie(request: Request) {
  const cookies = request.headers.get("cookie") ?? "";

  return cookies.includes(`${MIDSTREAM_TEST_COOKIE}=1`);
}

function createInterruptedResponse() {
  const encoder = new TextEncoder();

  const events = [
    {
      type: "start",
      messageId: `test-${Date.now()}`,
    },
    {
      type: "text-start",
      id: "test-text",
    },
    {
      type: "text-delta",
      id: "test-text",
      delta: "Analyzing your project requirements...",
    },
    {
      type: "error",
      errorText:
        "The connection was interrupted while the AI was responding. Please retry the failed response.",
    },
  ];

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const event of events) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
        );

        await delay(350);
      }

      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "x-vercel-ai-ui-message-stream": "v1",
      "Set-Cookie": `${MIDSTREAM_TEST_COOKIE}=1; Path=/; Max-Age=300; SameSite=Lax`,
    },
  });
}

export async function POST(request: Request) {
  try {
    /*
     * Apply rate limiting before calling the AI provider so repeated
     * requests cannot trivially consume API credits.
     */
    const clientIdentifier = getClientIdentifier(request);

    const rateLimit = checkRateLimit(clientIdentifier);

    if (!rateLimit.allowed) {
      return new Response(
        "Too many requests. Please wait before sending another message.",
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfter),
            "X-RateLimit-Limit": String(rateLimit.limit),
            "X-RateLimit-Remaining": "0",
          },
        },
      );
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return new Response(
        "The AI service is not configured. Please contact the administrator.",
        { status: 500 },
      );
    }

    /*
     * Reject clearly oversized requests before reading and parsing
     * the complete request body.
     */
    const contentLengthHeader = request.headers.get("content-length");

    if (contentLengthHeader) {
      const contentLength = Number(contentLengthHeader);

      if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
        return new Response(
          "The request is too large. Please shorten your project description.",
          { status: 413 },
        );
      }
    }

    /*
     * Measure the actual encoded body as content-length may not
     * always be present.
     */
    const rawBody = await request.text();
    const requestBytes = new TextEncoder().encode(rawBody).length;

    if (requestBytes > MAX_REQUEST_BYTES) {
      return new Response(
        "The request is too large. Please shorten your project description.",
        { status: 413 },
      );
    }

    const body = JSON.parse(rawBody) as {
      messages?: unknown;
    };

    if (!isValidMessageList(body.messages)) {
      return new Response("The request must contain a valid message list.", {
        status: 400,
      });
    }

    const messages = body.messages;

    if (messages.length === 0) {
      return new Response("Please enter a project idea before sending.", {
        status: 400,
      });
    }

    if (messages.length > MAX_MESSAGES) {
      return new Response(
        "This conversation is too long. Please start a new conversation.",
        { status: 400 },
      );
    }

    if (countTextCharacters(messages) > MAX_TEXT_CHARACTERS) {
      return new Response(
        "The conversation contains too much text. Please shorten your project description.",
        { status: 413 },
      );
    }

    const lastUserMessage = getLastUserMessage(messages);

    const shouldTestMidstreamFailure =
      lastUserMessage === TEST_MID_STREAM && !hasMidstreamTestCookie(request);

    if (shouldTestMidstreamFailure) {
      return createInterruptedResponse();
    }

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
      maxRetries: 2,

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

        return "The AI response was interrupted. Please retry the failed response.";
      },
    });
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
