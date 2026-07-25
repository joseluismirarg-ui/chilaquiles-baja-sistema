// POST /api/delivery/didi-food/webhook
//
// Receptor de las notificaciones de Didi Food. Registra esta URL como
// "callback" en el alta de tu comercio.
//
// A diferencia de Uber, las notificaciones de Didi suelen traer el desglose del
// pedido, así que cuando el payload incluye importes se guarda el pedido y se
// recalcula el ingreso de ese día. Si sólo trae el aviso, queda registrado el
// evento y el dinero lo fija la sincronización por rango.

import { configDidiFood, configGeneral } from '@/lib/delivery/config';
import { normalizarPedidoDidi } from '@/lib/delivery/didi-food';
import { registrarPedidoDeWebhook } from '@/lib/delivery/sync';
import { buscarProfundo, firmaValida, guardarEvento } from '@/lib/delivery/webhooks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Didi anida el pedido de formas distintas según el tipo de notificación. */
function extraerPedido(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== 'object') return null;

  const registro = payload as Record<string, unknown>;

  for (const clave of ['order', 'order_info', 'data']) {
    const valor = registro[clave];
    if (valor && typeof valor === 'object' && !Array.isArray(valor)) {
      const anidado = valor as Record<string, unknown>;
      // `data` a veces envuelve otro nivel antes del pedido.
      if (anidado.order && typeof anidado.order === 'object') {
        return anidado.order as Record<string, unknown>;
      }
      return anidado;
    }
  }

  // Algunos eventos mandan el pedido en la raíz.
  return registro.order_id || registro.order_no ? registro : null;
}

export async function POST(request: Request) {
  const config = configDidiFood();
  if (!config) {
    return Response.json({ error: 'Didi Food no está configurado' }, { status: 503 });
  }

  const secreto = config.webhookSecret ?? config.appSecret;

  const cuerpoCrudo = await request.text();
  const firma =
    request.headers.get('x-didi-sign') ??
    request.headers.get('sign') ??
    request.headers.get('x-signature') ??
    '';

  if (!firmaValida(cuerpoCrudo, firma, secreto)) {
    return Response.json({ error: 'Firma inválida' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(cuerpoCrudo);
  } catch {
    return Response.json({ error: 'Cuerpo no es JSON válido' }, { status: 400 });
  }

  const registro = payload as Record<string, unknown>;

  try {
    const esNuevo = await guardarEvento({
      plataforma: 'didi_food',
      tipo: String(registro.event_type ?? registro.type ?? registro.msg_type ?? 'desconocido'),
      eventoExternoId: buscarProfundo(payload, ['event_id', 'msg_id', 'notify_id']),
      pedidoExternoId: buscarProfundo(payload, ['order_id', 'order_no']),
      payload,
    });

    // Didi reintenta si no recibe 2xx: un evento repetido no debe re-procesarse.
    if (!esNuevo) return Response.json({ ok: true, duplicado: true });

    const crudo = extraerPedido(payload);
    if (crudo) {
      const { moneda } = configGeneral();
      const hoy = new Date().toISOString().slice(0, 10);
      const pedido = normalizarPedidoDidi(crudo, hoy, moneda);

      // Sólo vale la pena guardarlo si trae id y algún importe; si no, el
      // evento ya quedó registrado y el monto llegará por sincronización.
      const traeImportes = pedido.ingresosBrutos !== 0 || pedido.dineroNeto !== 0;
      if (pedido.pedidoExternoId && traeImportes) {
        await registrarPedidoDeWebhook(pedido);
      }
    }
  } catch (error) {
    console.error('Error procesando webhook de Didi Food:', error);
    return Response.json({ error: 'No se pudo procesar el evento' }, { status: 500 });
  }

  return Response.json({ ok: true });
}
