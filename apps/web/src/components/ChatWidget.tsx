import { useCallback, useRef, useState } from 'react';
import { generateTraceparent } from '../utils/traceparent';

type Props = { channel?: 'web' | 'mobile-handoff'; locale: string };
type Message = { id: string; role: 'user' | 'assistant'; text: string };

export function ChatWidget({ channel = 'web', locale }: Props) {
  const apimBase = import.meta.env.VITE_APIM_BASE_URL || '';
  const sessionId = useRef<string>(crypto.randomUUID());
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || busy) return;
    setBusy(true);
    setDraft('');
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    try {
      const trace = generateTraceparent();
      const res = await fetch(`${apimBase}/agents/topic-router/messages`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          traceparent: trace,
        },
        body: JSON.stringify({ sessionId: sessionId.current, channel, locale, text }),
      });
      const data = await res.json();
      const reply = typeof data?.reply === 'string' ? data.reply : '';
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', text: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', text: 'Service temporarily unavailable.' },
      ]);
    } finally {
      setBusy(false);
    }
  }, [apimBase, busy, channel, draft, locale]);

  return (
    <section aria-labelledby="chat-title" className="chat-widget">
      <h2 id="chat-title">Citizen assistant</h2>
      <ul role="log" aria-live="polite" aria-relevant="additions" className="chat-log">
        {messages.map((m) => (
          <li key={m.id} className={`chat-msg chat-msg--${m.role}`}>
            <strong>{m.role === 'user' ? 'You' : 'Assistant'}:</strong> {m.text}
          </li>
        ))}
      </ul>
      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <label htmlFor="chat-draft" className="visually-hidden">
          Your message
        </label>
        <input
          id="chat-draft"
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={busy}
          autoComplete="off"
        />
        <button type="submit" disabled={busy || !draft.trim()}>
          Send
        </button>
      </form>
    </section>
  );
}
