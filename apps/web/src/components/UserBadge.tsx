import { Link, useNavigate } from 'react-router-dom';
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { countries, getCountry } from '../auth/msalConfig';

export function UserBadge() {
  const { instance, accounts } = useMsal();
  const isAuth = useIsAuthenticated();
  const navigate = useNavigate();
  const country = getCountry();
  const flag = countries.find((c) => c.code === country)?.flag || '🌐';

  if (!isAuth) {
    return (
      <Link to="/login" className="user-badge user-badge--anon" aria-label="Sign in or create an account">
        <span aria-hidden="true">→</span>
        <span>Sign in</span>
      </Link>
    );
  }

  const acc = accounts[0];
  const name = acc?.name || (acc?.username as string)?.split('@')[0] || 'Citizen';
  const first = name.split(/\s+/)[0];
  const initial = first.charAt(0).toUpperCase();

  const signOut = () => {
    void instance.logoutRedirect({ postLogoutRedirectUri: window.location.origin });
  };

  return (
    <div className="user-badge user-badge--auth">
      <button
        type="button"
        className="user-badge__identity"
        title="View my cases"
        onClick={() => navigate('/cases')}
      >
        <span className="user-badge__avatar" aria-hidden="true">{initial}</span>
        <span className="user-badge__meta">
          <span className="user-badge__name">Hi {first} <span className="user-badge__flag" aria-hidden="true">{flag}</span></span>
          <span className="user-badge__country">{country.toUpperCase()} citizen</span>
        </span>
      </button>
      <button type="button" className="user-badge__signout" onClick={signOut} aria-label="Sign out">
        Sign out
      </button>
    </div>
  );
}
