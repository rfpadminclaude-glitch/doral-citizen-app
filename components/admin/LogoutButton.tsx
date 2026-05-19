'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LogoutButton({ label }: { label: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function signOut() {
    startTransition(async () => {
      await createClient().auth.signOut();
      router.replace('/login');
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={pending}
      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-doral-blue"
    >
      {pending ? '…' : label}
    </button>
  );
}
