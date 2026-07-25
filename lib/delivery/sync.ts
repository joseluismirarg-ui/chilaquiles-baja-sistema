// Orquestador de sincronización: consulta las plataformas y guarda el
// resultado en Supabase.
//
// Todo se escribe con upsert sobre llaves naturales, así que correr la misma
// sincronización dos veces no duplica ingresos: sobreescribe los mismos
// renglones. Eso permite re-sincronizar un rango cuando la plataforma ajusta
// cifras (cancelaciones tardías, reembolsos) sin descuadrar la contabilidad.

import { configGeneral } from './config';
import { conectorDidiFood } from './didi-food';
import { supabaseAdmin } from './supabase-servidor';
import { conectorUberEats } from './uber-eats';
import {
  ConectorDelivery,
  ErrorDelivery,
  esFechaValida,
  NOMBRE_PLATAFORMA,
  PedidoDelivery,
  Plataforma,
  PLATAFORMAS,
  redondear,
  VentasPeriodo,
} from './types';

const TAMANO_LOTE = 500;

export type ResultadoPlataforma = {
  plataforma: Plataforma;
  ok: boolean;
  /** Presente cuando ok === true. */
  periodo?: VentasPeriodo;
  pedidosSincronizados?: number;
  diasRegistrados?: number;
  error?: string;
  reintentable?: boolean;
  advertencias: string[];
};

export type ResultadoSincronizacion = {
  fechaInicio: string;
  fechaFin: string;
  resultados: ResultadoPlataforma[];
};

/** Conectores disponibles según las credenciales configuradas. */
export function conectoresDisponibles(): ConectorDelivery[] {
  const { moneda } = configGeneral();
  return [conectorUberEats(moneda), conectorDidiFood(moneda)].filter(
    (conector): conector is ConectorDelivery => conector !== null
  );
}

function trocear<T>(elementos: T[], tamano: number): T[][] {
  const grupos: T[][] = [];
  for (let i = 0; i < elementos.length; i += tamano) {
    grupos.push(elementos.slice(i, i + tamano));
  }
  return grupos;
}

async function guardarPedidos(pedidos: PedidoDelivery[]) {
  if (pedidos.length === 0) return;

  const cliente = supabaseAdmin();

  for (const lote of trocear(pedidos, TAMANO_LOTE)) {
    const { error } = await cliente.from('pedidos_delivery').upsert(
      lote.map((pedido) => ({
        plataforma: pedido.plataforma,
        pedido_externo_id: pedido.pedidoExternoId,
        tienda_externa_id: pedido.tiendaExternaId ?? null,
        fecha: pedido.fecha,
        estado: pedido.estado,
        ingresos_brutos: pedido.ingresosBrutos,
        comisiones: pedido.comisiones,
        promociones: pedido.promociones,
        impuestos: pedido.impuestos,
        dinero_neto: pedido.dineroNeto,
        moneda: pedido.moneda,
        actualizado_at: new Date().toISOString(),
      })),
      { onConflict: 'plataforma,pedido_externo_id' }
    );

    if (error) {
      throw new Error(`No se pudieron guardar los pedidos: ${error.message}`);
    }
  }
}

async function guardarReportePeriodo(periodo: VentasPeriodo) {
  const cliente = supabaseAdmin();

  const { error } = await cliente.from('reportes_externos').upsert(
    {
      plataforma: periodo.plataforma,
      fecha_inicio: periodo.fechaInicio,
      fecha_fin: periodo.fechaFin,
      ingresos_brutos: periodo.ingresosBrutos,
      comisiones: periodo.comisiones,
      promociones: periodo.promociones,
      impuestos: periodo.impuestos,
      dinero_neto: periodo.dineroNeto,
      total_pedidos: periodo.totalPedidos,
      moneda: periodo.moneda,
      origen: 'api',
      archivo: `API ${NOMBRE_PLATAFORMA[periodo.plataforma]}`,
      actualizado_at: new Date().toISOString(),
    },
    { onConflict: 'plataforma,fecha_inicio,fecha_fin' }
  );

  if (error) {
    throw new Error(`No se pudo guardar el reporte del periodo: ${error.message}`);
  }
}

