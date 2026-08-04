import { redirect } from 'next/navigation';

/**
 * The customer dashboard now lives under /account. This route is kept so old
 * links and bookmarks continue to resolve.
 */
export default function ProfileRedirectPage() {
  redirect('/account');
}
