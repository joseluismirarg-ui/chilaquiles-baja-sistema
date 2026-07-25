// Conector de Uber Eats (Marketplace API).
//
// Flujo, tal como lo expone Uber:
//   1. OAuth 2.0 `client_credentials` -> access token (se cachea en memoria).
//   2. Se pide un reporte "Payment Details" para el rango de fechas. La API es
//      asíncrona: responde con un id de trabajo.
//   3. Se consulta ese id hasta que el reporte queda listo y da una URL de
//      descarga con un CSV.
//   4. El CSV se normaliza a pedidos + resumen del periodo.
//
// Las rutas viven en constantes al principio del archivo y se pueden sobreescribir
// con variables de entorno, porque Uber versiona estos endpoints por partner:
// confirma las tuyas en el portal de desarrollador antes de ir a producción.

import { parse } from 'csv-parse/sync';
import { ConfigUberEats, configUberEats } from './config';
import { peticion, peticionJson } from './http';
import {
  aNumero,
  agregarPeriodo,
  ConectorDelivery,
  ErrorDelivery,
  PedidoDelivery,
  redondear,
  ResultadoConsulta,
} from './types';

const PLATAFORMA = 'uber_eats' as const;

const RUTA_REPORTE = process.env.UBER_EATS_REPORT_PATH ?? '/v1/eats/report';
const TIPO_REPORTE = process.env.UBER_EATS_REPORT_TYPE ?? 'PAYMENT_DETAILS_REPORT';

/** Uber acepta hasta 50 sucursales por petición de reporte. */
const MAX_TIENDAS_POR_PETICION = 50;

/** El reporte tarda; se consulta su estado con esta cadencia. */
const ESPERA_ENTRE_CONSULTAS_MS = 5_000;
const MAX_CONSULTAS = 60;

// ---------------------------------------------------------------------------
// Autenticación
// ---------------------------------------------------------------------------

type RespuestaToken = {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
};

type TokenCacheado = { token: string; expiraEn: number };

const cacheTokens = new Map<string, TokenCacheado>();

/** Se renueva 60s antes de que expire para no perder una petición en vuelo. */
const MARGEN_EXPIRACION_MS = 60_000;

export async function obtenerToken(config: ConfigUberEats): Promise<string> {
  const llave = `${config.clientId}:${config.scope}`;
  const cacheado = cacheTokens.get(llave);

  if (cacheado && cacheado.expiraEn > Date.now() + MARGEN_EXPIRACION_MS) {
    return cacheado.token;
  }

  const cuerpo = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'client_credentials',
    scope: config.scope,
  });

  const respuesta = await peticionJson<RespuestaToken>({
    plataforma: PLATAFORMA,
    url: config.tokenUrl,
    metodo: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: cuerpo.toString(),
    descripcion: 'obtener el token de Uber Eats',
  });

  if (!respuesta.access_token) {
    throw new ErrorDelivery(
      PLATAFORMA,
      'Uber Eats no devolvió access_token. Revisa client_id, client_secret y que los scopes estén aprobados para tu app.'
    );
  }

  cacheTokens.set(llave, {
    token: respuesta.access_token,
    // Uber suele dar 30 días; si no manda expires_in asumimos 1 hora.
    expiraEn: Date.now() + (respuesta.expires_in ?? 3600) * 1000,
  });

  return respuesta.access_token;
}

/** Limpia el token cacheado (útil tras un 401 o al rotar credenciales). */
export function invalidarToken(config: ConfigUberEats) {
  cacheTokens.delete(`${config.clientId}:${config.scope}`);
}

// ---------------------------------------------------------------------------
// Reportes
// ---------------------------------------------------------------------------

type RespuestaTrabajo = Record<string, unknown>;

