'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function setLocaleCookie(locale: 'en' | 'es') {
  cookies().set('NEXT_LOCALE', locale, {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365
  });
  revalidatePath('/', 'layout');
}
