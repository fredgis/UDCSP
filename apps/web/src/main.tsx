import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles/tokens.css';
import './styles/accessibility.css';
import './styles/dyslexic-font.css';
import { applyAccessibility, loadAccessibility } from './utils/accessibility';
import { detectLanguage, loadMessages, persistLanguage, SupportedLanguage } from './utils/language';
function Root() { const [locale, setLocale] = useState<SupportedLanguage>(detectLanguage()); const [messages, setMessages] = useState<Record<string, string>>({}); useEffect(() => { persistLanguage(locale); void loadMessages(locale).then(setMessages); }, [locale]); useEffect(() => applyAccessibility(loadAccessibility()), []); return <App locale={locale} messages={messages} onLocaleChange={setLocale} />; }
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><Root /></React.StrictMode>);