/** Uber ha usado varios nombres para el id del trabajo según la versión. */
function extraerIdTrabajo(respuesta: RespuestaTrabajo): string | null {
  for (const llave of ['workflow_id', 'report_id', 'job_id', 'id', 'request_id']) {
    const valor = respuesta[llave];
    if (typeof valor === 'string' && valor) return valor;
  }
  return null;
}

function extraerEstado(respuesta: RespuestaTrabajo): string {
  for (const llave of ['status', 'report_status', 'state']) {
    const valor = respuesta[llave];
    if (typeof valor === 'string' && valor) return valor.toUpperCase();
  }
  return 'UNKNOWN';
}

function extraerUrlDescarga(respuesta: RespuestaTrabajo): string | null {
  for (const llave of ['download_url', 'report_url', 'url', 'file_url']) {
    const valor = respuesta[llave];
    if (typeof valor === 'string' && valor) return valor;
  }

  // Algunas versiones anidan la URL dentro de metadata.
  for (const llave of ['report_metadata', 'metadata', 'data']) {
    const anidado = respuesta[llave];
    if (anidado && typeof anidado === 'object') {
      const url = extraerUrlDescarga(anidado as RespuestaTrabajo);
      if (url) return url;
    }
  }

  return null;
}

async function solicitarReporte(
  config: ConfigUberEats,
  token: string,
  storeIds: string[],
  fechaInicio: string,
  fechaFin: string
): Promise<string> {
  const respuesta = await peticionJson<RespuestaTrabajo>({
    plataforma: PLATAFORMA,
    url: `${config.apiUrl}${RUTA_REPORTE}`,
    metodo: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      report_type: TIPO_REPORTE,
      start_date: fechaInicio,
      end_date: fechaFin,
      store_uuids: storeIds,
    }),
    descripcion: 'solicitar el reporte de Uber Eats',
  });

  const idTrabajo = extraerIdTrabajo(respuesta);
  if (!idTrabajo) {
    throw new ErrorDelivery(
      PLATAFORMA,
      'Uber Eats aceptó la solicitud pero no devolvió un id de reporte identificable.'
    );
  }

  return idTrabajo;
}

async function esperarReporte(
  config: ConfigUberEats,
  token: string,
  idTrabajo: string
): Promise<string> {
  for (let intento = 0; intento < MAX_CONSULTAS; intento++) {
    const respuesta = await peticionJson<RespuestaTrabajo>({
      plataforma: PLATAFORMA,
      url: `${config.apiUrl}${RUTA_REPORTE}/${encodeURIComponent(idTrabajo)}`,
      headers: { Authorization: `Bearer ${token}` },
      descripcion: 'consultar el estado del reporte de Uber Eats',
    });

    const estado = extraerEstado(respuesta);

    if (['SUCCEEDED', 'SUCCESS', 'COMPLETED', 'READY', 'DONE'].includes(estado)) {
      const url = extraerUrlDescarga(respuesta);
      if (!url) {
        throw new ErrorDelivery(
          PLATAFORMA,
          'El reporte de Uber Eats terminó pero no trae URL de descarga.'
        );
      }
      return url;
    }

    if (['FAILED', 'ERROR', 'CANCELLED', 'EXPIRED'].includes(estado)) {
      throw new ErrorDelivery(
        PLATAFORMA,
        `Uber Eats no pudo generar el reporte (estado: ${estado}).`
      );
    }

    await new Promise((resolve) => setTimeout(resolve, ESPERA_ENTRE_CONSULTAS_MS));
  }

  throw new ErrorDelivery(
    PLATAFORMA,
    `El reporte de Uber Eats sigue procesando después de ${
      (MAX_CONSULTAS * ESPERA_ENTRE_CONSULTAS_MS) / 1000
    }s. Intenta de nuevo en unos minutos.`,
    { reintentable: true }
  );
}

async function descargarCsv(urlDescarga: string): Promise<string> {
  // La URL de descarga viene pre-firmada: mandarle el bearer de Uber puede
  // hacer que el almacenamiento la rechace, así que va sin Authorization.
  const respuesta = await peticion({
    plataforma: PLATAFORMA,
    url: urlDescarga,
    descripcion: 'descargar el reporte de Uber Eats',
    timeoutMs: 60_000,
  });

  return respuesta.text();
}

