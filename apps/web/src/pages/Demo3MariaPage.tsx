import { useEffect, useId, useRef, useState } from 'react';

/**
 * Demo3MariaPage — dedicated screen-reader showcase for Maria's flow.
 *
 * The generic /demo/:id harness (DemoScenarioPage) is kept for the other
 * scenarios; D3 needs a richer, *narratable* surface that NVDA / JAWS /
 * VoiceOver can actually walk through:
 *   - h1 receives focus on mount so the first Tab moves into real content
 *   - aria-live announcer narrates step changes
 *   - fieldset / legend group related fields
 *   - every input has a visible label + aria-describedby help text
 *   - validation produces an error summary that takes focus
 *   - lang="pl" is set on the wizard region so NVDA switches to Polish voice
 */

type Step = 0 | 1 | 2 | 3;

type Errors = {
  fullName?: string;
  pesel?: string;
  childName?: string;
  childBirthYear?: string;
  iban?: string;
};

const STEP_LABELS = [
  'Powitanie',                 // Welcome
  'Twoje dane',                // Your details
  'Dane dziecka',              // Child details
  'Konto bankowe i podsumowanie',
];

export function Demo3MariaPage() {
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const errorSummaryRef = useRef<HTMLDivElement | null>(null);
  const announcerRef = useRef<HTMLDivElement | null>(null);

  const [step, setStep] = useState<Step>(0);
  const [fullName, setFullName] = useState('');
  const [pesel, setPesel] = useState('');
  const [childName, setChildName] = useState('');
  const [childBirthYear, setChildBirthYear] = useState('');
  const [iban, setIban] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);

  const fullNameId = useId();
  const peselId = useId();
  const childNameId = useId();
  const childYearId = useId();
  const ibanId = useId();

  // 1. Focus the page heading on mount so the first Tab moves into the
  //    wizard content (skipping the address bar / browser chrome handover).
  useEffect(() => {
    headingRef.current?.focus();
    if (announcerRef.current) {
      announcerRef.current.textContent =
        'Demo trzy. Maria, polski czytnik ekranu, wniosek o świadczenie dziecięce. Naciśnij Tab, aby rozpocząć.';
    }
  }, []);

  // 2. Announce step changes to screen readers via the polite live region.
  useEffect(() => {
    if (announcerRef.current) {
      announcerRef.current.textContent = `Krok ${step + 1} z 4: ${STEP_LABELS[step]}.`;
    }
  }, [step]);

  function validate(): Errors {
    const e: Errors = {};
    if (step >= 1) {
      if (!fullName.trim()) e.fullName = 'Wpisz imię i nazwisko.';
      if (!/^\d{11}$/.test(pesel)) e.pesel = 'PESEL musi mieć 11 cyfr.';
    }
    if (step >= 2) {
      if (!childName.trim()) e.childName = 'Wpisz imię dziecka.';
      const y = Number(childBirthYear);
      const now = new Date().getFullYear();
      if (!y || y < 2000 || y > now) e.childBirthYear = 'Podaj rok urodzenia między 2000 a bieżącym.';
    }
    if (step >= 3) {
      if (!/^SE\d{22}$/i.test(iban.replace(/\s+/g, ''))) e.iban = 'Numer konta SE-IBAN musi mieć SE i 22 cyfry.';
    }
    return e;
  }

  function next() {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length === 0) {
      setStep((s) => (s < 3 ? ((s + 1) as Step) : s));
    } else {
      // Focus the error summary so screen readers read the list of problems.
      setTimeout(() => errorSummaryRef.current?.focus(), 0);
    }
  }

  function prev() {
    setStep((s) => (s > 0 ? ((s - 1) as Step) : s));
  }

  function submit() {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length === 0) {
      setSubmitted(true);
      if (announcerRef.current) {
        announcerRef.current.textContent =
          'Wniosek złożony. Försäkringskassan otrzyma Twoje zgłoszenie. Numer sprawy zostanie wysłany SMS-em.';
      }
    } else {
      setTimeout(() => errorSummaryRef.current?.focus(), 0);
    }
  }

  const errorList = Object.entries(errors);

  return (
    <section aria-labelledby="d3-title" className="d3-page">
      <div className="page-shell">
        <header className="page-shell__head">
          <h1 id="d3-title" ref={headingRef} tabIndex={-1}>
            ♿ Demo 3 — Maria · Polish screen-reader child-benefit application
          </h1>
          <p>
            <strong>This page is built for screen readers.</strong> Start NVDA, JAWS or VoiceOver, then press
            <kbd>Tab</kbd>. The wizard is in <strong>Polish</strong> — your screen reader should switch voice automatically
            because the wizard region is marked <code>lang="pl"</code>. A polite live region announces every step change.
          </p>
          <ul className="d3-page__cues">
            <li>👉 The heading above receives focus on load — the first Tab moves you into the wizard.</li>
            <li>👉 Every field has a visible <code>&lt;label&gt;</code> + descriptive help text via <code>aria-describedby</code>.</li>
            <li>👉 Validation builds an <strong>error summary</strong> that grabs focus and lists the problems.</li>
            <li>👉 The grey banner at the bottom of the page is an <code>aria-live="polite"</code> announcer.</li>
          </ul>
        </header>

        {/* Live announcer — visually hidden but read by screen readers, in Polish */}
        <div
          ref={announcerRef}
          className="sr-only"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          lang="pl"
        />

        {!submitted && (
          <ol className="d3-stepper" aria-label="Postęp wniosku" lang="pl">
            {STEP_LABELS.map((label, idx) => (
              <li
                key={label}
                aria-current={idx === step ? 'step' : undefined}
                className={idx === step ? 'd3-stepper__item d3-stepper__item--current' : 'd3-stepper__item'}
              >
                <span className="d3-stepper__num" aria-hidden="true">{idx + 1}</span>
                {label}
              </li>
            ))}
          </ol>
        )}

        {!submitted && errorList.length > 0 && (
          <div
            ref={errorSummaryRef}
            tabIndex={-1}
            role="alert"
            aria-labelledby="d3-error-summary-title"
            className="d3-error-summary"
            lang="pl"
          >
            <h2 id="d3-error-summary-title">Sprawdź formularz — {errorList.length} błąd(ów)</h2>
            <ul>
              {errorList.map(([k, v]) => (
                <li key={k}>{v}</li>
              ))}
            </ul>
          </div>
        )}

        {submitted ? (
          <div className="d3-success" role="alert" lang="pl">
            <h2>✅ Wniosek wysłany do Försäkringskassan</h2>
            <p>
              Maria, Twój wniosek o świadczenie dziecięce został przesłany do szwedzkiego urzędu ubezpieczeń społecznych
              (Försäkringskassan). Decyzję otrzymasz pocztą; status zobaczysz w zakładce „My cases".
            </p>
            <p>
              <strong>UDCSP nie podejmuje decyzji</strong> — przygotowuje wniosek i przekazuje go właściwemu organowi
              krajowemu (most do urzędu Försäkringskassan).
            </p>
          </div>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); step === 3 ? submit() : next(); }}
            className="d3-form"
            lang="pl"
            noValidate
          >
            {step === 0 && (
              <fieldset>
                <legend>Krok 1 z 4 — Powitanie</legend>
                <p>
                  Witaj. Ten kreator pomoże Ci złożyć wniosek o szwedzkie świadczenie dziecięce
                  (<i>barnbidrag</i>). Wniosek zostanie wysłany do <strong>Försäkringskassan</strong> — UDCSP
                  pełni rolę mostu, decyzję podejmuje urząd szwedzki.
                </p>
                <p>Naciśnij „Dalej", aby kontynuować.</p>
              </fieldset>
            )}

            {step === 1 && (
              <fieldset>
                <legend>Krok 2 z 4 — Twoje dane</legend>

                <div className="d3-form__row">
                  <label htmlFor={fullNameId}>Imię i nazwisko</label>
                  <input
                    id={fullNameId}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    aria-describedby={`${fullNameId}-help`}
                    aria-invalid={errors.fullName ? 'true' : 'false'}
                    autoComplete="name"
                    required
                  />
                  <span id={`${fullNameId}-help`} className="d3-form__help">
                    Tak jak na dokumencie tożsamości.
                  </span>
                  {errors.fullName && <span className="d3-form__error">{errors.fullName}</span>}
                </div>

                <div className="d3-form__row">
                  <label htmlFor={peselId}>PESEL (polski numer identyfikacyjny)</label>
                  <input
                    id={peselId}
                    value={pesel}
                    onChange={(e) => setPesel(e.target.value)}
                    aria-describedby={`${peselId}-help`}
                    aria-invalid={errors.pesel ? 'true' : 'false'}
                    inputMode="numeric"
                    maxLength={11}
                    required
                  />
                  <span id={`${peselId}-help`} className="d3-form__help">
                    11 cyfr. UDCSP zmapuje PESEL na szwedzkie samordningsnummer.
                  </span>
                  {errors.pesel && <span className="d3-form__error">{errors.pesel}</span>}
                </div>
              </fieldset>
            )}

            {step === 2 && (
              <fieldset>
                <legend>Krok 3 z 4 — Dane dziecka</legend>

                <div className="d3-form__row">
                  <label htmlFor={childNameId}>Imię i nazwisko dziecka</label>
                  <input
                    id={childNameId}
                    value={childName}
                    onChange={(e) => setChildName(e.target.value)}
                    aria-describedby={`${childNameId}-help`}
                    aria-invalid={errors.childName ? 'true' : 'false'}
                    required
                  />
                  <span id={`${childNameId}-help`} className="d3-form__help">
                    Imię musi być zgodne z aktem urodzenia.
                  </span>
                  {errors.childName && <span className="d3-form__error">{errors.childName}</span>}
                </div>

                <div className="d3-form__row">
                  <label htmlFor={childYearId}>Rok urodzenia</label>
                  <input
                    id={childYearId}
                    value={childBirthYear}
                    onChange={(e) => setChildBirthYear(e.target.value)}
                    aria-describedby={`${childYearId}-help`}
                    aria-invalid={errors.childBirthYear ? 'true' : 'false'}
                    inputMode="numeric"
                    maxLength={4}
                    required
                  />
                  <span id={`${childYearId}-help`} className="d3-form__help">
                    Cztery cyfry, np. 2019.
                  </span>
                  {errors.childBirthYear && <span className="d3-form__error">{errors.childBirthYear}</span>}
                </div>
              </fieldset>
            )}

            {step === 3 && (
              <fieldset>
                <legend>Krok 4 z 4 — Konto bankowe i podsumowanie</legend>

                <div className="d3-form__row">
                  <label htmlFor={ibanId}>Numer konta SE-IBAN</label>
                  <input
                    id={ibanId}
                    value={iban}
                    onChange={(e) => setIban(e.target.value)}
                    aria-describedby={`${ibanId}-help`}
                    aria-invalid={errors.iban ? 'true' : 'false'}
                    required
                  />
                  <span id={`${ibanId}-help`} className="d3-form__help">
                    SE + 22 cyfry. Świadczenie zostanie wypłacone na to konto.
                  </span>
                  {errors.iban && <span className="d3-form__error">{errors.iban}</span>}
                </div>

                <dl className="d3-summary" aria-label="Podsumowanie wniosku">
                  <dt>Imię i nazwisko</dt><dd>{fullName || '—'}</dd>
                  <dt>PESEL</dt><dd>{pesel || '—'}</dd>
                  <dt>Imię dziecka</dt><dd>{childName || '—'}</dd>
                  <dt>Rok urodzenia dziecka</dt><dd>{childBirthYear || '—'}</dd>
                  <dt>Konto SE-IBAN</dt><dd>{iban || '—'}</dd>
                </dl>
              </fieldset>
            )}

            <div className="d3-form__actions">
              {step > 0 && (
                <button type="button" onClick={prev}>← Wstecz</button>
              )}
              {step < 3 && (
                <button type="submit">Dalej →</button>
              )}
              {step === 3 && (
                <button type="submit" className="d3-form__submit">Wyślij wniosek do Försäkringskassan</button>
              )}
            </div>
          </form>
        )}

        <footer className="d3-page__foot">
          <p>
            <strong>What this proves.</strong> The full wizard is keyboard-only operable, every field is announced with
            its label and help text, validation produces a focused error summary, and the page tells the screen reader
            it is in Polish so the right voice is used. UDCSP is the unified front door — the official decision is
            taken by Försäkringskassan in Sweden.
          </p>
        </footer>
      </div>
    </section>
  );
}
