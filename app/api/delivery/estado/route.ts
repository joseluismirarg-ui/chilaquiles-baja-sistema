// GET /api/delivery/estado
//
// Devuelve, por plataforma, si están las credenciales, si la última
// sincronización funcionó y (opcionalmente) si el token se puede obtener ahora.
// Es lo que alimenta la pantalla /integraciones.

import { plataformaConfigurada, variablesFaltantes } from '@/lib/delivery/config';
import { conectoresDisponibles } from '@/lib/delivery/sync';
import {
  hayServiceRoleKey,
  supabaseAdmin,
  usuarioDesdePeticion,
} from '@/lib/delivery/supabase-servidor';
import { NOMBRE_PLATAFORMA, Plataforma, PLATAFORMAS } from '@/lib/delivery/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type UltimaSync = {
  fecha: string;
  estado: string;
  pedidos: number;
  dineroNeto: number;
  mensaje: string | null;
};

async function ultimasSincronizaciones(): Promise<Partial<Record<Plataforma, UltimaSync>>> {
  if (!hayServiceRoleKey()) return {};

  const { data, error } = await supabaseAdmin()
    .from('sincronizaciones_delivery')
    .select('plataforma, estado, pedidos_sincronizados, dinero_neto, mensaje, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !data) return {};

  const porPlataforma: Partial<Record<Plataforma, UltimaSync>> = {};

  for (const fila of data) {
    const plataforma = fila.plataforma as Plataforma;
    // Las filas vienen ordenadas de más nueva a más vieja: la primera gana.
    if (porPlataforma[plataforma]) continue;
    porPlataforma[plataforma] = {
      fecha: fila.created_at,
      estado: fila.estado,
      pedidos: fila.pedidos_sincronizados ?? 0,
      dineroNeto: Number(fila.dinero_neto ?? 0),
      mensaje: fila.mensaje ?? null,
    };
  }

  return porPlataforma;
}

export async function GET(request: Request) {
  const usuario = await usuarioDesdePeticion(request);
  if (!usuario) {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }

  // Probar la conexión hace llamadas reales a las plataformas: sólo bajo pedido.
  const probar = new URL(request.url).searchParams.get('probar') === '1';
  const conectores = new Map(
    conectoresDisponibles().map((conector) => [conector.plataforma, conector])
  );
  const ultimas = await ultimasSincronizaciones();

  const plataformas = await Promise.all(
    PLATAFORMAS.map(async (plataforma) => {
      const configurada = plataformaConfigurada(plataforma);
      let conexion: { ok: boolean; error?: string } | null = null;

      if (probar && configurada) {
        const conector = conectores.get(plataforma);
        try {
          await conector?.probarConexion();
          conexion = { ok: true };
        } catch (error) {
          conexion = {
            ok: false,
            error: error instanceof Error ? error.message : 'Error desconocido',
          };
        }
      }

      return {
        plataforma,
        nombre: NOMBRE_PLATAFORMA[plataforma],
        configurada,
        variablesFaltantes: variablesFaltantes(plataforma),
        conexion,
        ultimaSincronizacion: ultimas[plataforma] ?? null,
      };
    })
  );

  return Response.json({
    plataformas,
    // Sin service role key la lectura funciona pero no se puede guardar nada.
    puedeGuardar: hayServiceRoleKey(),
    socioSincronizacionConfigurado: Boolean(process.env.DELIVERY_SYNC_SOCIO_ID?.trim()),
  });
}
