// GET /api/delivery/cron
//
// Punto de entrada para la sincronización programada. Existe aparte de
// /api/delivery/sincronizar porque los cron jobs de Vercel sólo hacen GET y
// autentican con `Authorization: Bearer $CRON_SECRET`.
//
// Sincroniza los últimos 7 días: rango corto, y como los upserts son
// idempotentes, volver a pasar por días ya sincronizados sólo corrige cifras
// que la plataforma haya ajustado (cancelaciones tardías, reembolsos).

import { configGeneral } from '@/lib/delivery/config';
import { sincronizar } from '@/lib/delivery/sync';
import { timingSafeEqual } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const DIAS_A_SINCRONIZAR = 7;

function coincide(recibido: string, esperado: string): boolean {
  const a = Buffer.from(recibido, 'utf8');
  const b = Buffer.from(esperado, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function autorizado(request: Request, secreto: string): boolean {
  const cabecera = request.headers.get('authorization') ?? '';
  const bearer = cabecera.toLowerCase().startsWith('bearer ') ? cabecera.slice(7).trim() : '';
  if (bearer && coincide(bearer, secreto)) return true;

  const propio = request.headers.get('x-cron-secret');
  return Boolean(propio && coincide(propio, secreto));
}

export async function GET(request: Request) {
  // Vercel expone CRON_SECRET; si no está, se usa el nuestro.
  const secreto = process.env.CRON_SECRET?.trim() || configGeneral().cronSecret;

  if (!secreto) {
    return Response.json(
      { error: 'Configura DELIVERY_CRON_SECRET (o CRON_SECRET) para habilitar el cron.' },
      { status: 503 }
    );
  }

  if (!autorizado(request, secreto)) {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }

  const hoy = new Date();
  const inicio = new Date(hoy);
  inicio.setUTCDate(inicio.getUTCDate() - (DIAS_A_SINCRONIZAR - 1));

  try {
    const resultado = await sincronizar({
      fechaInicio: inicio.toISOString().slice(0, 10),
      fechaFin: hoy.toISOString().slice(0, 10),
      disparadoPor: 'cron',
    });

    const huboFallo = resultado.resultados.some((item) => !item.ok);
    return Response.json(resultado, { status: huboFallo ? 207 : 200 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Error al sincronizar' },
      { status: 500 }
    );
  }
}
