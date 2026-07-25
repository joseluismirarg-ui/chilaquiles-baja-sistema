// Verificación y registro de webhooks de las plataformas.
//
// Los webhooks avisan de eventos (pedido creado, cancelado, entregado) casi en
// tiempo real, pero NO son la fuente de verdad contable: las plataformas
// ajustan cifras después del hecho (reembolsos, cancelaciones tardías,
// promociones liquidadas al cierre). Por eso aquí cada evento se guarda tal
// cual en `eventos_delivery` y el dinero definitivo lo fija la sincronización
// por rango contra la API de reportes.

import { createHmac, timingSafeEqual } from 'crypto';
import { supabaseAdmin } from './supabase-servidor';
import { Plataforma } from './types';

/** Compara en tiempo constante, tolerando mayúsculas/minúsculas en el hex. */
export function firmaValida(cuerpoCrudo: string, firma: string, secreto: string): boolean {
  if (!firma || !secreto) return false;

  const esperada = createHmac('sha256', secreto).update(cuerpoCrudo, 'utf8').digest('hex');
  const recibida = firma.trim().toLowerCase().replace(/^sha256=/, '');

  const a = Buffer.from(esperada, 'utf8');
  const b = Buffer.from(recibida, 'utf8');
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}

export type EventoDelivery = {
  plataforma: Plataforma;
  tipo: string;
  /** Id del evento en la plataforma, si viene. Evita procesar duplicados. */
  eventoExternoId?: string;
  pedidoExternoId?: string;
  payload: unknown;
};

/**
 * Guarda el evento. Devuelve false si ya se había registrado antes, para que la
 * ruta pueda responder 200 sin volver a procesarlo (las plataformas reintentan
 * el envío si no reciben 2xx a tiempo).
 */
export async function guardarEvento(evento: EventoDelivery): Promise<boolean> {
  const cliente = supabaseAdmin();

  if (evento.eventoExternoId) {
    const { data } = await cliente
      .from('eventos_delivery')
      .select('id')
      .eq('plataforma', evento.plataforma)
      .eq('evento_externo_id', evento.eventoExternoId)
      .maybeSingle();

    if (data) return false;
  }

  const { error } = await cliente.from('eventos_delivery').insert({
    plataforma: evento.plataforma,
    tipo: evento.tipo,
    evento_externo_id: evento.eventoExternoId ?? null,
    pedido_externo_id: evento.pedidoExternoId ?? null,
    payload: evento.payload,
  });

  if (error) {
    throw new Error(`No se pudo guardar el evento de webhook: ${error.message}`);
  }

  return true;
}

/** Busca una clave en un objeto anidado, sin importar a qué profundidad esté. */
export function buscarProfundo(objeto: unknown, claves: string[]): string | undefined {
  if (!objeto || typeof objeto !== 'object') return undefined;

  const registro = objeto as Record<string, unknown>;

  for (const clave of claves) {
    const valor = registro[clave];
    if (typeof valor === 'string' && valor) return valor;
    if (typeof valor === 'number') return String(valor);
  }

  for (const valor of Object.values(registro)) {
    if (valor && typeof valor === 'object') {
      const encontrado = buscarProfundo(valor, claves);
      if (encontrado) return encontrado;
    }
  }

  return undefined;
}
