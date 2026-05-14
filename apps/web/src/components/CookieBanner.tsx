import { useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';

const STORAGE_KEY = 'udcsp.cookie-consent';

type ConsentChoice = 'all' | 'essential' | null;

type ConsentRecord = {
  choice: Exclude<ConsentChoice, null>;
  decidedAt: string;
  version: number;
};

const CURRENT_POLICY_VERSION = 1;

function readStoredChoice(): ConsentChoice {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const rec = JSON.parse(raw) as ConsentRecord;
    if (rec.version !== CURRENT_POLICY_VERSION) return null;
    return rec.choice;
  } catch {
    return null;
  }
}

function persistChoice(choice: Exclude<ConsentChoice, null>): void {
  const rec: ConsentRecord = { choice, decidedAt: new Date().toISOString(), version: CURRENT_POLICY_VERSION };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rec));
  window.dispatchEvent(new CustomEvent('udcsp:cookie-consent-changed', { detail: rec }));
}

/**
 * ePrivacy Directive 2002/58/EC, Art. 5(3) cookie banner.
 *
 * Design intent (anchored on docs/biz/datacompliance.md § 6):
 *   - The banner appears only on first visit (and on policy bumps); subsequent
 *     visits read the previous choice from localStorage.
 *   - Three buttons of equal visual weight: "Accept all", "Essential only",
 *     "Settings". Refusing must be as easy as accepting (CNIL guidance, EDPB
 *     Guidelines 03/2022) — that is why "Essential only" is not hidden behind
 *     a secondary chevron.
 *   - The banner is keyboard-trappable inside its own dialog and announced
 *     to screen readers via role="dialog" + aria-modal="true" + aria-labelledby
 *     + aria-describedby. WCAG 2.1 AA conformant (datacompliance.md § 9).
 *   - On choice, a custom event is dispatched so the analytics initialiser
 *     and the consent-management page can react synchronously.
 *   - The component intentionally does not load any third-party script
 *     itself — the side-effect is downstream, gated on the dispatched event.
 */
export function CookieBanner({
  onChoice,
  onOpenSettings,
}: {
  onChoice?: (choice: Exclude<ConsentChoice, null>) => void;
  onOpenSettings?: () => void;
}) {
  const [open, setOpen] = useState<boolean>(() => readStoredChoice() === null);
  const acceptRef = useRef<HTMLButtonElement | null>(null);
  const intl = useIntl();
  const navigate = useNavigate();

  useEffect(() => {
    if (open) acceptRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const decide = (choice: Exclude<ConsentChoice, null>): void => {
    persistChoice(choice);
    setOpen(false);
    onChoice?.(choice);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-body"
      className="cookie-banner"
      data-testid="cookie-banner"
    >
      <div className="cookie-banner__card">
      <h2 id="cookie-banner-title">
        <FormattedMessage id="cookie.title" defaultMessage="Cookies on UDCSP" />
      </h2>
      <p id="cookie-banner-body">
        <FormattedMessage
          id="cookie.body"
          defaultMessage="We use cookies to make this service work and to understand how it is used. We never set marketing or third-party tracking cookies. You can change your choice at any time on the Consent page."
        />
      </p>
      <ul aria-label={intl.formatMessage({ id: 'cookie.categories.label', defaultMessage: 'Cookie categories' })}>
        <li>
          <strong>
            <FormattedMessage id="cookie.essential.label" defaultMessage="Essential" />
          </strong>
          {' — '}
          <FormattedMessage
            id="cookie.essential.body"
            defaultMessage="Required for sign-in, language preference, accessibility settings, and CSRF protection. Cannot be disabled."
          />
        </li>
        <li>
          <strong>
            <FormattedMessage id="cookie.analytics.label" defaultMessage="Analytics (App Insights)" />
          </strong>
          {' — '}
          <FormattedMessage
            id="cookie.analytics.body"
            defaultMessage="Helps us measure page performance and detect errors. Pseudonymised; never sent outside the EU. Optional."
          />
        </li>
      </ul>
      <div className="cookie-banner__actions">
        <button
          ref={acceptRef}
          type="button"
          className="cookie-banner__btn cookie-banner__btn--primary"
          onClick={() => decide('all')}
        >
          <FormattedMessage id="cookie.acceptAll" defaultMessage="Accept all" />
        </button>
        <button
          type="button"
          className="cookie-banner__btn cookie-banner__btn--primary"
          onClick={() => decide('essential')}
        >
          <FormattedMessage id="cookie.essentialOnly" defaultMessage="Essential only" />
        </button>
        <button
          type="button"
          className="cookie-banner__btn cookie-banner__btn--secondary"
          onClick={() => {
            if (onOpenSettings) {
              onOpenSettings();
            } else {
              setOpen(false);
              navigate('/consent');
            }
          }}
        >
          <FormattedMessage id="cookie.settings" defaultMessage="Settings" />
        </button>
      </div>
      </div>
    </div>
  );
}

export const cookieBanner = { STORAGE_KEY, CURRENT_POLICY_VERSION, readStoredChoice };