/**
 * Registra un ingreso diario por plataforma en `gastos` (tipo venta_plataforma),
 * que es de donde el dashboard y el cálculo de utilidades leen las ventas.
 *
 * Se registra el dinero NETO (lo que efectivamente deposita la plataforma),
 * no el bruto: las comisiones y promociones ya vienen descontadas y quedan
 * guardadas aparte en `reportes_externos` para el análisis de márgenes.
 */
async function guardarVentasDiarias(
  plataforma: Plataforma,
  pedidos: PedidoDelivery[],
  socioId: string
): Promise<number> {
  const porDia = new Map<string, number>();

  for (const pedido of pedidos) {
    if (pedido.estado === 'cancelado') continue;
    porDia.set(pedido.fecha, (porDia.get(pedido.fecha) ?? 0) + pedido.dineroNeto);
  }

  if (porDia.size === 0) return 0;

  const filas = [...porDia.entries()].map(([fecha, monto]) => ({
    tipo: 'venta_plataforma' as const,
    concepto: `Venta ${NOMBRE_PLATAFORMA[plataforma]} ${fecha}`,
    monto: redondear(monto),
    socio_id: socioId,
    fecha,
    notas: `Sincronizado automáticamente desde la API de ${NOMBRE_PLATAFORMA[plataforma]}`,
    origen: 'api_delivery',
    // Llave natural: re-sincronizar el mismo día actualiza en vez de duplicar.
    origen_ref: `${plataforma}:${fecha}`,
  }));

  const cliente = supabaseAdmin();

  for (const lote of trocear(filas, TAMANO_LOTE)) {
    const { error } = await cliente
      .from('gastos')
      .upsert(lote, { onConflict: 'origen_ref' });

    if (error) {
      throw new Error(`No se pudieron registrar las ventas diarias: ${error.message}`);
    }
  }

  return filas.length;
}

async function registrarBitacora(
  plataforma: Plataforma,
  fechaInicio: string,
  fechaFin: string,
  resultado: ResultadoPlataforma,
  disparadoPor: string
) {
  try {
    await supabaseAdmin().from('sincronizaciones_delivery').insert({
      plataforma,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      estado: resultado.ok ? 'ok' : 'error',
      pedidos_sincronizados: resultado.pedidosSincronizados ?? 0,
      dinero_neto: resultado.periodo?.dineroNeto ?? 0,
      mensaje: resultado.error ?? (resultado.advertencias.join(' | ') || null),
      disparado_por: disparadoPor,
    });
  } catch (error) {
    // La bitácora es informativa: si falla, no debe tumbar la sincronización.
    console.error('No se pudo escribir la bitácora de sincronización:', error);
  }
}

function mensajeDeError(error: unknown): { mensaje: string; reintentable: boolean } {
  if (error instanceof ErrorDelivery) {
    return { mensaje: error.message, reintentable: error.reintentable };
  }
  if (error instanceof Error) {
    return { mensaje: error.message, reintentable: false };
  }
  return { mensaje: 'Error desconocido', reintentable: false };
}

export type OpcionesSincronizacion = {
  fechaInicio: string;
  fechaFin: string;
  /** Si se omite, se sincronizan todas las plataformas configuradas. */
  plataformas?: Plataforma[];
  /**
   * Socio al que se atribuyen los ingresos creados. Se usa el de la variable
   * DELIVERY_SYNC_SOCIO_ID y, si no existe, el usuario que disparó la acción.
   * Las ventas no cuentan como gasto de socio, así que no altera el reparto.
   */
  socioId?: string;
  /** Para la bitácora: email del usuario o "cron". */
  disparadoPor?: string;
};

