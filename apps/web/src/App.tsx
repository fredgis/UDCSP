import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { MsalProvider, useIsAuthenticated } from '@azure/msal-react';
import { FormattedMessage, IntlProvider } from 'react-intl';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { msalInstance } from './auth/msalConfig';
import { AuthGate } from './auth/AuthGate';
import { AccessibilityMenu } from './components/AccessibilityMenu';
import { ChatLauncher } from './components/ChatLauncher';
import { CookieBanner } from './components/CookieBanner';
import { CountryFlags } from './components/CountryFlags';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { SkipNav } from './components/SkipNav';
import { UserBadge } from './components/UserBadge';
import { SupportedLanguage } from './utils/language';
import { AccessibilityStatementPage } from './pages/AccessibilityStatementPage';
import { ApplyChildBenefitPage } from './pages/ApplyChildBenefitPage';
import { ApplyResidencyPage } from './pages/ApplyResidencyPage';
import { ApplyTaxCertPage } from './pages/ApplyTaxCertPage';
import { CaseDetailPage } from './pages/CaseDetailPage';
import { ConsentManagementPage } from './pages/ConsentManagementPage';
import { DemoScenarioPage } from './pages/DemoScenarioPage';
import { DemosIndexPage } from './pages/DemosIndexPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { LogoutCallbackPage } from './pages/LogoutCallbackPage';
import { MyCasesPage } from './pages/MyCasesPage';

function HeaderTools({
  locale,
  onLocaleChange,
}: {
  locale: SupportedLanguage;
  onLocaleChange: (l: SupportedLanguage) => void;
}) {
  const isAuth = useIsAuthenticated();
  return (
    <div className="header-tools">
      <CountryFlags disabled={isAuth} />
      <LanguageSwitcher value={locale} onChange={onLocaleChange} />
      <UserBadge />
    </div>
  );
}

export function App({ locale, messages, onLocaleChange }: { locale: SupportedLanguage; messages: Record<string, string>; onLocaleChange: (l: SupportedLanguage) => void }) {
  return (
    <MsalProvider instance={msalInstance}>
      <IntlProvider locale={locale} messages={messages} defaultLocale="en">
        <FluentProvider theme={webLightTheme}>
          <BrowserRouter>
            <CookieBanner />
            <SkipNav />
            <header className="site-header">
              <Link to="/" className="brand">
                <span className="brand-logo" aria-hidden="true">UD</span>
                <span>UDCSP<span style={{ color: 'var(--color-fg-soft)', fontWeight: 500, marginLeft: '.4rem', fontSize: '.85rem' }}>Citizen Portal</span></span>
              </Link>
              <nav className="site-nav" aria-label="Main">
                <Link to="/"><FormattedMessage id="nav.home" defaultMessage="Home" /></Link>
                <Link to="/cases"><FormattedMessage id="nav.cases" defaultMessage="My cases" /></Link>
                <Link to="/demos"><FormattedMessage id="nav.demos" defaultMessage="Demos" /></Link>
                <Link to="/consent"><FormattedMessage id="nav.consent" defaultMessage="Consent" /></Link>
                <Link to="/accessibility"><FormattedMessage id="nav.accessibility" defaultMessage="Accessibility" /></Link>
              </nav>
              <HeaderTools locale={locale} onLocaleChange={onLocaleChange} />
            </header>
            <main id="main-content" tabIndex={-1}>
              <Routes>
                <Route path="/" element={<HomePage locale={locale} />} />
                <Route path="/demos" element={<DemosIndexPage />} />
                <Route path="/apply/residency" element={<AuthGate title="Sign in to apply for residency"><ApplyResidencyPage /></AuthGate>} />
                <Route path="/apply/tax-certificate" element={<AuthGate title="Sign in to request a tax certificate"><ApplyTaxCertPage /></AuthGate>} />
                <Route path="/apply/child-benefit" element={<AuthGate title="Sign in to apply for child benefit"><ApplyChildBenefitPage /></AuthGate>} />
                <Route path="/cases" element={<AuthGate title="Sign in to view your cases"><MyCasesPage /></AuthGate>} />
                <Route path="/cases/:id" element={<AuthGate title="Sign in to view this case"><CaseDetailPage /></AuthGate>} />
                <Route path="/accessibility" element={<><AccessibilityStatementPage /><AccessibilityMenu /></>} />
                <Route path="/consent" element={<AuthGate title="Sign in to manage your consents"><ConsentManagementPage /></AuthGate>} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/logout-callback" element={<LogoutCallbackPage />} />
                <Route path="/demo/:id" element={<DemoScenarioPage />} />
              </Routes>
            </main>
            <ChatLauncher locale={locale} />
            <footer className="site-footer">
              <div className="site-footer__inner">
                <div className="site-footer__brand">
                  <span className="brand-logo" aria-hidden="true">UD</span>
                  <span>Unified Digital Citizen Services Platform</span>
                </div>
                <nav aria-label="Footer">
                  <Link to="/demos">Demonstrations</Link>
                  <Link to="/accessibility">Accessibility</Link>
                  <Link to="/consent">Consent &amp; privacy</Link>
                  <a href="https://github.com/fredgis/UDCSP" rel="noreferrer">About this platform</a>
                </nav>
                <div>© {new Date().getFullYear()} UDCSP · EU sovereign · DK · SE · NO</div>
              </div>
            </footer>
          </BrowserRouter>
        </FluentProvider>
      </IntlProvider>
    </MsalProvider>
  );
}
