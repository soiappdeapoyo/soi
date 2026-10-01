import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { PROTECTED_PREFIXES } from '@/config/navigation';

type CookieToSet = { name: string; value: string; options: CookieOptions };

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error('[middleware] Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY');
    return response; // No bloquea el sitio; las páginas protegidas validan sesión de nuevo en el servidor.
  }

  try {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet: CookieToSet[]) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });

    const { data: { user } } = await supabase.auth.getUser();
    const path = request.nextUrl.pathname;

    if (!user && PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
      const redirect = request.nextUrl.clone();
      redirect.pathname = '/login';
      redirect.search = '';
      redirect.searchParams.set('next', path);
      return NextResponse.redirect(redirect);
    }

    if (user && path === '/login') {
      const redirect = request.nextUrl.clone();
      redirect.pathname = '/chat';
      redirect.search = '';
      return NextResponse.redirect(redirect);
    }
  } catch (error) {
    console.error('[middleware]', error);
    // Si Supabase falla, dejamos pasar: el layout de (app) vuelve a verificar la sesión.
  }

  return response;
}
