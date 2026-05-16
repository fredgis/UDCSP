import { Link, useNavigate } from 'react-router-dom';
import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { FormattedMessage } from 'react-intl';
import { getCountry } from '../auth/msalConfig';
import { Flag } from './Flag';

const COUNTRY_NAME_LOCALIZED: Record<string, string> = {
  dk: 'Danmark', se: 'Sverige', no: 'Norge',
};

export function UserBadge() {
  const { instance, accounts } = useMsal();
  const isAuth = useIsAuthenticated();
  const navigate = useNavigate();
  const country = getCountry();

  if (!isAuth) {
    return (
      <Link to="/login" className="user-badge user-badge--anon" aria-label="Sign in or create an account">
        <span aria-hidden="true">→</span>
        <span><FormattedMessage id="header.signin" defaultMessage="Sign in" /></span>
      </Link>
    );
  }

  const acc = accounts[0];
  const name = acc?.name || (acc?.username as string)?.split('@')[0] || 'Citizen';
  const first = name.split(/\s+/)[0];
  const initial = first.charAt(0).toUpperCase();

  const signOut = () => {
    // Navigate the SPA to home FIRST so that even if MSAL/IdP falls back
    // to "current location" for the post-logout redirect, that location
    // is the home page rather than a protected /apply/* route. The
    // postLogoutRedirectUri below also explicitly forces origin + '/'.
    navigate('/');
    void instance.logoutRedirect({
      postLogoutRedirectUri: window.location.origin + '/',
    });
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
          <span className="user-badge__name">
            <FormattedMessage id="header.greeting" defaultMessage="Hi {name}" values={{ name: first }} />{' '}
            <span className="user-badge__flag" aria-hidden="true"><Flag countryCode={country} /></span>
          </span>
          <span className="user-badge__country">
            <FormattedMessage
              id="header.country.citizen"
              defaultMessage="{country} citizen"
              values={{ country: COUNTRY_NAME_LOCALIZED[country] || country.toUpperCase() }}
            />
          </span>
        </span>
      </button>
      <button type="button" className="user-badge__signout" onClick={signOut}>
        <FormattedMessage id="header.signout" defaultMessage="Sign out" />
      </button>
    </div>
  );
}
