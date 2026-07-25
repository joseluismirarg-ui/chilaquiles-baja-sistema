// Conector de Didi Food (Open API de comercios).
//
// La documentación vive en https://developer.didi-food.com y el acceso se
// habilita por cuenta de comercio. La base de la API, las rutas y el algoritmo
// de firma se entregan en ese alta y cambian por región. Por eso aquí:
//   - la base y las rutas son configurables por variable de entorno,
//   - la firma vive aislada en `firmarParametros`, que es la única función que
//     hay que tocar si tu contrato usa otro esquema,
//   - la lectura de la respuesta es tolerante: acepta varios nombres de campo y
//     avisa (en vez de romper) cuando no reconoce algo.
//
// Ver INTEGRACION_DELIVERY.md para el detalle de qué pedirle a tu ejecutivo Didi.

import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { ConfigDidiFood, configDidiFood } from './config';
import { peticionJson } from './http';
import {
  aNumero,
  agregarPeriodo,
  ConectorDelivery,
  deCentavos,
  ErrorDelivery,
  PedidoDelivery,
  redondear,
  ResultadoConsulta,
} from './types';

const PLATAFORMA = 'didi_food' as const;

const RUTA_PEDIDOS = process.env.DIDI_FOOD_ORDERS_PATH ?? '/v1/order/list';

/** Didi devuelve importes en centavos salvo que se indique lo contrario. */
const IMPORTES_EN_CENTAVOS = process.env.DIDI_FOOD_AMOUNTS_IN_CENTS !== 'false';

const TAMANO_PAGINA = 100;
const MAX_PAGINAS = 200;

// ---------------------------------------------------------------------------
// Firma
// ---------------------------------------------------------------------------

/**
 * Esquema estándar de las Open API de Didi: se ordenan los parámetros por
 * nombre, se concatenan como `clave=valor&...`, se les pega el app_secret y se
 * aplica el digest acordado.
 *
 * Si tu contrato usa otro orden o separador, este es el único punto a cambiar.
 */
export function firmarParametros(
  parametros: Record<string, string>,
  appSecret: string,
  algoritmo: ConfigDidiFood['algoritmoFirma']
): string {
  const cadena = Object.keys(parametros)
    .sort()
    .map((clave) => `${clave}=${parametros[clave]}`)
    .join('&');

  if (algoritmo === 'md5') {
    return createHash('md5').update(`${cadena}${appSecret}`).digest('hex');
  }

  return createHmac('sha256', appSecret).update(cadena).digest('hex');
}

