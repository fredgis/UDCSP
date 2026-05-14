import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Site-wide route announcer for screen readers.
 *
 * On every URL change:
 *   1. Reads the new page's first <h1> text (or document.title fallback).
 *   2. Updates document.title so the browser tab + screen-reader tab announce
 *      report the new page.
 *   3. Moves keyboard focus to the first <h1> (the h1 must have tabIndex={-1}
 *      OR we set it temporarily) so screen readers start reading the page from
 *      its title — this is the WCAG 2.4.2 / 2.4.6 pattern recommended by W3C
 *      WAI for SPA route changes.
 *   4. Pushes the same text into a visually-hidden aria-live="polite" region
 *      so even if focus management fails, NVDA/JAWS/VoiceOver/Narrator still
 *      announce that a navigation happened.
 *
 * The component renders nothing visible. It must be mounted INSIDE
 * <BrowserRouter> and AFTER the <main> element so the h1 query targets
 * the freshly-rendered route.
 */
export function RouteAnnouncer() {
  const location = useLocation();
  const [message, setMessage] = useState('');
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Wait one tick so React has committed the new route's DOM.
    const handle = window.setTimeout(() => {
      const main = document.getElementById('main-content');
      const h1 = main?.querySelector('h1') as HTMLHeadingElement | null;

      const pageLabel =
        h1?.textContent?.trim() ||
        document.title ||
        'Page';

      // Update tab title so the browser / OS announces the route change.
      const baseTitle = 'UDCSP — Unified Digital Citizen Services Platform';
      document.title =
        location.pathname === '/' ? baseTitle : `${pageLabel} · UDCSP`;

      // Focus the h1 so AT starts reading from the page title. Skip on the
      // very first render to preserve normal page-load behaviour (the user's
      // own click on the address bar / refresh).
      if (!isFirstRender.current && h1) {
        if (!h1.hasAttribute('tabindex')) {
          h1.setAttribute('tabindex', '-1');
        }
        try {
          h1.focus({ preventScroll: false });
        } catch {
          /* ignore */
        }
      } else if (!isFirstRender.current && main) {
        // Fallback: focus the <main> region.
        try {
          main.focus({ preventScroll: false });
        } catch {
          /* ignore */
        }
      }

      // Always update the live region — this is the belt-and-braces channel
      // that works even if focus did not move (e.g. modal dialogs).
      if (!isFirstRender.current) {
        setMessage(`${pageLabel}, navigated`);
      }

      isFirstRender.current = false;
    }, 50);

    return () => window.clearTimeout(handle);
  }, [location.pathname]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
      data-testid="route-announcer"
    >
      {message}
    </div>
  );
}
