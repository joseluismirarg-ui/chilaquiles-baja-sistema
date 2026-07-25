// Clientes de Supabase para uso exclusivo en el servidor.
//
// El cliente de `lib/supabase.ts` usa la anon key y vive en el navegador con la
// sesión del socio. La sincronización, en cambio, escribe filas que no pertenecen
// a ningún socio en particular, así que necesita la service role key (que salta
// RLS) y jamás debe salir del servidor.

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let clienteAdmin: SupabaseClient | null = null;

function urlSupabase(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) {
    throw new Error('Falta NEXT_PUBLIC_SUPABASE_URL');
  }
  return url;
}

/**
 * Cliente con permisos de servicio para escribir los datos sincronizados.
 * Lanza si no está configurada la llave, porque escribir con la anon key
 * fallaría silenciosamente por RLS.
 */
export function supabaseAdmin(): SupabaseClient {
  if (clienteAdmin) return clienteAdmin;

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceRoleKey) {
    throw new Error(
      'Falta SUPABASE_SERVICE_ROLE_KEY. Es necesaria para guardar los datos de delivery ' +
        '(las políticas RLS bloquean la escritura con la anon key).'
    );
  }

  clienteAdmin = createClient(urlSupabase(), serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return clienteAdmin;
}

export function hayServiceRoleKey(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

export type UsuarioAutenticado = {
  id: string;
  email?: string;
};

/**
 * Valida el access token que manda el navegador en `Authorization: Bearer ...`.
 * Devuelve null si no hay token o si Supabase lo rechaza.
 */
export async function usuarioDesdePeticion(
  request: Request
): Promise<UsuarioAutenticado | null> {
  const cabecera = request.headers.get('authorization') ?? '';
  const token = cabecera.toLowerCase().startsWith('bearer ')
    ? cabecera.slice(7).trim()
    : '';

  if (!token) return null;

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!anonKey) return null;

  // Cliente efímero: sólo sirve para resolver el token de esta petición.
  const cliente = createClient(urlSupabase(), anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await cliente.auth.getUser(token);
  if (error || !data.user) return null;

  return { id: data.user.id, email: data.user.email ?? undefined };
}