/** Compara firmas sin filtrar información por tiempo de respuesta. */
export function firmaCoincide(esperada: string, recibida: string): boolean {
  const a = Buffer.from(esperada, 'utf8');
  const b = Buffer.from(recibida, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function nonce(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

// ---------------------------------------------------------------------------
// Autenticación
// ---------------------------------------------------------------------------

type TokenCacheado = { token: string; expiraEn: number };

const cacheTokens = new Map<string, TokenCacheado>();
const MARGEN_EXPIRACION_MS = 60_000;

type RespuestaToken = {
  access_token?: string;
  expires_in?: number;
  data?: { access_token?: string; expires_in?: number };
};

export async function obtenerToken(config: ConfigDidiFood): Promise<string> {
  const cacheado = cacheTokens.get(config.appId);
  if (cacheado && cacheado.expiraEn > Date.now() + MARGEN_EXPIRACION_MS) {
    return cacheado.token;
  }

  const parametros: Record<string, string> = {
    app_id: config.appId,
    grant_type: 'client_credentials',
    timestamp: Math.floor(Date.now() / 1000).toString(),
    nonce: nonce(),
  };
  parametros.sign = firmarParametros(parametros, config.appSecret, config.algoritmoFirma);

  const respuesta = await peticionJson<RespuestaToken>({
    plataforma: PLATAFORMA,
    url: config.tokenUrl,
    metodo: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(parametros).toString(),
    descripcion: 'obtener el token de Didi Food',
  });

  const token = respuesta.access_token ?? respuesta.data?.access_token;
  const expiraEn = respuesta.expires_in ?? respuesta.data?.expires_in ?? 3600;

  if (!token) {
    throw new ErrorDelivery(
      PLATAFORMA,
      'Didi Food no devolvió access_token. Verifica app_id, app_secret y el algoritmo de firma (DIDI_FOOD_SIGN_ALGO).'
    );
  }

  cacheTokens.set(config.appId, {
    token,
    expiraEn: Date.now() + expiraEn * 1000,
  });

  return token;
}

export function invalidarToken(config: ConfigDidiFood) {
  cacheTokens.delete(config.appId);
}

// ---------------------------------------------------------------------------
// Consulta de pedidos
// ---------------------------------------------------------------------------

type RespuestaPedidos = {
  /** Didi usa 0 para éxito en la mayoría de sus APIs. */
  errno?: number;
  errmsg?: string;
  data?: {
    orders?: Record<string, unknown>[];
    list?: Record<string, unknown>[];
    total?: number;
    has_more?: boolean;
  };
  orders?: Record<string, unknown>[];
};

function primerValor(objeto: Record<string, unknown>, claves: string[]): unknown {
  for (const clave of claves) {
    const valor = objeto[clave];
    if (valor !== undefined && valor !== null && valor !== '') return valor;
  }
  return undefined;
}

function importe(objeto: Record<string, unknown>, claves: string[]): number {
  const valor = primerValor(objeto, claves);
  if (valor === undefined) return 0;
  return IMPORTES_EN_CENTAVOS ? deCentavos(valor) : redondear(aNumero(valor));
}

function texto(objeto: Record<string, unknown>, claves: string[]): string {
  const valor = primerValor(objeto, claves);
  return valor === undefined ? '' : String(valor);
}

/** Didi manda las fechas como epoch en segundos o como string ISO. */
function fechaPedido(objeto: Record<string, unknown>, respaldo: string): string {
  const valor = primerValor(objeto, [
    'order_time',
    'create_time',
    'finish_time',
    'order_date',
    'created_at',
  ]);

  if (valor === undefined) return respaldo;

  if (typeof valor === 'number' || /^\d+$/.test(String(valor))) {
    const epoch = Number(valor);
    // Menos de 10^12 significa segundos, no milisegundos.
    const ms = epoch < 1e12 ? epoch * 1000 : epoch;
    const fecha = new Date(ms);
    return Number.isNaN(fecha.getTime()) ? respaldo : fecha.toISOString().slice(0, 10);
  }

  const fecha = new Date(String(valor));
  return Number.isNaN(fecha.getTime()) ? respaldo : fecha.toISOString().slice(0, 10);
}

function estadoPedido(objeto: Record<string, unknown>): PedidoDelivery['estado'] {
  const bruto = texto(objeto, ['order_status', 'status', 'state']).toLowerCase();
  if (!bruto) return 'desconocido';
  if (bruto.includes('cancel') || bruto === '5' || bruto === '-1') return 'cancelado';
  if (bruto.includes('finish') || bruto.includes('complet') || bruto.includes('deliver')) {
    return 'completado';
  }
  // Didi usa códigos numéricos por estado; 4 suele ser "finalizado".
  if (bruto === '4') return 'completado';
  return 'desconocido';
}

export function normalizarPedidoDidi(
  crudo: Record<string, unknown>,
  fechaRespaldo: string,
  monedaPorDefecto: string
): PedidoDelivery {
  const ingresosBrutos = Math.abs(
    importe(crudo, ['product_amount', 'goods_amount', 'subtotal', 'total_amount', 'order_amount'])
  );
  const comisiones = Math.abs(
    importe(crudo, ['commission_amount', 'commission', 'service_fee', 'platform_fee'])
  );
  const promociones = Math.abs(
    importe(crudo, ['shop_discount_amount', 'merchant_discount', 'discount_amount', 'promotion_amount'])
  );
  const impuestos = Math.abs(importe(crudo, ['tax_amount', 'tax', 'vat_amount']));
  const netoReportado = importe(crudo, [
    'settle_amount',
    'settlement_amount',
    'shop_income',
    'merchant_income',
    'net_amount',
  ]);

  return {
    pedidoExternoId: texto(crudo, ['order_id', 'order_no', 'id', 'trade_no']),
    plataforma: PLATAFORMA,
    tiendaExternaId: texto(crudo, ['shop_id', 'store_id', 'poi_id']) || undefined,
    fecha: fechaPedido(crudo, fechaRespaldo),
    estado: estadoPedido(crudo),
    ingresosBrutos,
    comisiones,
    promociones,
    impuestos,
    dineroNeto: redondear(
      netoReportado !== 0 ? netoReportado : ingresosBrutos - comisiones - promociones
    ),
    moneda: texto(crudo, ['currency', 'currency_code']) || monedaPorDefecto,
  };
}

async function pedidosDeTienda(
  config: ConfigDidiFood,
  token: string,
  storeId: string,
  fechaInicio: string,
  fechaFin: string,
  moneda: string,
  advertencias: string[]
): Promise<PedidoDelivery[]> {
  const pedidos: PedidoDelivery[] = [];

  for (let pagina = 1; pagina <= MAX_PAGINAS; pagina++) {
    const parametros: Record<string, string> = {
      app_id: config.appId,
      shop_id: storeId,
      start_date: fechaInicio,
      end_date: fechaFin,
      page: String(pagina),
      page_size: String(TAMANO_PAGINA),
      timestamp: Math.floor(Date.now() / 1000).toString(),
      nonce: nonce(),
    };
    parametros.sign = firmarParametros(parametros, config.appSecret, config.algoritmoFirma);

    const url = `${config.apiUrl}${RUTA_PEDIDOS}?${new URLSearchParams(parametros).toString()}`;

    const respuesta = await peticionJson<RespuestaPedidos>({
      plataforma: PLATAFORMA,
      url,
      headers: { Authorization: `Bearer ${token}` },
      descripcion: `consultar pedidos de Didi Food (sucursal ${storeId})`,
    });

    if (respuesta.errno !== undefined && respuesta.errno !== 0) {
      throw new ErrorDelivery(
        PLATAFORMA,
        `Didi Food rechazó la consulta (errno ${respuesta.errno}): ${
          respuesta.errmsg ?? 'sin detalle'
        }`
      );
    }

    const lote = respuesta.data?.orders ?? respuesta.data?.list ?? respuesta.orders ?? [];
    if (lote.length === 0) break;

    for (const crudo of lote) {
      const pedido = normalizarPedidoDidi(crudo, fechaInicio, moneda);
      if (!pedido.pedidoExternoId) {
        advertencias.push(
          `Se omitió un pedido de Didi Food (sucursal ${storeId}) porque la respuesta no trae id de pedido.`
        );
        continue;
      }
      pedidos.push(pedido);
    }

    const hayMas = respuesta.data?.has_more;
    if (hayMas === false || lote.length < TAMANO_PAGINA) break;

    if (pagina === MAX_PAGINAS) {
      advertencias.push(
        `Se alcanzó el límite de ${MAX_PAGINAS} páginas en Didi Food (sucursal ${storeId}). Reduce el rango de fechas.`
      );
    }
  }

  return pedidos;
}

// ---------------------------------------------------------------------------
// Conector
// ---------------------------------------------------------------------------

export function conectorDidiFood(moneda = 'MXN'): ConectorDelivery | null {
  const config = configDidiFood();
  if (!config) return null;

  return {
    plataforma: PLATAFORMA,

    async probarConexion() {
      await obtenerToken(config);
    },

    async obtenerVentas(fechaInicio: string, fechaFin: string): Promise<ResultadoConsulta> {
      const token = await obtenerToken(config);
      const advertencias: string[] = [];
      const pedidos: PedidoDelivery[] = [];

      for (const storeId of config.storeIds) {
        pedidos.push(
          ...(await pedidosDeTienda(
            config,
            token,
            storeId,
            fechaInicio,
            fechaFin,
            moneda,
            advertencias
          ))
        );
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
