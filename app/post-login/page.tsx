import { redirect } from 'next/navigation';
import { auth, signOut } from '@/auth';
import { canManage } from '@/lib/roles';

// Landing spot right after Azure AD redirects back. Routes the person to the
// right dashboard based on their role in the agents table, or shows a
// friendly message if their account hasn't been provisioned yet.
export default async function PostLoginPage() {
  const session = await auth();
  if (!session) redirect('/');

  if (!session.authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md text-center space-y-4">
          <h1 className="text-xl font-bold text-gray-800">Access not set up yet</h1>
          <p className="text-gray-500 text-sm">
            You&apos;re signed in as <span className="font-semibold">{session.user?.email}</span>, but this
            account hasn&apos;t been added to Direct Contacts yet. Ask a manager to add you from the Admin Panel using
            this email address.
          </p>
          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/' });
            }}
          >
            <button className="mt-2 border-2 border-gray-200 text-gray-700 px-4 py-2 rounded-xl font-bold hover:bg-gray-50 transition">
              Sign out
            </button>
          </form>
        </div>
      </div>
    );
  }

  redirect(canManage(session.role) ? '/manager' : '/agent');
}
