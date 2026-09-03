import { useChat } from "@ai-sdk/react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import Chat from "./Chat";

vi.mock("@ai-sdk/react", () => ({
  useChat: vi.fn(),
}));

vi.mock("ai", () => ({
  DefaultChatTransport: class DefaultChatTransport {},
}));

const mockedUseChat = vi.mocked(useChat);

const setMessages = vi.fn();
const sendMessage = vi.fn();
const regenerate = vi.fn();
const stop = vi.fn();

function configureChat(
  overrides: Partial<ReturnType<typeof useChat>> = {},
) {
  mockedUseChat.mockReturnValue({
    messages: [],
    setMessages,
    sendMessage,
    regenerate,
    status: "ready",
    stop,
    error: undefined,
    ...overrides,
  } as ReturnType<typeof useChat>);
}

describe("Chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: true,
    });

    configureChat();
  });

  it("shows the pending state and stop control after submission", () => {
    configureChat({
      status: "submitted",
      messages: [
        {
          id: "user-1",
          role: "user",
          parts: [
            {
              type: "text",
              text: "Assess TaskFlow AI",
            },
          ],
        },
      ],
    });

    render(<Chat />);

    expect(
      screen.getByRole("status"),
    ).toHaveTextContent("Analyzing your project");

    expect(
      screen.getByRole("button", {
        name: /stop/i,
      }),
    ).toBeEnabled();
  });

  it("renders streaming assistant text without the thinking indicator", () => {
    configureChat({
      status: "streaming",
      messages: [
        {
          id: "assistant-1",
          role: "assistant",
          parts: [
            {
              type: "text",
              text: "Your project has a clearly defined audience.",
            },
          ],
        },
      ],
    });

    render(<Chat />);

    expect(
      screen.getByText(
        "Your project has a clearly defined audience.",
      ),
    ).toBeInTheDocument();

    expect(
      screen.queryByText("Analyzing your project"),
    ).not.toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /stop/i,
      }),
    ).toBeEnabled();
  });

  it("announces API errors using an accessible alert", () => {
    configureChat({
      status: "error",
      error: new Error("The mocked AI route failed."),
    });

    render(<Chat />);

    const alert = screen.getByRole("alert");

    expect(alert).toHaveTextContent(
      "Response interrupted",
    );

    expect(alert).toHaveTextContent(
      "The mocked AI route failed.",
    );

    expect(
      screen.getByRole("button", {
        name: "Retry the failed AI response",
      }),
    ).toBeEnabled();
  });


  it("retries the latest failed response without a user message id", async () => {
    const user = userEvent.setup();

    configureChat({
      status: "error",
      error: new Error("The AI response was interrupted."),
      messages: [
        {
          id: "user-1",
          role: "user",
          parts: [
            {
              type: "text",
              text: "Evaluate my project idea.",
            },
          ],
        },
      ],
    });

    render(<Chat />);

    await user.click(
      screen.getByRole("button", {
        name: "Retry the failed AI response",
      }),
    );

    expect(regenerate).toHaveBeenCalledWith();
  });

  it("validates the message form before sending", async () => {
    const user = userEvent.setup();

    render(<Chat />);

    const messageBox = screen.getByRole("textbox", {
      name: "Your message",
    });

    const sendButton = screen.getByRole("button", {
      name: /send/i,
    });

    expect(sendButton).toBeDisabled();

    await user.type(messageBox, "   ");

    expect(sendButton).toBeDisabled();

    await user.clear(messageBox);

    await user.type(
      messageBox,
      "Assess my TaskFlow AI project",
    );

    expect(sendButton).toBeEnabled();

    await user.click(sendButton);

    expect(sendMessage).toHaveBeenCalledWith({
      text: "Assess my TaskFlow AI project",
    });
  });

  it("renders text and tool-result message parts", () => {
    const messages = [
      {
        id: "assistant-result",
        role: "assistant",
        parts: [
          {
            type: "text",
            text: "Here is your qualification result.",
          },
          {
            type: "tool-scoreProjectQualification",
            state: "output-available",
            input: {
              projectName: "TaskFlow AI",
              problem:
                "Users need a simple way to manage daily tasks.",
              targetUsers: "Students and professionals",
              coreFeatures: [
                "Create tasks",
                "Filter tasks",
                "Track progress",
              ],
            },
            output: {
              projectName: "TaskFlow AI",
              totalScore: 82,
              readinessLevel: "Ready to plan",
              categoryScores: {
                problemClarity: 20,
                audienceClarity: 21,
                scopeClarity: 19,
                deliveryClarity: 22,
              },
              strengths: [
                "The target users are identifiable.",
              ],
              risks: [
                "The timeline needs additional detail.",
              ],
              recommendation:
                "Create the MVP backlog and begin implementation planning.",
            },
          },
        ],
      },
    ] as unknown as ReturnType<
      typeof useChat
    >["messages"];

    configureChat({
      messages,
    });

    render(<Chat />);

    expect(
      screen.getByText(
        "Here is your qualification result.",
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("region", {
        name: "TaskFlow AI qualification result",
      }),
    ).toBeInTheDocument();
  });

  it("restores a dated conversation from history", async () => {
    const savedMessages = [
      {
        id: "saved-user-1",
        role: "user",
        parts: [{ type: "text", text: "Plan my expense tracker" }],
      },
    ];

    localStorage.setItem("ai-qualification-chat-active-id", "saved-chat");
    localStorage.setItem(
      "ai-qualification-chat-history",
      JSON.stringify([
        {
          id: "saved-chat",
          title: "Plan my expense tracker",
          createdAt: "2026-09-03T08:00:00.000Z",
          updatedAt: "2026-09-03T08:15:00.000Z",
          messages: savedMessages,
        },
      ]),
    );

    render(<Chat />);

    expect(
      await screen.findByRole("button", { name: /^plan my expense tracker/i }),
    ).toBeInTheDocument();

    expect(setMessages).toHaveBeenCalledWith(savedMessages);
  });
});
