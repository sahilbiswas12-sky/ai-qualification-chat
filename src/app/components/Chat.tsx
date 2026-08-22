"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import { useChat } from "@ai-sdk/react";

import {
  DefaultChatTransport,
  type UIMessage,
} from "ai";

const STORAGE_KEY = "ai-qualification-chat-messages";

export default function Chat() {
  const [input, setInput] = useState("");
  const [isPinnedToBottom, setIsPinnedToBottom] = useState(true);
  const [isStorageLoaded, setIsStorageLoaded] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    setMessages,
    sendMessage,
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

  const lastMessage = messages.at(-1);

  const hasAssistantText =
    lastMessage?.role === "assistant" &&
    lastMessage.parts.some(
      (part) => part.type === "text" && part.text.length > 0,
    );

  const showThinking = isGenerating && !hasAssistantText;

  // Restore the saved conversation after the component loads.
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

  // Save every conversation update, including partial stopped messages.
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

  // Follow streamed text only while the user remains near the bottom.
  useEffect(() => {
    if (isPinnedToBottom) {
      messagesEndRef.current?.scrollIntoView({
        behavior: status === "streaming" ? "auto" : "smooth",
        block: "end",
      });
    }
  }, [messages, status, isPinnedToBottom]);

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = input.trim();

    if (!message || isGenerating) {
      return;
    }

    setInput("");
    setIsPinnedToBottom(true);

    await sendMessage({
      text: message,
    });
  }

  function clearConversation() {
    if (isGenerating) {
      stop();
    }

    setMessages([]);
    setInput("");
    setIsPinnedToBottom(true);
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <section aria-label="AI qualification chat">
      <div
        ref={messagesContainerRef}
        onScroll={handleMessagesScroll}
        aria-live="polite"
      >
        {messages.length === 0 && (
          <div>
            <h2>Start your project qualification</h2>

            <p>
              Describe the project you want to build. The assistant
              will ask one question at a time.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <article
            key={message.id}
            data-role={message.role}
          >
            <strong>
              {message.role === "user" ? "You" : "AI Assistant"}
            </strong>

            {message.parts.map((part, index) => {
              if (part.type !== "text") {
                return null;
              }

              return (
                <p key={`${message.id}-${index}`}>
                  {part.text}
                </p>
              );
            })}
          </article>
        ))}

        {showThinking && (
          <div role="status">
            <span>AI is thinking…</span>
          </div>
        )}

        {error && (
          <p role="alert">
            {error.message ||
              "Something went wrong. Please try again."}
          </p>
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

      {messages.length > 0 && !isGenerating && (
        <button
          type="button"
          className="clear-conversation"
          onClick={clearConversation}
        >
          Clear conversation
        </button>
      )}

      <form onSubmit={handleSubmit}>
        <label htmlFor="chat-message">
          Your message
        </label>

        <textarea
          id="chat-message"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Describe your project idea..."
          rows={3}
          disabled={isGenerating}
        />

        {isGenerating ? (
          <button type="button" onClick={stop}>
            Stop generating
          </button>
        ) : (
          <button type="submit" disabled={!input.trim()}>
            Send message
          </button>
        )}
      </form>
    </section>
  );
}