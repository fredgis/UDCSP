import { useCallback, useEffect, useRef, useState } from 'react';
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { generateTraceparent } from '../utils/traceparent';
import { apiScopeForCountry, apimBaseUrlForCountry, getCountry } from '../auth/msalConfig';

type Props = { channel?: 'web' | 'mobile-handoff'; locale: string };
type Message = { id: string; role: 'user' | 'assistant'; text: string };

function extractReply(data: unknown): string {
  const raw = extractRawReply(data);
  return unwrapAgentJson(raw);
}

// Some Foundry agents are prompted to return a JSON envelope like
// {"locale":"en","message":"Hi","confidence":0.99}. Pull the human-facing
// message out so the chat bubble doesn't render raw JSON.
function unwrapAgentJson(text: string): string {
  if (!text) return text;
  const trimmed = text.trim();
  if (!(trimmed.startsWith('{') && trimmed.endsWith('}'))) return text;
  try {
    const obj = JSON.parse(trimmed) as Record<string, unknown>;
    for (const key of ['message', 'reply', 'response', 'text', 'answer', 'content']) {
      const v = obj[key];
      if (typeof v === 'string' && v.trim()) return v;
    }
  } catch {
    // not JSON, fall through
  }
  return text;
}

function extractRawReply(data: unknown): string {
  if (!data || typeof data !== 'object') return '';
  const d = data as Record<string, unknown>;
  if (typeof d.reply === 'string') return d.reply;
  if (typeof d.output_text === 'string') return d.output_text;
  if (typeof d.response === 'string') return d.response;
  // Foundry /openai/v1/responses shape: { output: [ { content: [ { text } ] } ] }
  const output = d.output as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(output)) {
    const parts: string[] = [];
    for (const msg of output) {
      const content = msg.content as Array<Record<string, unknown>> | undefined;
      if (Array.isArray(content)) {
        for (const c of content) {
          const t = (c.text ?? c.output_text) as unknown;
          if (typeof t === 'string') parts.push(t);
          else if (t && typeof t === 'object' && 'value' in (t as Record<string, unknown>)) {
            const v = (t as Record<string, unknown>).value;
            if (typeof v === 'string') parts.push(v);
          }
        }
      }
    }
    if (parts.length) return parts.join('');
  }
  return '';
}

export function ChatWidget({ channel = 'web', locale }: Props) {
  const country = getCountry();
  const apimBase = apimBaseUrlForCountry(country);
  const sessionId = useRef<string>(crypto.randomUUID());
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const isAuth = useIsAuthenticated();
  const { instance, accounts } = useMsal();
  const logEndRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    if (messages.length === 0) return;
    const last = logEndRef.current;
    if (!last) return;
    last.scrollIntoView({ behavior: 'smooth', block: 'end' });
    if (messages[messages.length - 1].role === 'assistant') {
      last.setAttribute('tabindex', '-1');
      last.focus({ preventScroll: true });
    }
  }, [messages]);

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
        const tok = await instance.acquireTokenSilent({ scopes: [apiScopeForCountry(country)], account: accounts[0] });
        if (tok.accessToken) headers.authorization = `Bearer ${tok.accessToken}`;
      } catch {
        // fall through anonymously — APIM may still allow
      }
    }

    try {
      if (!apimBase) throw new Error('apim-base-not-configured');
      const res = await fetch(`${apimBase}/agent-topic-router/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ sessionId: sessionId.current, channel, locale, text, authenticated: isAuth }),
      });
      const data = await res.json().catch(() => ({}));
      const reply = extractReply(data);
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', text: reply || 'Service temporarily unavailable.' }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', text: 'Service temporarily unavailable.' },
      ]);
    } finally {
      setBusy(false);
    }
  }, [accounts, apimBase, busy, channel, country, draft, instance, isAuth, locale]);

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
        {messages.map((m, i) => (
          <li
            key={m.id}
            ref={i === messages.length - 1 ? logEndRef : undefined}
            className={`chat-msg chat-msg--${m.role}`}
          >
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
