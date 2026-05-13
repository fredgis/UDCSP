import { useCallback, useRef, useState } from 'react';
import { generateTraceparent } from '../utils/traceparent';

type Props = { channel?: 'web' | 'mobile-handoff'; locale: string };
type Message = { id: string; role: 'user' | 'assistant'; text: string };

const cannedReplies: Record<string, string> = {
  da: 'Tak for din besked. En sagsbehandler vil hjælpe dig snart. Du kan også starte din ansøgning fra forsiden.',
  sv: 'Tack för ditt meddelande. En handläggare hjälper dig snart. Du kan också starta din ansökan från startsidan.',
  nb: 'Takk for meldingen. En saksbehandler vil hjelpe deg snart. Du kan også starte søknaden fra forsiden.',
  nn: 'Takk for meldinga. Ein saksbehandlar vil hjelpe deg snart. Du kan òg starte søknaden frå framsida.',
  se: 'Giitu sáhkavuoru. Áššemeannudeaddji veahkeha du fargga. Sáhtát maiddái álggahit ohcamuša ovdasiiddus.',
  en: "Thanks for your message. A caseworker will help you shortly. You can also start your application from the home page.",
  de: 'Danke für Ihre Nachricht. Ein Sachbearbeiter wird Ihnen in Kürze helfen. Sie können Ihren Antrag auch über die Startseite beginnen.',
  fr: "Merci pour votre message. Un agent va vous aider sous peu. Vous pouvez aussi commencer votre demande depuis la page d'accueil.",
  pl: 'Dziękujemy za wiadomość. Pracownik wkrótce Państwu pomoże. Można również rozpocząć wniosek ze strony głównej.',
  ar: 'شكرا لرسالتك. سيساعدك أحد الموظفين قريبا. يمكنك أيضا بدء طلبك من الصفحة الرئيسية.',
  uk: 'Дякуємо за повідомлення. Працівник незабаром вам допоможе. Ви також можете розпочати заявку з головної сторінки.',
  fi: 'Kiitos viestistäsi. Käsittelijä auttaa sinua pian. Voit myös aloittaa hakemuksesi etusivulta.',
};

function localizedFallback(locale: string): string {
  return cannedReplies[locale] ?? cannedReplies.en;
}

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

    if (!apimBase) {
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', text: localizedFallback(locale) }]);
      setBusy(false);
      return;
    }

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
      if (!res.ok) throw new Error(`http ${res.status}`);
      const data = await res.json();
      const reply = typeof data?.reply === 'string' && data.reply ? data.reply : localizedFallback(locale);
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', text: reply }]);
    } catch {
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', text: localizedFallback(locale) }]);
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
