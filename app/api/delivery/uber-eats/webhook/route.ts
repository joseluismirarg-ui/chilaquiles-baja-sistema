// POST /api/delivery/uber-eats/webhook
//
// Receptor de los webhooks de Uber Eats. Da de alta esta URL en el portal de
// desarrollador de Uber (Webhooks -> Endpoint URL).
//
// Uber firma cada envío con HMAC-SHA256 del cuerpo crudo usando el signing key
// del webhook (por defecto, el client secret de la app). El payload avisa del
// evento pero no trae el desglose de dinero: eso lo fija la sincronización
// contra la API de reportes, que es la que cuadra con el estado de cuenta.

import { configUberEats } from '@/lib/delivery/config';
import { buscarProfundo, firmaValida, guardarEvento } from '@/lib/delivery/webhooks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const config = configUberEats();
  if (!config) {
    return Response.json({ error: 'Uber Eats no está configurado' }, { status: 503 });
  }

  // El secreto del webhook puede ser distinto al client secret; si no se
  // configuró aparte, Uber firma con el client secret de la app.
  const secreto = config.webhookSecret ?? config.clientSecret;

  // Hay que leer el cuerpo crudo: la firma se calcula sobre los bytes exactos,
  // no sobre el JSON re-serializado.
  const cuerpoCrudo = await request.text();
  const firma =
    request.headers.get('x-uber-signature') ?? request.headers.get('x-envoy-signature') ?? '';

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
    await guardarEvento({
      plataforma: 'uber_eats',
      tipo: (registro.event_type as string) ?? 'desconocido',
      eventoExternoId: buscarProfundo(payload, ['event_id', 'webhook_id']),
      pedidoExternoId: buscarProfundo(payload, ['order_id', 'resource_id']),
      payload,
    });
  } catch (error) {
    // Devolver 500 hace que Uber reintente, que es lo correcto si no pudimos
    // persistir el evento.
    console.error('Error guardando webhook de Uber Eats:', error);
    return Response.json({ error: 'No se pudo procesar el evento' }, { status: 500 });
  }

  // Uber espera un 2xx rápido o reintenta el envío.
  return Response.json({ ok: true });
}
