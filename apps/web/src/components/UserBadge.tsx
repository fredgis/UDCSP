import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { Link } from 'react-router-dom';
import { countries, getCountry } from '../auth/msalConfig';

export function UserBadge() {
  const { instance, accounts } = useMsal();
  const isAuth = useIsAuthenticated();
  const country = getCountry();
  const flag = countries.find((c) => c.code === country)?.flag || '🌐';

  if (!isAuth) {
    return (
      <Link to="/login" className="user-badge user-badge--anon" aria-label="Sign in">
        <span aria-hidden="true">{flag}</span>
        <span>Sign in</span>
      </Link>
    );
  }

  const acc = accounts[0];
  const name = acc?.name || acc?.username || 'Citizen';
  const initial = name.charAt(0).toUpperCase();

  const signOut = () => {
    void instance.logoutRedirect({ postLogoutRedirectUri: window.location.origin });
  };

  return (
    <div className="user-badge user-badge--auth">
      <span className="user-badge__avatar" aria-hidden="true">{initial}</span>
      <span className="user-badge__meta">
        <span className="user-badge__name">{name}</span>
        <span className="user-badge__country">{flag} {country.toUpperCase()}</span>
      </span>
      <button type="button" className="user-badge__signout" onClick={signOut} aria-label="Sign out">Sign out</button>
    </div>
  );
}
