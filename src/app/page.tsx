import Chat from "./components/Chat";

export default function Home() {
  return (
    <main>
      <header>
        <p>AI Project Assistant</p>

        <h1>Turn your idea into a clear project plan</h1>

        <p>
          Have a streaming conversation with AI to define your project,
          users, features, technology, timeline, and next steps.
        </p>
      </header>

      <Chat />
    </main>
  );
}