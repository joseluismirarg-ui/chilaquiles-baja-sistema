import { supabase } from '@/lib/supabase';

export interface BalanceGeneral {
  activos: {
    efectivo: number;
    inventario: number;
    bancos: number;
    total: number;
  };
  pasivos: {
    deudas: number;
    comisiones_pendientes: number;
    total: number;
  };
  patrimonio: {
    capital: number;
    utilidades_acumuladas: number;
    total: number;
  };
}

export interface EstadoResultados {
  periodo: string;
  ingresos: {
    ventas_fisicas: number;
    ventas_plataformas: number;
    otros: number;
    total: number;
  };
  gastos: {
    variables: number;
    fijos: number;
    total: number;
  };
  utilidad_operativa: number;
  margen_operativo: number;
}

export interface FlujoCaja {
  periodo: string;
  apertura: number;
  entradas: {
    ventas_fisicas: number;
    ventas_plataformas: number;
    otros: number;
    total: number;
  };
  salidas: {
    gastos_variables: number;
    gastos_fijos: number;
    otros: number;
    total: number;
  };
  cierre: number;
}

export async function obtenerBalanceGeneral(mes: string): Promise<BalanceGeneral> {
  // Obtener gastos del mes actual y anteriores
  const { data: gastos } = await supabase
    .from('gastos')
    .select('*')
    .lte('fecha', `${mes}-31`);

  // Obtener inventario actual
  const { data: inventario } = await supabase
    .from('inventario')
    .select('*');

  // Obtener deudas
  const { data: deudas } = await supabase
    .from('deudas')
    .select('*')
    .eq('estado', 'pendiente');

  const gastosArray = gastos || [];
  const inventarioArray = inventario || [];
  const deudasArray = deudas || [];

  // Calcular efectivo disponible (ingresos - gastos del mes)
  const ventasDelMes = gastosArray
    .filter((g) => g.fecha.startsWith(mes) && (g.tipo === 'venta_fisica' || g.tipo === 'venta_plataforma'))
    .reduce((sum, g) => sum + g.monto, 0);

  const gastosDelMes = gastosArray
    .filter((g) => g.fecha.startsWith(mes) && (g.tipo === 'fijo' || g.tipo === 'variable'))
    .reduce((sum, g) => sum + g.monto, 0);

  const efectivo = ventasDelMes - gastosDelMes;

  // Inventario total (cantidad * precio promedio)
  const inventarioTotal = inventarioArray.reduce(
    (sum, item) => sum + item.cantidad * (item.precio_promedio || 0),
    0
  );

  // Deudas totales
  const deudasTotal = deudasArray.reduce((sum, d) => sum + d.monto, 0);

  // Utilidades acumuladas (todas las ventas menos todos los gastos)
  const utilidadesAcumuladas =
    gastosArray
      .filter((g) => g.tipo === 'venta_fisica' || g.tipo === 'venta_plataforma')
      .reduce((sum, g) => sum + g.monto, 0) -
    gastosArray
      .filter((g) => g.tipo === 'fijo' || g.tipo === 'variable')
      .reduce((sum, g) => sum + g.monto, 0);

  return {
    activos: {
      efectivo: Math.max(0, efectivo),
      inventario: inventarioTotal,
      bancos: 0,
      total: Math.max(0, efectivo) + inventarioTotal,
    },
    pasivos: {
      deudas: deudasTotal,
      comisiones_pendientes: 0,
      total: deudasTotal,
    },
    patrimonio: {
      capital: 0,
      utilidades_acumuladas: Math.max(0, utilidadesAcumuladas),
      total: Math.max(0, utilidadesAcumuladas),
    },
  };
}

export async function obtenerEstadoResultados(mes: string): Promise<EstadoResultados> {
  const { data: gastos } = await supabase
    .from('gastos')
    .select('*')
    .filter('fecha', 'gte', `${mes}-01`)
    .filter('fecha', 'lte', `${mes}-31`);

  const gastosArray = gastos || [];

  const ventasFisicas = gastosArray
    .filter((g) => g.tipo === 'venta_fisica')
    .reduce((sum, g) => sum + g.monto, 0);

  const ventasPlataformas = gastosArray
    .filter((g) => g.tipo === 'venta_plataforma')
    .reduce((sum, g) => sum + g.monto, 0);

  const gastosVariables = gastosArray
    .filter((g) => g.tipo === 'variable')
    .reduce((sum, g) => sum + g.monto, 0);

  const gastosFijos = gastosArray
    .filter((g) => g.tipo === 'fijo')
    .reduce((sum, g) => sum + g.monto, 0);

  const totalIngresos = ventasFisicas + ventasPlataformas;
  const totalGastos = gastosVariables + gastosFijos;
  const utilidadOperativa = totalIngresos - totalGastos;
  const margenOperativo = totalIngresos > 0 ? (utilidadOperativa / totalIngresos) * 100 : 0;

  const mesFormato = new Date(`${mes}-01`).toLocaleDateString('es-MX', {
    month: 'long',
    year: 'numeric',
  });

  return {
    periodo: mesFormato,
    ingresos: {
      ventas_fisicas: ventasFisicas,
      ventas_plataformas: ventasPlataformas,
      otros: 0,
      total: totalIngresos,
    },
    gastos: {
      variables: gastosVariables,
      fijos: gastosFijos,
      total: totalGastos,
    },
    utilidad_operativa: utilidadOperativa,
    margen_operativo: margenOperativo,
  };
}

export async function obtenerFlujoCaja(mes: string): Promise<FlujoCaja> {
  const { data: gastos } = await supabase
    .from('gastos')
    .select('*')
    .filter('fecha', 'gte', `${mes}-01`)
    .filter('fecha', 'lte', `${mes}-31`);

  const gastosArray = gastos || [];

  const ventasFisicas = gastosArray
    .filter((g) => g.tipo === 'venta_fisica')
    .reduce((sum, g) => sum + g.monto, 0);

  const ventasPlataformas = gastosArray
    .filter((g) => g.tipo === 'venta_plataforma')
    .reduce((sum, g) => sum + g.monto, 0);

  const gastosVariables = gastosArray
    .filter((g) => g.tipo === 'variable')
    .reduce((sum, g) => sum + g.monto, 0);

  const gastosFijos = gastosArray
    .filter((g) => g.tipo === 'fijo')
    .reduce((sum, g) => sum + g.monto, 0);

  const totalEntradas = ventasFisicas + ventasPlataformas;
  const totalSalidas = gastosVariables + gastosFijos;
  const cierre = totalEntradas - totalSalidas;

  const mesFormato = new Date(`${mes}-01`).toLocaleDateString('es-MX', {
    month: 'long',
    year: 'numeric',
  });

  return {
    periodo: mesFormato,
    apertura: 0,
    entradas: {
      ventas_fisicas: ventasFisicas,
      ventas_plataformas: ventasPlataformas,
      otros: 0,
      total: totalEntradas,
    },
    salidas: {
      gastos_variables: gastosVariables,
      gastos_fijos: gastosFijos,
      otros: 0,
      total: totalSalidas,
    },
    cierre: cierre,
  };
}
