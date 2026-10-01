import { NextResponse, type NextRequest } from 'next/server';
import { PROTECTED_PREFIXES } from '@/config/navigation';

/**
 * Middleware ligero compatible con Edge Runtime (sin importar Supabase).
 * Solo revisa si existe la cookie de sesión de Supabase (sb-<ref>-auth-token).
 * La validación real de la sesión ocurre en el servidor: src/app/(app)/layout.tsx.
 */
export function updateSession(request: NextRequest) {
  const hasSession = request.cookies
    .getAll()
    .some((c) => c.name.startsWith('sb-') && c.name.includes('-auth-token'));

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));

  if (!hasSession && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