export async function sincronizar(
  opciones: OpcionesSincronizacion
): Promise<ResultadoSincronizacion> {
  const { fechaInicio, fechaFin } = opciones;

  if (!esFechaValida(fechaInicio) || !esFechaValida(fechaFin)) {
    throw new Error('Las fechas deben tener formato YYYY-MM-DD.');
  }
  if (fechaInicio > fechaFin) {
    throw new Error('La fecha de inicio no puede ser posterior a la fecha final.');
  }

  const general = configGeneral();
  const socioId = general.socioIdSincronizacion ?? opciones.socioId;

  if (!socioId) {
    throw new Error(
      'Falta DELIVERY_SYNC_SOCIO_ID: es el socio al que se atribuyen los ingresos sincronizados.'
    );
  }

  const solicitadas = opciones.plataformas?.length ? opciones.plataformas : PLATAFORMAS;
  const conectores = conectoresDisponibles().filter((conector) =>
    solicitadas.includes(conector.plataforma)
  );

  if (conectores.length === 0) {
    throw new Error(
      'Ninguna plataforma solicitada tiene credenciales configuradas. Revisa las variables de entorno.'
    );
  }

  const disparadoPor = opciones.disparadoPor ?? 'desconocido';

  // Secuencial a propósito: son APIs con límite de tasa y el volumen de un
  // restaurante no justifica paralelizar.
  const resultados: ResultadoPlataforma[] = [];

  for (const conector of conectores) {
    let resultado: ResultadoPlataforma;

    try {
      const consulta = await conector.obtenerVentas(fechaInicio, fechaFin);

      await guardarPedidos(consulta.pedidos);
      await guardarReportePeriodo(consulta.periodo);
      const diasRegistrados = await guardarVentasDiarias(
        conector.plataforma,
        consulta.pedidos,
        socioId
      );

      resultado = {
        plataforma: conector.plataforma,
        ok: true,
        periodo: consulta.periodo,
        pedidosSincronizados: consulta.pedidos.length,
        diasRegistrados,
        advertencias: consulta.advertencias,
      };
    } catch (error) {
      const { mensaje, reintentable } = mensajeDeError(error);
      resultado = {
        plataforma: conector.plataforma,
        ok: false,
        error: mensaje,
        reintentable,
        advertencias: [],
      };
    }

    await registrarBitacora(
      conector.plataforma,
      fechaInicio,
      fechaFin,
      resultado,
      disparadoPor
    );
    resultados.push(resultado);
  }

  return { fechaInicio, fechaFin, resultados };
}

/**
 * Guarda un pedido que llegó por webhook y recalcula el total de ese día.
 *
 * A diferencia de la sincronización por rango, aquí llega un pedido a la vez,
 * así que el ingreso del día se vuelve a sumar desde `pedidos_delivery`: si se
 * sobreescribiera con el monto del pedido suelto se perdería el resto del día.
 */
export async function registrarPedidoDeWebhook(pedido: PedidoDelivery): Promise<void> {
  const general = configGeneral();
  const socioId = general.socioIdSincronizacion;

  await guardarPedidos([pedido]);

  if (!socioId) {
    // Sin socio configurado el pedido queda guardado, pero no se puede
    // registrar el ingreso en `gastos`. Se avisa para que no pase inadvertido.
    console.warn(
      'Pedido de webhook guardado sin registrar el ingreso: falta DELIVERY_SYNC_SOCIO_ID.'
    );
    return;
  }

  const cliente = supabaseAdmin();
  const { data, error } = await cliente
    .from('pedidos_delivery')
    .select('dinero_neto, estado')
    .eq('plataforma', pedido.plataforma)
    .eq('fecha', pedido.fecha);

  if (error) {
    throw new Error(`No se pudo recalcular el día ${pedido.fecha}: ${error.message}`);
  }

  const totalDia = (data ?? [])
    .filter((fila) => fila.estado !== 'cancelado')
    .reduce((suma, fila) => suma + Number(fila.dinero_neto ?? 0), 0);

  const { error: errorGasto } = await cliente.from('gastos').upsert(
    {
      tipo: 'venta_plataforma',
      concepto: `Venta ${NOMBRE_PLATAFORMA[pedido.plataforma]} ${pedido.fecha}`,
      monto: redondear(totalDia),
      socio_id: socioId,
      fecha: pedido.fecha,
      notas: `Actualizado por webhook de ${NOMBRE_PLATAFORMA[pedido.plataforma]}`,
      origen: 'api_delivery',
      origen_ref: `${pedido.plataforma}:${pedido.fecha}`,
    },
    { onConflict: 'origen_ref' }
  );

  if (errorGasto) {
    throw new Error(`No se pudo actualizar el ingreso del día: ${errorGasto.message}`);
  }
}
