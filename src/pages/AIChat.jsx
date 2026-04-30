// @ts-nocheck
import { useMemo, useRef, useState } from "react";
import Loader from "../components/ui/Loader.jsx";
import { extractAssistantReply, sendChatMessage } from "../services/ai.api.js";
import { getApiErrorMessage } from "../services/api.js";

const initialMessage = {
  role: "assistant",
  content:
    "Hi, I am your SmartPayRW assistant. Ask me about payroll runs, employee records, taxes, or compliance workflows.",
};

export default function AIChat() {
  const [messages, setMessages] = useState([initialMessage]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef(null);

  const canSend = useMemo(() => message.trim().length > 0 && !isSending, [isSending, message]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!canSend) {
      return;
    }

    const userMessage = { role: "user", content: message.trim() };
    const history = [...messages, userMessage].map(({ role, content }) => ({ role, content }));

    setMessages((current) => [...current, userMessage]);
    setMessage("");
    setError("");
    setIsSending(true);

    try {
      const { data } = await sendChatMessage(userMessage.content, history);
      setMessages((current) => [
        ...current,
        { role: "assistant", content: extractAssistantReply(data) },
      ]);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to reach the backend AI endpoint."));
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: "I could not reach the SmartPayRW backend AI service. Please try again shortly.",
        },
      ]);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  }

  return (
    <section className="panel chat-panel">
      <div className="section-heading">
        <p className="eyebrow">Backend-only AI integration</p>
        <h2>AI Chat</h2>
        <p>
          The frontend sends messages only to <code>POST /api/ai/chat</code>. Provider keys stay on
          the backend.
        </p>
      </div>

      <div className="chat-window" aria-live="polite">
        {messages.map((item, index) => (
          <article key={`${item.role}-${index}`} className={`message message--${item.role}`}>
            <span>{item.role === "user" ? "You" : "Assistant"}</span>
            <p>{item.content}</p>
          </article>
        ))}
        {isSending && <Loader label="Assistant is thinking..." />}
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      <form className="chat-form" onSubmit={handleSubmit}>
        <textarea
          ref={inputRef}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Ask about payroll calculations, employees, PAYE, or compliance..."
          rows={3}
        />
        <button type="submit" className="button button--primary" disabled={!canSend}>
          {isSending ? "Sending..." : "Send message"}
        </button>
      </form>
    </section>
  );
}
