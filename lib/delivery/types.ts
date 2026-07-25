// Tipos compartidos por los conectores de plataformas de delivery.
// Todo conector (Uber Eats, Didi Food) normaliza su respuesta a estas formas,
// para que el resto del sistema no dependa del formato de cada plataforma.

export type Plataforma = 'uber_eats' | 'didi_food';

export const PLATAFORMAS: Plataforma[] = ['uber_eats', 'didi_food'];

export const NOMBRE_PLATAFORMA: Record<Plataforma, string> = {
  uber_eats: 'Uber Eats',
  didi_food: 'Didi Food',
};

/** Un pedido individual ya normalizado, sin importar de qué plataforma viene. */
export type PedidoDelivery = {
  /** ID del pedido en la plataforma. Sirve como llave de idempotencia. */
  pedidoExternoId: string;
  plataforma: Plataforma;
  /** ID de la sucursal en la plataforma, si la respuesta lo trae. */
  tiendaExternaId?: string;
  /** Fecha del pedido en formato YYYY-MM-DD (zona horaria del negocio). */
  fecha: string;
  /** Momento exacto del pedido en ISO 8601, si está disponible. */
  fechaHora?: string;
  estado: 'completado' | 'cancelado' | 'desconocido';
  /** Lo que pagó el cliente por los productos, antes de comisiones. */
  ingresosBrutos: number;
  /** Comisión de la plataforma (siempre positiva). */
  comisiones: number;
  /** Promociones/descuentos absorbidos por la tienda (siempre positivo). */
  promociones: number;
  /** Impuestos cobrados en el pedido. */
  impuestos: number;
  /** Depósito real esperado por este pedido. */
  dineroNeto: number;
  moneda: string;
};

/** Resumen agregado de un periodo para una plataforma. */
export type VentasPeriodo = {
  plataforma: Plataforma;
  /** YYYY-MM-DD inclusivo. */
  fechaInicio: string;
  /** YYYY-MM-DD inclusivo. */
  fechaFin: string;
  ingresosBrutos: number;
  comisiones: number;
  promociones: number;
  impuestos: number;
  dineroNeto: number;
  moneda: string;
  totalPedidos: number;
  pedidosCancelados: number;
  /** Comisión efectiva como porcentaje de los ingresos brutos. */
  comisionPorcentaje: number;
};

/** Lo que devuelve un conector al consultar un rango de fechas. */
export type ResultadoConsulta = {
  plataforma: Plataforma;
  periodo: VentasPeriodo;
  pedidos: PedidoDelivery[];
  /** Avisos no fatales (p. ej. una sucursal sin datos) para mostrar en la UI. */
  advertencias: string[];
};

/** Contrato que cumple cada plataforma. */
export type ConectorDelivery = {
  plataforma: Plataforma;
  /** Verifica credenciales haciendo la mínima llamada posible. */
  probarConexion(): Promise<void>;
  /** Trae los pedidos de un rango de fechas (ambos extremos inclusivos). */
  obtenerVentas(fechaInicio: string, fechaFin: string): Promise<ResultadoConsulta>;
};

/** Error con contexto suficiente para mostrarle algo útil al usuario. */
export class ErrorDelivery extends Error {
  readonly plataforma: Plataforma;
  readonly estadoHttp?: number;
  /** true cuando reintentar más tarde tiene sentido (5xx, límite de tasa, red). */
  readonly reintentable: boolean;

  constructor(
    plataforma: Plataforma,
    mensaje: string,
    opciones: { estadoHttp?: number; reintentable?: boolean; causa?: unknown } = {}
  ) {
    super(mensaje, { cause: opciones.causa });
    this.name = 'ErrorDelivery';
    this.plataforma = plataforma;
    this.estadoHttp = opciones.estadoHttp;
    this.reintentable = opciones.reintentable ?? false;
  }
}

/** Suma pedidos normalizados en un resumen de periodo. */
export function agregarPeriodo(
  plataforma: Plataforma,
  fechaInicio: string,
  fechaFin: string,
  pedidos: PedidoDelivery[],
  monedaPorDefecto = 'MXN'
): VentasPeriodo {
  // Los pedidos cancelados no generan ingreso; se cuentan aparte para que el
  // usuario pueda cuadrar el total de pedidos contra el panel de la plataforma.
  const validos = pedidos.filter((p) => p.estado !== 'cancelado');

  const suma = (obtener: (p: PedidoDelivery) => number) =>
    validos.reduce((total, pedido) => total + obtener(pedido), 0);

  const ingresosBrutos = redondear(suma((p) => p.ingresosBrutos));
  const comisiones = redondear(suma((p) => p.comisiones));

  return {
    plataforma,
    fechaInicio,
    fechaFin,
    ingresosBrutos,
    comisiones,
    promociones: redondear(suma((p) => p.promociones)),
    impuestos: redondear(suma((p) => p.impuestos)),
    dineroNeto: redondear(suma((p) => p.dineroNeto)),
    moneda: validos[0]?.moneda || pedidos[0]?.moneda || monedaPorDefecto,
    totalPedidos: validos.length,
    pedidosCancelados: pedidos.length - validos.length,
    comisionPorcentaje:
      ingresosBrutos > 0 ? redondear((comisiones / ingresosBrutos) * 100) : 0,
  };
}

export function redondear(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

/** Convierte a número tolerando strings con signo, comas y símbolo de moneda. */
export function aNumero(valor: unknown): number {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0;
  if (typeof valor !== 'string') return 0;
  const limpio = valor.replace(/[^0-9.-]/g, '');
  const numero = parseFloat(limpio);
  return Number.isFinite(numero) ? numero : 0;
}

/**
 * Varias APIs devuelven dinero en centavos (enteros). Convierte a unidades
 * cuando la plataforma lo declara así.
 */
export function deCentavos(valor: unknown): number {
  return redondear(aNumero(valor) / 100);
}

/** YYYY-MM-DD a partir de un Date o de un ISO string. */
export function aFechaISO(valor: Date | string): string {
  const fecha = typeof valor === 'string' ? new Date(valor) : valor;
  if (Number.isNaN(fecha.getTime())) {
    throw new Error(`Fecha inválida: ${String(valor)}`);
  }
  return fecha.toISOString().slice(0, 10);
}

/** Valida que la cadena sea una fecha YYYY-MM-DD real. */
export function esFechaValida(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && aFechaISO(fecha) === valor;
}
