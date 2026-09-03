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

interface StreamErrorPart {
  type: "error";
  errorText?: string;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<{
    0: { transcript: string };
    isFinal: boolean;
  }>;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getStreamErrorText(messages: UIMessage[]) {
  for (
    let messageIndex = messages.length - 1;
    messageIndex >= 0;
    messageIndex -= 1
  ) {
    const message = messages[messageIndex];

    for (
      let partIndex = message.parts.length - 1;
      partIndex >= 0;
      partIndex -= 1
    ) {
      const part = message.parts[
        partIndex
      ] as unknown as StreamErrorPart;

      if (part.type === "error") {
        return (
          part.errorText ||
          "The AI response was interrupted. Please retry the failed response."
        );
      }
    }
  }

  return "";
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [currentDateTime, setCurrentDateTime] = useState<Date | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const wordCount = input.trim() ? input.trim().split(/\s+/).length : 0;

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
  const streamErrorText = getStreamErrorText(messages);
  const activeErrorMessage =
    error?.message || streamErrorText;

  const hasAssistantText =
    lastMessage?.role === "assistant" &&
    lastMessage.parts.some(
      (part) => part.type === "text" && part.text.length > 0,
    );

  const showThinking = isGenerating && !hasAssistantText;

  useEffect(() => {
    const initialClock = window.setTimeout(() => setCurrentDateTime(new Date()), 0);
    const clock = window.setInterval(() => setCurrentDateTime(new Date()), 1000);

    return () => {
      window.clearTimeout(initialClock);
      window.clearInterval(clock);
    };
  }, []);

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
    function handleGlobalKeyDown(event: globalThis.KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        textareaRef.current?.focus();
      }

      if (event.key === "Escape") {
        setIsSidebarOpen(false);
        setShowClearConfirmation(false);
      }
    }

    window.addEventListener("keydown", handleGlobalKeyDown);

    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
      if (noticeTimerRef.current) {
        window.clearTimeout(noticeTimerRef.current);
      }
      recognitionRef.current?.stop();
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

    if (messages.length === 0) {
      showNotice("No failed message is available to retry.");
      return;
    }

    setIsRetrying(true);
    setIsPinnedToBottom(true);

    try {
      await regenerate();
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
    recognitionRef.current?.stop();
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

  async function copyMessage(message: UIMessage) {
    try {
      await navigator.clipboard.writeText(getMessageText(message));
      showNotice("Message copied");
    } catch {
      showNotice("Unable to copy message");
    }
  }

  async function shareConversation() {
    const text = messages
      .map((message) => `${message.role === "user" ? "You" : "Project Intelligence"}: ${getMessageText(message)}`)
      .join("\n\n");

    try {
      if (navigator.share) {
        await navigator.share({ title: "AI Project Qualification", text });
        showNotice("Conversation shared");
      } else {
        await navigator.clipboard.writeText(text);
        showNotice("Share text copied");
      }
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === "AbortError") return;
      showNotice("Unable to share conversation");
    }
  }

