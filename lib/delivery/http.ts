// Cliente HTTP compartido por los conectores: timeout, reintentos con espera
// exponencial y errores que ya traen el contexto de la plataforma.

import { ErrorDelivery, Plataforma } from './types';

const TIMEOUT_MS = 30_000;
const REINTENTOS = 3;

type OpcionesPeticion = {
  plataforma: Plataforma;
  url: string;
  metodo?: 'GET' | 'POST' | 'PUT';
  headers?: Record<string, string>;
  body?: string;
  /** Descripción corta para los mensajes de error, p. ej. "obtener token". */
  descripcion: string;
  timeoutMs?: number;
  reintentos?: number;
};

function esperar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 429 y 5xx son transitorios; el resto son errores de configuración nuestros. */
function esReintentable(estado: number): boolean {
  return estado === 408 || estado === 429 || estado >= 500;
}

/**
 * Respeta `Retry-After` cuando la plataforma lo manda (Uber limita a 60 req/min
 * en la API de reportes), y si no cae a espera exponencial.
 */
function calcularEspera(respuesta: Response | null, intento: number): number {
  const cabecera = respuesta?.headers.get('retry-after');
  if (cabecera) {
    const segundos = Number(cabecera);
    if (Number.isFinite(segundos) && segundos > 0) {
      return Math.min(segundos * 1000, 30_000);
    }
  }
  return Math.min(1000 * 2 ** intento, 8000);
}

async function leerCuerpo(respuesta: Response): Promise<string> {
  try {
    return (await respuesta.text()).slice(0, 500);
  } catch {
    return '';
  }
}

/** Hace la petición y devuelve la respuesta cruda (útil para descargar CSV). */
export async function peticion(opciones: OpcionesPeticion): Promise<Response> {
  const {
    plataforma,
    url,
    metodo = 'GET',
    headers = {},
    body,
    descripcion,
    timeoutMs = TIMEOUT_MS,
    reintentos = REINTENTOS,
  } = opciones;

  let ultimoError: ErrorDelivery | null = null;

  for (let intento = 0; intento <= reintentos; intento++) {
    if (intento > 0) await esperar(calcularEspera(null, intento - 1));

    let respuesta: Response;
    try {
      respuesta = await fetch(url, {
        method: metodo,
        headers,
        body,
        signal: AbortSignal.timeout(timeoutMs),
        // Estas respuestas son datos de venta en vivo: nunca deben cachearse.
        cache: 'no-store',
      });
    } catch (error) {
      const esTimeout = error instanceof Error && error.name === 'TimeoutError';
      ultimoError = new ErrorDelivery(
        plataforma,
        esTimeout
          ? `Timeout al ${descripcion} (${timeoutMs / 1000}s)`
          : `Error de red al ${descripcion}`,
        { reintentable: true, causa: error }
      );
      continue;
    }

    if (respuesta.ok) return respuesta;

    const detalle = await leerCuerpo(respuesta);
    const reintentable = esReintentable(respuesta.status);
    ultimoError = new ErrorDelivery(
      plataforma,
      `Error ${respuesta.status} al ${descripcion}${detalle ? `: ${detalle}` : ''}`,
      { estadoHttp: respuesta.status, reintentable }
    );

    if (!reintentable) throw ultimoError;
    if (intento < reintentos) await esperar(calcularEspera(respuesta, intento));
  }

  throw (
    ultimoError ??
    new ErrorDelivery(plataforma, `No se pudo ${descripcion}`, { reintentable: true })
  );
}

/** Igual que `peticion`, pero parseando JSON. */
export async function peticionJson<T>(opciones: OpcionesPeticion): Promise<T> {
  const respuesta = await peticion(opciones);
  const texto = await respuesta.text();

  if (!texto) return {} as T;

  try {
    return JSON.parse(texto) as T;
  } catch (error) {
    throw new ErrorDelivery(
      opciones.plataforma,
      `Respuesta no válida al ${opciones.descripcion}: se esperaba JSON`,
      { causa: error }
    );
  }
}
