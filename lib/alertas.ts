import { supabase } from '@/lib/supabase';

export interface Alerta {
  id: string;
  tipo: 'alerta' | 'advertencia' | 'info';
  titulo: string;
  descripcion: string;
  fecha: string;
  accion?: string;
}

export async function obtenerAlertas(): Promise<Alerta[]> {
  const alertas: Alerta[] = [];
  const mesActual = new Date().toISOString().split('T')[0].slice(0, 7);

  // Alerta 1: Inventario bajo stock
  const { data: inventario } = await supabase
    .from('inventario')
    .select('*')
    .lt('cantidad', 5);

  if (inventario && inventario.length > 0) {
    inventario.forEach((item) => {
      alertas.push({
        id: `inventario-${item.id}`,
        tipo: 'advertencia',
        titulo: `Stock bajo: ${item.nombre}`,
        descripcion: `Quedan ${item.cantidad} ${item.unidad}. Recomendamos reabastecer.`,
        fecha: new Date().toISOString().split('T')[0],
        accion: '/inventario',
      });
    });
  }

  // Alerta 2: Gastos anormales (más del doble del promedio)
  const { data: gastosDelMes } = await supabase
    .from('gastos')
    .select('*')
    .filter('fecha', 'gte', `${mesActual}-01`)
    .filter('fecha', 'lte', `${mesActual}-31`)
    .in('tipo', ['variable', 'fijo']);

  if (gastosDelMes && gastosDelMes.length > 0) {
    const promedioConcepto: { [key: string]: { total: number; count: number } } = {};

    gastosDelMes.forEach((gasto) => {
      if (!promedioConcepto[gasto.concepto]) {
        promedioConcepto[gasto.concepto] = { total: 0, count: 0 };
      }
      promedioConcepto[gasto.concepto].total += gasto.monto;
      promedioConcepto[gasto.concepto].count += 1;
    });

    gastosDelMes.forEach((gasto) => {
      const stats = promedioConcepto[gasto.concepto];
      const promedio = stats.total / stats.count;
      if (gasto.monto > promedio * 2) {
        alertas.push({
          id: `gasto-anormal-${gasto.id}`,
          tipo: 'alerta',
          titulo: `Gasto inusual: ${gasto.concepto}`,
          descripcion: `${gasto.concepto} costó $${gasto.monto.toLocaleString()} (promedio: $${promedio.toLocaleString()})`,
          fecha: gasto.fecha,
          accion: '/gastos',
        });
      }
    });
  }

  // Alerta 3: Deudas pendientes
  const { data: deudas } = await supabase
    .from('deudas')
    .select('*')
    .eq('estado', 'pendiente');

  if (deudas && deudas.length > 0) {
    deudas.forEach((deuda) => {
      const diasPendientes = Math.floor(
        (new Date().getTime() - new Date(deuda.fecha_creacion).getTime()) / (1000 * 60 * 60 * 24)
      );
      alertas.push({
        id: `deuda-${deuda.id}`,
        tipo: diasPendientes > 30 ? 'alerta' : 'advertencia',
        titulo: `Deuda pendiente: ${deuda.descripcion}`,
        descripcion: `$${deuda.monto.toLocaleString()} pendiente desde hace ${diasPendientes} días`,
        fecha: new Date().toISOString().split('T')[0],
      });
    });
  }

  return alertas.slice(0, 10); // Max 10 alertas
}
