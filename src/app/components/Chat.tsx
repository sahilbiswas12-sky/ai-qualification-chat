"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import { useChat } from "@ai-sdk/react";

import {
  DefaultChatTransport,
  type UIMessage,
} from "ai";

import QualificationToolCard, {
  type QualificationToolPart,
} from "./QualificationToolCard";

const STORAGE_KEY = "ai-qualification-chat-messages";
const MAX_CHARACTERS = 1500;

const qualificationSteps = [
  "Project problem",
  "Target users",
  "Core features",
  "Technology",
  "Timeline",
  "Budget and resources",
];

const starterPrompts = [
  {
    title: "Student expense tracker",
    text: "I want to build an AI-powered expense tracker for college students.",
  },
  {
    title: "Smart task manager",
    text: "I want to create an intelligent task-management application.",
  },
  {
    title: "Qualify my business idea",
    text: "I have a business idea, but I need help defining its requirements.",
  },
];

const quickReplies = [
  "Give me some examples",
  "Recommend the best option",
  "Keep the first version simple",
];

function getMessageText(message: UIMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

function subscribeToOnlineStatus(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);

  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getOnlineStatus() {
  return navigator.onLine;
}

function getServerOnlineStatus() {
  return true;
}

export default function Chat() {
  const [input, setInput] = useState("");
  const [isPinnedToBottom, setIsPinnedToBottom] = useState(true);
  const [isStorageLoaded, setIsStorageLoaded] = useState(false);
  const isOnline = useSyncExternalStore(
    subscribeToOnlineStatus,
    getOnlineStatus,
    getServerOnlineStatus,
  );
  const [notice, setNotice] = useState("");
  const [isRetrying, setIsRetrying] = useState(false);
  const [showClearConfirmation, setShowClearConfirmation] =
    useState(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const noticeTimerRef = useRef<number | null>(null);

  const {
    messages,
    setMessages,
    sendMessage,
    regenerate,
    status,
    stop,
    error,
  } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  });

  const isGenerating =
    status === "submitted" || status === "streaming";

  const userMessageCount = messages.filter(
    (message) => message.role === "user",
  ).length;

  const assistantMessageCount = messages.filter(
    (message) => message.role === "assistant",
  ).length;

  const completedSteps = Math.min(
    userMessageCount,
    qualificationSteps.length,
  );

  const progressPercentage =
    (completedSteps / qualificationSteps.length) * 100;

  const currentStep =
    qualificationSteps[
      Math.min(completedSteps, qualificationSteps.length - 1)
    ];

  const canGenerateBrief =
    completedSteps === qualificationSteps.length && !isGenerating;

  const lastMessage = messages.at(-1);

  const hasAssistantText =
    lastMessage?.role === "assistant" &&
    lastMessage.parts.some(
      (part) => part.type === "text" && part.text.length > 0,
    );

  const showThinking = isGenerating && !hasAssistantText;

  useEffect(() => {
    try {
      const savedMessages = localStorage.getItem(STORAGE_KEY);

      if (savedMessages) {
        const parsedMessages = JSON.parse(
          savedMessages,
        ) as UIMessage[];

        setMessages(parsedMessages);
      }
    } catch (storageError) {
      console.error(
        "Could not restore conversation:",
        storageError,
      );
    } finally {
      setIsStorageLoaded(true);
    }
  }, [setMessages]);

  useEffect(() => {
    if (!isStorageLoaded) {
      return;
    }

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(messages),
      );
    } catch (storageError) {
      console.error(
        "Could not save conversation:",
        storageError,
      );
    }
  }, [messages, isStorageLoaded]);

  useEffect(() => {
    if (isPinnedToBottom) {
      messagesEndRef.current?.scrollIntoView({
        behavior: status === "streaming" ? "auto" : "smooth",
        block: "end",
      });
    }
  }, [messages, status, isPinnedToBottom]);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, [input]);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) {
        window.clearTimeout(noticeTimerRef.current);
      }
    };
  }, []);

  function showNotice(message: string) {
    setNotice(message);

    if (noticeTimerRef.current) {
      window.clearTimeout(noticeTimerRef.current);
    }

    noticeTimerRef.current = window.setTimeout(() => {
      setNotice("");
    }, 2500);
  }

  function handleMessagesScroll() {
    const container = messagesContainerRef.current;

    if (!container) {
      return;
    }

    const distanceFromBottom =
      container.scrollHeight -
      container.scrollTop -
      container.clientHeight;

    setIsPinnedToBottom(distanceFromBottom < 80);
  }

  function jumpToLatest() {
    setIsPinnedToBottom(true);

    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }

  async function submitMessage(message: string) {
    const cleanMessage = message.trim();

    if (!cleanMessage || isGenerating) {
      return;
    }

    if (isOnline === false) {
      showNotice("Reconnect to the internet before sending");
      return;
    }

    setInput("");
    setIsPinnedToBottom(true);

    try {
      await sendMessage({
        text: cleanMessage,
      });
    } catch (sendError) {
      console.error("Could not send message:", sendError);
      showNotice("Message could not be sent");
    }
  }

  async function retryFailedMessage() {
    if (isGenerating || isRetrying || isOnline === false) {
      return;
    }

    const failedMessage = messages.at(-1);

    if (!failedMessage) {
      showNotice("No failed message is available to retry.");
      return;
    }

    setIsRetrying(true);
    setIsPinnedToBottom(true);

    try {
      await regenerate({
        messageId: failedMessage.id,
      });
    } catch {
      showNotice("Retry failed. Please check your connection.");
    } finally {
      setIsRetrying(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitMessage(input);
  }

  

  function handleKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  function requestClearConversation() {
    if (isGenerating) {
      stop();
    }

    setShowClearConfirmation(true);
  }

  function cancelClearConversation() {
    setShowClearConfirmation(false);
  }

  function confirmClearConversation() {
    setMessages([]);
    setInput("");
    setIsPinnedToBottom(true);
    setShowClearConfirmation(false);
    localStorage.removeItem(STORAGE_KEY);
    showNotice("Conversation cleared");
  }

  async function copyConversation() {
    const conversation = messages
      .map((message) => {
        const speaker =
          message.role === "user" ? "You" : "AI Assistant";

        return `${speaker}\n${getMessageText(message)}`;
      })
      .join("\n\n");

    try {
      await navigator.clipboard.writeText(conversation);
      showNotice("Conversation copied");
    } catch {
      showNotice("Unable to copy conversation");
    }
  }

  function downloadConversation() {
    const conversation = messages
      .map((message) => {
        const speaker =
          message.role === "user" ? "You" : "AI Assistant";

        return `## ${speaker}\n\n${getMessageText(message)}`;
      })
      .join("\n\n");

    const documentContent = [
      "# AI Project Qualification",
      "",
      `Generated: ${new Date().toLocaleString()}`,
      "",
      conversation,
    ].join("\n");

    const file = new Blob([documentContent], {
      type: "text/markdown",
    });

    const downloadUrl = URL.createObjectURL(file);
    const downloadLink = document.createElement("a");

    downloadLink.href = downloadUrl;
    downloadLink.download = "ai-project-qualification.md";
    downloadLink.click();

    URL.revokeObjectURL(downloadUrl);
    showNotice("Project qualification downloaded");
  }

  async function generateFinalBrief() {
    await submitMessage(
      "Using everything I have shared, create my final project brief. Include the project goal, target users, problem, core features, recommended technology, timeline, limitations, MVP scope, and next development steps.",
    );
  }

  return (
    <section
      className="chat-shell"
      aria-label="AI qualification chat"
    >
      <div className="chat-glow chat-glow-one" />
      <div className="chat-glow chat-glow-two" />

      <div className="chat-topbar">
        <div className="assistant-identity">
          <div className="assistant-logo" aria-hidden="true">
            AI
          </div>

          <div>
            <div className="assistant-name-row">
              <h2>Project Intelligence</h2>

              <span
                className={
                  isOnline
                    ? "connection-status online"
                    : "connection-status offline"
                }
              >
                <span aria-hidden="true" />

                {isOnline ? "Online" : "Offline"}
              </span>
            </div>

            <p>
              Streaming project qualification assistant
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <div className="chat-actions">
            <button
              type="button"
              onClick={copyConversation}
              disabled={isGenerating}
            >
              Copy
            </button>

            <button
              type="button"
              onClick={downloadConversation}
              disabled={isGenerating}
            >
              Export
            </button>

            <button
              type="button"
              className="danger-action"
              onClick={requestClearConversation}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      <div className="qualification-dashboard">
        <div className="progress-information">
          <div className="progress-heading">
            <span>Qualification progress</span>

            <span>
              {completedSteps}/{qualificationSteps.length}
            </span>
          </div>

          <div
            className="progress-track"
            role="progressbar"
            aria-label="Qualification progress"
            aria-valuemin={0}
            aria-valuemax={qualificationSteps.length}
            aria-valuenow={completedSteps}
          >
            <span
              style={{
                width: `${progressPercentage}%`,
              }}
            />
          </div>

          <small>
            {completedSteps === qualificationSteps.length
              ? "Qualification complete"
              : `Current area: ${currentStep}`}
          </small>
        </div>

        <div className="conversation-stats">
          <div>
            <strong>{userMessageCount}</strong>
            <span>Your answers</span>
          </div>

          <div>
            <strong>{assistantMessageCount}</strong>
            <span>AI responses</span>
          </div>
        </div>
      </div>

      <div
        ref={messagesContainerRef}
        className="messages-panel"
        onScroll={handleMessagesScroll}
        aria-live="polite"
      >
        {messages.length === 0 && (
          <div className="chat-empty-state">
            <span className="eyebrow">Start a new analysis</span>

            <h2>What do you want to build?</h2>

            <p>
              Describe your idea or select a starting point. The AI
              will ask focused questions and turn your answers into a
              development-ready project brief.
            </p>

            <div className="starter-prompts">
              {starterPrompts.map((prompt) => (
                <button
                  key={prompt.title}
                  type="button"
                  onClick={() => submitMessage(prompt.text)}
                  disabled={isGenerating || isOnline === false}
                >
                  <strong>{prompt.title}</strong>
                  <span>{prompt.text}</span>
                  <span className="prompt-arrow" aria-hidden="true">
                    →
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <article
            key={message.id}
            data-role={message.role}
          >
            <div className="message-avatar" aria-hidden="true">
              {message.role === "user" ? "SB" : "AI"}
            </div>

            <div className="message-content">
              <strong>
                {message.role === "user"
                  ? "You"
                  : "Project Intelligence"}
              </strong>

              {message.parts.map((part, index) => {
                if (part.type === "text") {
                  return (
                    <p key={`${message.id}-${index}`}>
                      {part.text}
                    </p>
                  );
                }

                const toolPart =
                  part as unknown as QualificationToolPart;

                if (
                  toolPart.type ===
                  "tool-scoreProjectQualification"
                ) {
                  return (
                    <QualificationToolCard
                      key={`${message.id}-${index}`}
                      part={toolPart}
                    />
                  );
                }

                return null;
              })}
            </div>
          </article>
        ))}

        {showThinking && (
          <div role="status" className="thinking-indicator">
            <div className="message-avatar" aria-hidden="true">
              AI
            </div>

            <div className="thinking-content">
              <span />
              <span />
              <span />

              <span className="thinking-text">
                Analyzing your project
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="error-message" role="alert">
            <div>
              <strong>Response interrupted</strong>

              <p>
                {error.message ||
                  "The AI response could not be completed. Your conversation is still available."}
              </p>
            </div>

            <button
              type="button"
              onClick={retryFailedMessage}
              disabled={
                isGenerating ||
                isRetrying ||
                isOnline === false
              }
              aria-label="Retry the failed AI response"
            >
              {isRetrying ? "Retrying..." : "Retry failed response"}
            </button>
          </div>
        )}

        {!isGenerating &&
          messages.length > 0 &&
          lastMessage?.role === "assistant" && (
            <div className="quick-replies">
              {quickReplies.map((reply) => (
                <button
                  key={reply}
                  type="button"
                  onClick={() => submitMessage(reply)}
                  disabled={isOnline === false}
                >
                  {reply}
                </button>
              ))}
            </div>
          )}

        {canGenerateBrief && (
          <div className="final-brief-card">
            <div>
              <span>Qualification complete</span>
              <strong>Your project brief is ready</strong>
            </div>

            <button
              type="button"
              onClick={generateFinalBrief}
            >
              Generate final brief
            </button>
          </div>
        )}

        <div ref={messagesEndRef} aria-hidden="true" />
      </div>

      {!isPinnedToBottom && messages.length > 0 && (
        <button
          type="button"
          className="jump-to-latest"
          onClick={jumpToLatest}
        >
          ↓ Jump to latest
        </button>
      )}

      {notice && (
        <div className="chat-notice" role="status">
          {notice}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="input-wrapper">
          <textarea
            ref={textareaRef}
            id="chat-message"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isOnline === false
                ? "Reconnect to continue..."
                : "Describe your project idea..."
            }
            rows={1}
            maxLength={MAX_CHARACTERS}
            disabled={isGenerating || isOnline === false}
            aria-label="Your message"
          />

          <span className="character-count">
            {input.length}/{MAX_CHARACTERS}
          </span>
        </div>

        {isGenerating ? (
          <button
            type="button"
            className="send-button stop-button"
            onClick={stop}
          >
            <span aria-hidden="true">■</span>
            Stop
          </button>
        ) : (
          <button
            type="submit"
            className="send-button"
            disabled={!input.trim() || isOnline === false}
          >
            Send
            <span aria-hidden="true">↑</span>
          </button>
        )}

        <small className="keyboard-hint">
          Enter to send · Shift + Enter for a new line
        </small>
      </form>

      {showClearConfirmation && (
        <div
          className="confirmation-overlay"
          role="presentation"
          onMouseDown={cancelClearConversation}
        >
          <div
            className="confirmation-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="clear-title"
            aria-describedby="clear-description"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <span className="dialog-icon" aria-hidden="true">
              !
            </span>

            <h2 id="clear-title">Clear conversation?</h2>

            <p id="clear-description">
              Your saved messages will be permanently removed from
              this browser.
            </p>

            <div>
              <button type="button" onClick={cancelClearConversation}>
                Cancel
              </button>

              <button
                type="button"
                className="confirm-danger"
                onClick={confirmClearConversation}
              >
                Clear conversation
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}