  function downloadJsonBackup() {
    const file = new Blob([
      JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), messages }, null, 2),
    ], { type: "application/json" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = "project-intelligence-backup.json";
    link.click();
    URL.revokeObjectURL(url);
    showNotice("JSON backup downloaded");
  }

  function toggleVoiceInput() {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const speechWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;

    if (!Recognition) {
      showNotice("Voice input is not supported in this browser");
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN";
    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result?.[0]?.transcript ?? "";
        if (result?.isFinal) finalText += transcript;
        else interimText += transcript;
      }

      setInterimTranscript(interimText);
      if (finalText.trim()) {
        setInput((current) => `${current}${current ? " " : ""}${finalText.trim()}`.slice(0, MAX_CHARACTERS));
      }
    };
    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript("");
    };
    recognition.onerror = () => {
      setIsListening(false);
      showNotice("Voice input could not start");
    };
    recognitionRef.current = recognition;
    setIsListening(true);
    try {
      recognition.start();
    } catch {
      setIsListening(false);
      showNotice("Voice input is already active");
    }
  }

  async function exportPdf() {
    if (messages.length === 0) {
      showNotice("Start a conversation before exporting a PDF");
      return;
    }

    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const margin = 48;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const usableWidth = pageWidth - margin * 2;
      let y = 58;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.text("AI Project Qualification", margin, y);
      y += 22;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(90);
      pdf.text(`Generated ${new Date().toLocaleString()}`, margin, y);
      y += 28;

      for (const message of messages) {
        const heading = message.role === "user" ? "YOU" : "PROJECT INTELLIGENCE";
        const lines = pdf.splitTextToSize(getMessageText(message) || "[Structured result]", usableWidth);
        const requiredHeight = 20 + lines.length * 14;
        if (y + requiredHeight > pageHeight - margin) {
          pdf.addPage();
          y = margin;
        }
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.setTextColor(message.role === "user" ? 20 : 10, message.role === "user" ? 100 : 120, message.role === "user" ? 210 : 150);
        pdf.text(heading, margin, y);
        y += 15;
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.setTextColor(30);
        pdf.text(lines, margin, y);
        y += lines.length * 14 + 18;
      }

      pdf.save("ai-project-qualification.pdf");
      showNotice("PDF exported successfully");
    } catch (pdfError) {
      console.error("Could not export PDF:", pdfError);
      showNotice("PDF export failed");
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

      <aside className={isSidebarOpen ? "chat-sidebar is-open" : "chat-sidebar"}>
        <div className="sidebar-brand">
          <span className="assistant-logo" aria-hidden="true">PI</span>
          <div><strong>Project Intelligence</strong><small>AI workspace</small></div>
        </div>

        <button type="button" className="new-chat-button" onClick={requestClearConversation}>
          <span aria-hidden="true">＋</span> New analysis
        </button>

        <div className="sidebar-section">
          <span className="sidebar-label">Qualification checklist</span>
          <ol className="step-list">
            {qualificationSteps.map((step, index) => (
              <li key={step} className={index < completedSteps ? "complete" : index === completedSteps ? "active" : ""}>
                <span>{index < completedSteps ? "✓" : index + 1}</span>{step}
              </li>
            ))}
          </ol>
        </div>

        <div className="sidebar-footer">
          <div className="live-clock" aria-label="Current date and time">
            <strong>{currentDateTime ? currentDateTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--"}</strong>
            <span>{currentDateTime ? currentDateTime.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "Loading date…"}</span>
          </div>
          <div className="mini-progress"><span style={{ width: `${progressPercentage}%` }} /></div>
          <p><strong>{completedSteps}/{qualificationSteps.length}</strong> areas covered</p>
          <small>Your conversation is saved on this device.</small>
        </div>
      </aside>

      {isSidebarOpen && <button type="button" className="sidebar-backdrop" aria-label="Close menu" onClick={() => setIsSidebarOpen(false)} />}

      <div className="chat-workspace">

      <div className="chat-topbar">
        <div className="assistant-identity">
          <button type="button" className="menu-button" aria-label="Open menu" onClick={() => setIsSidebarOpen(true)}>☰</button>

          <div>
            <div className="assistant-name-row">
              <h1>Project Qualification</h1>

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
              Turn your idea into a development-ready plan
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <div className="chat-actions">
            <label className="message-search">
              <span aria-hidden="true">⌕</span>
              <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search" aria-label="Search conversation" />
            </label>
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

            <button type="button" onClick={exportPdf} disabled={isGenerating}>
              PDF
            </button>

            <button type="button" onClick={downloadJsonBackup} disabled={isGenerating}>
              Backup
            </button>

            <button type="button" onClick={shareConversation} disabled={isGenerating}>
              Share
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

        {messages.filter((message) => !searchQuery.trim() || getMessageText(message).toLowerCase().includes(searchQuery.trim().toLowerCase())).map((message) => (
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

              <button type="button" className="copy-message" onClick={() => copyMessage(message)} aria-label="Copy message">Copy</button>

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

        {activeErrorMessage && (
          <div className="error-message" role="alert">
            <div>
              <strong>Response interrupted</strong>

              <p>
                {activeErrorMessage}
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
              <button type="button" onClick={retryFailedMessage} disabled={isOnline === false}>
                ↻ Regenerate response
              </button>
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

          {interimTranscript && <span className="voice-preview">Listening: {interimTranscript}</span>}
          <span className="composer-metrics" aria-live="polite" aria-label="Message length">
            {wordCount} {wordCount === 1 ? "word" : "words"} · {input.length}/{MAX_CHARACTERS} characters
          </span>
          <span className="composer-tip">Ask about scope, stack, timeline or readiness</span>
          <button
            type="button"
            className={isListening ? "voice-button is-listening" : "voice-button"}
            onClick={toggleVoiceInput}
            disabled={isGenerating || isOnline === false}
            aria-label={isListening ? "Stop voice input" : "Start voice input"}
            title="Voice input"
          >
            {isListening ? (
              <span className="voice-stop" aria-hidden="true" />
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0M12 17v4m-3 0h6" /></svg>
            )}
          </button>
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
      </div>
    </section>
  );
}