// ---------------------------------------------------------------------------
// Normalización del CSV
// ---------------------------------------------------------------------------

function normalizarNombre(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Busca una columna por coincidencia parcial sobre el nombre normalizado.
 * El CSV de Uber cambia de encabezados entre países e idiomas, así que se
 * aceptan varios alias por campo.
 */
function valorColumna(
  fila: Record<string, string>,
  indice: Map<string, string>,
  alias: string[]
): number {
  for (const nombre of alias) {
    const columna = indice.get(normalizarNombre(nombre));
    if (columna !== undefined) {
      const valor = fila[columna];
      if (valor !== undefined && valor !== '') return aNumero(valor);
    }
  }
  return 0;
}

function textoColumna(
  fila: Record<string, string>,
  indice: Map<string, string>,
  alias: string[]
): string {
  for (const nombre of alias) {
    const columna = indice.get(normalizarNombre(nombre));
    if (columna !== undefined) {
      const valor = fila[columna];
      if (valor) return valor.trim();
    }
  }
  return '';
}

const ALIAS_ID_PEDIDO = ['Order ID', 'Order UUID', 'ID de pedido', 'Workflow UUID'];
const ALIAS_TIENDA = ['Store UUID', 'Store ID', 'ID de tienda', 'Restaurant ID'];
const ALIAS_FECHA = ['Order Date', 'Date', 'Fecha', 'Order Date UTC', 'Payout Date'];
const ALIAS_ESTADO = ['Order Status', 'Status', 'Estado'];
const ALIAS_BRUTO = ['Food Sales', 'Sales', 'Ventas', 'Subtotal', 'Gross Sales', 'Item Sales'];
const ALIAS_COMISION = [
  'Marketplace Fee',
  'Service Fee',
  'Uber Service Fee',
  'Comision',
  'Tarifa de servicio',
  'Tasas de servicio',
];
const ALIAS_PROMOCION = [
  'Promotions on Items',
  'Promotions',
  'Promociones',
  'Marketing Spend',
  'Gastos por servicios de marketing',
];
const ALIAS_IMPUESTO = ['Tax', 'Taxes', 'Impuestos', 'IVA'];
const ALIAS_NETO = ['Total Payout', 'Payout', 'Net Payout', 'Total neto', 'Pago total'];
const ALIAS_MONEDA = ['Currency', 'Currency Code', 'Moneda'];

function estadoPedido(texto: string): PedidoDelivery['estado'] {
  const normalizado = normalizarNombre(texto);
  if (!normalizado) return 'desconocido';
  if (normalizado.includes('cancel')) return 'cancelado';
  if (
    normalizado.includes('complet') ||
    normalizado.includes('deliver') ||
    normalizado.includes('entregad') ||
    normalizado.includes('success')
  ) {
    return 'completado';
  }
  return 'desconocido';
}

function fechaDePedido(texto: string, respaldo: string): string {
  if (!texto) return respaldo;

  // Formatos ya ISO (2026-07-24 o 2026-07-24T18:30:00Z).
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  // Formatos tipo MM/DD/YYYY que usa el CSV en inglés.
  const barras = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (barras) {
    const [, mes, dia, anio] = barras;
    return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
  }

  const fecha = new Date(texto);
  return Number.isNaN(fecha.getTime()) ? respaldo : fecha.toISOString().slice(0, 10);
}

export function normalizarCsvUber(
  csv: string,
  fechaInicio: string,
  monedaPorDefecto: string
): { pedidos: PedidoDelivery[]; advertencias: string[] } {
  const filas = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    bom: true,
  }) as Record<string, string>[];

  const advertencias: string[] = [];

  if (filas.length === 0) {
    return { pedidos: [], advertencias: ['Uber Eats devolvió un reporte vacío.'] };
  }

  const indice = new Map<string, string>();
  for (const columna of Object.keys(filas[0])) {
    indice.set(normalizarNombre(columna), columna);
  }

  const sinColumnaBruto = ALIAS_BRUTO.every(
    (alias) => !indice.has(normalizarNombre(alias))
  );
  if (sinColumnaBruto) {
    advertencias.push(
      `No se reconoció la columna de ventas en el reporte de Uber Eats. Columnas recibidas: ${Object.keys(
        filas[0]
      )
        .slice(0, 12)
        .join(', ')}`
    );
  }

  const pedidos = filas.map((fila, posicion) => {
    const bruto = Math.abs(valorColumna(fila, indice, ALIAS_BRUTO));
    const comisiones = Math.abs(valorColumna(fila, indice, ALIAS_COMISION));
    const promociones = Math.abs(valorColumna(fila, indice, ALIAS_PROMOCION));
    const impuestos = Math.abs(valorColumna(fila, indice, ALIAS_IMPUESTO));
    const netoReportado = valorColumna(fila, indice, ALIAS_NETO);

    const idPedido =
      textoColumna(fila, indice, ALIAS_ID_PEDIDO) || `uber-${fechaInicio}-fila-${posicion}`;

    return {
      pedidoExternoId: idPedido,
      plataforma: PLATAFORMA,
      tiendaExternaId: textoColumna(fila, indice, ALIAS_TIENDA) || undefined,
      fecha: fechaDePedido(textoColumna(fila, indice, ALIAS_FECHA), fechaInicio),
      estado: estadoPedido(textoColumna(fila, indice, ALIAS_ESTADO)),
      ingresosBrutos: redondear(bruto),
      comisiones: redondear(comisiones),
      promociones: redondear(promociones),
      impuestos: redondear(impuestos),
      // Si el CSV trae el payout se respeta; si no, se deriva.
      dineroNeto: redondear(
        netoReportado !== 0 ? netoReportado : bruto - comisiones - promociones
      ),
      moneda: textoColumna(fila, indice, ALIAS_MONEDA) || monedaPorDefecto,
    } satisfies PedidoDelivery;
  });

  return { pedidos, advertencias };
}

