import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { PROTECTED_PREFIXES } from '@/config/navigation';

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Middleware de sesión (patrón oficial de @supabase/ssr, compatible con Edge).
 *
 * Por qué existe: el token de acceso de Supabase vence cada hora. Las páginas (Server Components) NO pueden guardar
 * cookies, así que si el token se renovaba ahí, la cookie nueva se perdía, el navegador volvía a usar el token de
 * renovación ya gastado y Supabase cerraba la sesión («me saca»). Aquí sí se pueden escribir: se renueva la sesión
 * en cada visita (getClaims verifica el token con la llave pública, en memoria, y solo llama a Supabase cuando hay
 * que renovarlo) y las cookies nuevas viajan en la respuesta. Si la sesión ya no sirve, Supabase borra las cookies
 * viejas y la persona va a /login sin quedar atrapada con una cookie rota.
 */
export async function updateSession(request: NextRequest) {
  // Un solo dominio: si el inicio con Google empieza en www y vuelve a yosoi.app (o al revés), la cookie de
  // verificación (PKCE) se queda en el otro dominio y el login "se interrumpe".
  const host = request.headers.get('host') ?? '';
  if (host.startsWith('www.')) {
    const url = request.nextUrl.clone();
    url.host = host.slice(4);
    url.port = '';
    return NextResponse.redirect(url, 308);
  }

  let response = NextResponse.next({ request });
  const hasCookie = request.cookies.getAll().some((c) => c.name.startsWith('sb-') && c.name.includes('-auth-token'));

  let signedIn = false;
  // Nunca un 500 por la sesión: si algo falla al leerla, se trata como sin sesión (va a /login).
  if (hasCookie && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) try {
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet: CookieToSet[]) => {
          // La petición que sigue (la página) ve ya las cookies nuevas, y el navegador las guarda con la respuesta.
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    const { data, error } = await supabase.auth.getClaims();
    signedIn = !error && Boolean(data?.claims?.sub);
  } catch (e) {
    console.error('[auth] middleware', e instanceof Error ? e.message : e);
  }

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
  // Redirigir conservando las cookies que Supabase acaba de escribir o borrar.
  const redirectTo = (url: URL) => {
    const r = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  };

  // Con la sesión viva, /login lleva adentro: antes mostraba el botón de Google y la persona volvía a entrar (otra
  // sesión) creyendo que la app la había sacado.
  if (signedIn && path === '/login') {
    const next = request.nextUrl.searchParams.get('next') ?? '';
    const url = request.nextUrl.clone();
    url.pathname = next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/login') ? next.split('?')[0]! : '/hoy';
    url.search = next.includes('?') ? `?${next.split('?').slice(1).join('?')}` : '';
    return redirectTo(url);
  }

  // /persons es otro tipo de cuenta, con su propia pantalla de entrada.
  if (!signedIn && (path === '/persons' || path.startsWith('/persons/')) && path !== '/persons/entrar') {
    const url = request.nextUrl.clone();
    url.pathname = '/persons/entrar';
    url.search = '';
    if (path !== '/persons') url.searchParams.set('next', path);
    return redirectTo(url);
  }

  if (!signedIn && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    url.searchParams.set('next', path);
    return redirectTo(url);
  }

  return response;
}
