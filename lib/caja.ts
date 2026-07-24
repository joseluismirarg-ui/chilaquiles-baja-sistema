import { supabase } from '@/lib/supabase';

export interface CierreCaja {
  id: string;
  fecha: string;
  apertura: number;
  ventas_fisicas: number;
  ventas_plataforma: number;
  otros_ingresos: number;
  total_ingresos: number;
  gastos_variables: number;
  gastos_fijos: number;
  otros_egresos: number;
  total_egresos: number;
  saldo_teorico: number;
  efectivo_contado: number;
  diferencia: number;
  notas?: string;
  responsable_cierre?: string;
}

export async function registrarCierreCaja(cierre: Omit<CierreCaja, 'id'>) {
  // Obtener gastos del día
  const { data: gastosDelDia } = await supabase
    .from('gastos')
    .select('*')
    .eq('fecha', cierre.fecha);

  const gastos = gastosDelDia || [];

  const ventasFisicas = gastos
    .filter((g) => g.tipo === 'venta_fisica')
    .reduce((sum, g) => sum + g.monto, 0);

  const ventasPlataforma = gastos
    .filter((g) => g.tipo === 'venta_plataforma')
    .reduce((sum, g) => sum + g.monto, 0);

  const gastosVariables = gastos
    .filter((g) => g.tipo === 'variable')
    .reduce((sum, g) => sum + g.monto, 0);

  const gastosFijos = gastos
    .filter((g) => g.tipo === 'fijo')
    .reduce((sum, g) => sum + g.monto, 0);

  const totalIngresos = ventasFisicas + ventasPlataforma + (cierre.otros_ingresos || 0);
  const totalEgresos = gastosVariables + gastosFijos + (cierre.otros_egresos || 0);
  const saldoTeorico = cierre.apertura + totalIngresos - totalEgresos;
  const diferencia = (cierre.efectivo_contado || 0) - saldoTeorico;

  const { data, error } = await supabase.from('cierre_caja').insert([
    {
      fecha: cierre.fecha,
      apertura: cierre.apertura || 0,
      ventas_fisicas: ventasFisicas,
      ventas_plataforma: ventasPlataforma,
      otros_ingresos: cierre.otros_ingresos || 0,
      total_ingresos: totalIngresos,
      gastos_variables: gastosVariables,
      gastos_fijos: gastosFijos,
      otros_egresos: cierre.otros_egresos || 0,
      total_egresos: totalEgresos,
      saldo_teorico: saldoTeorico,
      efectivo_contado: cierre.efectivo_contado || 0,
      diferencia,
      notas: cierre.notas,
      responsable_cierre: cierre.responsable_cierre,
    },
  ]);

  if (error) throw error;
  return data?.[0];
}

export async function obtenerCierreCaja(fecha: string) {
  const { data, error } = await supabase
    .from('cierre_caja')
    .select('*')
    .eq('fecha', fecha)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function obtenerCierresCaja(mes: string) {
  const { data, error } = await supabase
    .from('cierre_caja')
    .select('*')
    .filter('fecha', 'gte', `${mes}-01`)
    .filter('fecha', 'lte', `${mes}-31`)
    .order('fecha', { ascending: false });

  if (error) throw error;
  return data;
}

export async function obtenerResumenCaja(mes: string) {
  const { data } = await supabase
    .from('cierre_caja')
    .select('*')
    .filter('fecha', 'gte', `${mes}-01`)
    .filter('fecha', 'lte', `${mes}-31`);

  const cierres = data || [];

  return {
    total_cierres: cierres.length,
    total_ingresos: cierres.reduce((sum, c) => sum + c.total_ingresos, 0),
    total_egresos: cierres.reduce((sum, c) => sum + c.total_egresos, 0),
    total_diferencias: cierres.reduce((sum, c) => sum + Math.abs(c.diferencia || 0), 0),
    promedio_diferencia: cierres.length > 0
      ? cierres.reduce((sum, c) => sum + (c.diferencia || 0), 0) / cierres.length
      : 0,
    cierres_con_discrepancia: cierres.filter((c) => Math.abs(c.diferencia || 0) > 0).length,
  };
}
