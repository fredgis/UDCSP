import { generateTraceparent } from '../utils/traceparent';
type Props = { channel?: 'web' | 'mobile-handoff'; locale: string };
export function ChatWidget({ channel = 'web', locale }: Props) {
  const src = import.meta.env.VITE_COPILOT_STUDIO_WEBCHAT_URL || 'about:blank';
  const trace = generateTraceparent();
  return <section aria-labelledby="chat-title"><h2 id="chat-title">Citizen assistant</h2><iframe title="Copilot Studio citizen assistant" src={`${src}?channel=${channel}&locale=${locale}&traceparent=${encodeURIComponent(trace)}`} className="chat-frame" loading="lazy" /></section>;
}
