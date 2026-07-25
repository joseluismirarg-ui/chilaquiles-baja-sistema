// POST /api/delivery/sincronizar
//
// Trae las ventas de un rango de fechas desde Uber Eats y/o Didi Food y las
// guarda en Supabase. Se puede llamar de dos formas:
//   - desde la app, con el access token del socio en `Authorization: Bearer`;
//   - desde un cron externo, con la cabecera `x-cron-secret`.

import { configGeneral } from '@/lib/delivery/config';
import { sincronizar } from '@/lib/delivery/sync';
import { usuarioDesdePeticion } from '@/lib/delivery/supabase-servidor';
import { esFechaValida, Plataforma, PLATAFORMAS } from '@/lib/delivery/types';
import { timingSafeEqual } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// El reporte de Uber es asíncrono: pedirlo, esperar a que se genere y
// descargarlo puede tomar varios minutos.
export const maxDuration = 300;

/** Rango por defecto: los últimos 7 días completos, incluyendo hoy. */
function rangoPorDefecto(): { fechaInicio: string; fechaFin: string } {
  const hoy = new Date();
  const inicio = new Date(hoy);
  inicio.setUTCDate(inicio.getUTCDate() - 6);
  return {
    fechaInicio: inicio.toISOString().slice(0, 10),
    fechaFin: hoy.toISOString().slice(0, 10),
  };
}

function secretoValido(recibido: string, esperado: string): boolean {
  const a = Buffer.from(recibido, 'utf8');
  const b = Buffer.from(esperado, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function plataformasSolicitadas(valor: unknown): Plataforma[] | undefined {
  if (!Array.isArray(valor) || valor.length === 0) return undefined;
  const validas = valor.filter((item): item is Plataforma =>
    PLATAFORMAS.includes(item as Plataforma)
  );
  return validas.length > 0 ? validas : undefined;
}

export async function POST(request: Request) {
  const { cronSecret } = configGeneral();
  const secretoRecibido = request.headers.get('x-cron-secret');

  let disparadoPor: string;
  let socioIdSolicitante: string | undefined;

  if (secretoRecibido && cronSecret && secretoValido(secretoRecibido, cronSecret)) {
    disparadoPor = 'cron';
  } else {
    const usuario = await usuarioDesdePeticion(request);
    if (!usuario) {
      return Response.json({ error: 'No autorizado' }, { status: 401 });
    }
    disparadoPor = usuario.email ?? usuario.id;
    socioIdSolicitante = usuario.id;
  }

  let cuerpo: Record<string, unknown> = {};
  try {
    const texto = await request.text();
    if (texto) cuerpo = JSON.parse(texto) as Record<string, unknown>;
  } catch {
    return Response.json({ error: 'El cuerpo debe ser JSON válido.' }, { status: 400 });
  }

  const porDefecto = rangoPorDefecto();
  const fechaInicio = (cuerpo.fechaInicio as string) ?? porDefecto.fechaInicio;
  const fechaFin = (cuerpo.fechaFin as string) ?? porDefecto.fechaFin;

  if (!esFechaValida(fechaInicio) || !esFechaValida(fechaFin)) {
    return Response.json(
      { error: 'fechaInicio y fechaFin deben tener formato YYYY-MM-DD.' },
      { status: 400 }
    );
  }
  if (fechaInicio > fechaFin) {
    return Response.json(
      { error: 'fechaInicio no puede ser posterior a fechaFin.' },
      { status: 400 }
    );
  }

  try {
    const resultado = await sincronizar({
      fechaInicio,
      fechaFin,
      plataformas: plataformasSolicitadas(cuerpo.plataformas),
      // Si no hay socio de sistema, los ingresos quedan a nombre de quien
      // disparó la sincronización (no afecta el reparto de utilidades).
      socioId: socioIdSolicitante,
      disparadoPor,
    });

    // 207: al menos una plataforma falló pero otras sí sincronizaron.
    const huboFallo = resultado.resultados.some((item) => !item.ok);
    return Response.json(resultado, { status: huboFallo ? 207 : 200 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Error al sincronizar' },
      { status: 500 }
    );
  }
}
