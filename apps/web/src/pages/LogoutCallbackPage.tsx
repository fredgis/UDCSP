import { FormattedMessage } from 'react-intl';
export function LogoutCallbackPage() { return <section><h1><FormattedMessage id="logout.title" defaultMessage="You are signed out" /></h1><p><FormattedMessage id="logout.body" defaultMessage="Your browser session has ended. Shared devices should also be closed after use." /></p></section>; }
