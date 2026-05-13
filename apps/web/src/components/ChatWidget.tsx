import { useCallback, useRef, useState } from 'react';
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { generateTraceparent } from '../utils/traceparent';
import { loginRequest } from '../auth/msalConfig';

type Props = { channel?: 'web' | 'mobile-handoff'; locale: string };
type Message = { id: string; role: 'user' | 'assistant'; text: string };

export function ChatWidget({ channel = 'web', locale }: Props) {
  const apimBase = (import.meta.env.VITE_APIM_BASE_URL as string) || '';
  const sessionId = useRef<string>(crypto.randomUUID());
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const isAuth = useIsAuthenticated();
  const { instance, accounts } = useMsal();

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || busy) return;
    setBusy(true);
    setDraft('');
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);

    const headers: Record<string, string> = {
      'content-type': 'application/json',
      traceparent: generateTraceparent(),
    };

    if (isAuth && accounts[0]) {
      try {
        const tok = await instance.acquireTokenSilent({ ...loginRequest, account: accounts[0] });
        if (tok.accessToken) headers.authorization = `Bearer ${tok.accessToken}`;
      } catch {
        // fall through anonymously — APIM may still allow
      }
    }

    try {
      if (!apimBase) throw new Error('apim-base-not-configured');
      const res = await fetch(`${apimBase}/agents/topic-router/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ sessionId: sessionId.current, channel, locale, text, authenticated: isAuth }),
      });
      const data = await res.json().catch(() => ({}));
      const reply = typeof data?.reply === 'string' ? data.reply : '';
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', text: reply || 'Service temporarily unavailable.' }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', text: 'Service temporarily unavailable.' },
      ]);
    } finally {
      setBusy(false);
    }
  }, [accounts, apimBase, busy, channel, draft, instance, isAuth, locale]);

  const greeting = isAuth
    ? `Hi ${accounts[0]?.name?.split(' ')[0] || 'there'} — ask me about your applications, your case status, or how to start a new service.`
    : 'Ask me anything about UDCSP services. To get personalised help on your case, sign in.';

  return (
    <section aria-labelledby="chat-title" className="chat-widget">
      <header className="chat-widget__head">
        <h2 id="chat-title">Citizen assistant</h2>
        <span className={`chat-widget__badge chat-widget__badge--${isAuth ? 'auth' : 'anon'}`}>
          {isAuth ? '🔒 Personalised' : '🌐 Public'}
        </span>
      </header>
      <p className="chat-widget__greeting">{greeting}</p>
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
          placeholder={isAuth ? 'Ask about your case…' : 'Ask about a service…'}
        />
        <button type="submit" disabled={busy || !draft.trim()}>
          Send
        </button>
      </form>
      <p className="chat-widget__foot">
        Powered by <strong>Foundry topic-router</strong> via APIM. Every prompt and response is logged for audit (EU AI Act).
      </p>
    </section>
  );
}