// ---------------------------------------------------------------------------
// Conector
// ---------------------------------------------------------------------------

function trocear<T>(elementos: T[], tamano: number): T[][] {
  const grupos: T[][] = [];
  for (let i = 0; i < elementos.length; i += tamano) {
    grupos.push(elementos.slice(i, i + tamano));
  }
  return grupos;
}

export function conectorUberEats(moneda = 'MXN'): ConectorDelivery | null {
  const config = configUberEats();
  if (!config) return null;

  return {
    plataforma: PLATAFORMA,

    async probarConexion() {
      // Pedir el token es la llamada más barata que valida credenciales y scopes.
      await obtenerToken(config);
    },

    async obtenerVentas(fechaInicio: string, fechaFin: string): Promise<ResultadoConsulta> {
      const token = await obtenerToken(config);
      const pedidos: PedidoDelivery[] = [];
      const advertencias: string[] = [];

      for (const grupo of trocear(config.storeIds, MAX_TIENDAS_POR_PETICION)) {
        const idTrabajo = await solicitarReporte(config, token, grupo, fechaInicio, fechaFin);
        const urlDescarga = await esperarReporte(config, token, idTrabajo);
        const csv = await descargarCsv(urlDescarga);

        const resultado = normalizarCsvUber(csv, fechaInicio, moneda);
        pedidos.push(...resultado.pedidos);
        advertencias.push(...resultado.advertencias);
      }

      return {
        plataforma: PLATAFORMA,
        periodo: agregarPeriodo(PLATAFORMA, fechaInicio, fechaFin, pedidos, moneda),
        pedidos,
        advertencias,
      };
    },
  };
}
