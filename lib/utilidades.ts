import { Gasto } from './types';

export type CalculoUtilidades = {
  utilidadNeta: number;
  gastosPorSocio: { [socioId: string]: number };
  reparticion: {
    [socioId: string]: {
      gastoRealizado: number;
      reponer: number;
      porcentajeAportacion: number;
      dineroRecibido: number;
      deuda: number;
    };
  };
  fondoEmpresa: number;
  deudaTotal: { [socioId: string]: number };
};

export function calcularUtilidades(
  gastos: Gasto[],
  socioDatos: { [socioId: string]: string }
): CalculoUtilidades {
  // Separar ventas de gastos
  const ventas = gastos.filter(g => g.tipo.includes('venta'));
  const gastosReales = gastos.filter(g => !g.tipo.includes('venta'));

  // Calcular totales
  const ventasTotales = ventas.reduce((sum, v) => sum + v.monto, 0);
  const gastosTotales = gastosReales.reduce((sum, g) => sum + g.monto, 0);
  const utilidadNeta = ventasTotales - gastosTotales;

  // Gastos por socio (solo gastos reales)
  const gastosPorSocio: { [socioId: string]: number } = {};
  gastosReales.forEach(g => {
    gastosPorSocio[g.socio_id] = (gastosPorSocio[g.socio_id] || 0) + g.monto;
  });

  const totalGastos = Object.values(gastosPorSocio).reduce((a, b) => a + b, 0);

  // Calcular repartición
  const reparticion: CalculoUtilidades['reparticion'] = {};
  const deudaTotal: { [socioId: string]: number } = {};

  Object.entries(gastosPorSocio).forEach(([socioId, gastoRealizado]) => {
    const porcentajeAportacion = totalGastos > 0 ? gastoRealizado / totalGastos : 0;

    let dineroRecibido = 0;
    let deuda = 0;

    if (utilidadNeta >= totalGastos) {
      // Hay remanente
      const remanente = utilidadNeta - totalGastos;
      dineroRecibido = gastoRealizado + remanente * 0.2; // 20% del remanente para cada socio
    } else {
      // Hay déficit - se reparte proporcionalmente
      dineroRecibido = utilidadNeta * porcentajeAportacion;
      deuda = gastoRealizado - dineroRecibido;
    }

    reparticion[socioId] = {
      gastoRealizado,
      reponer: gastoRealizado,
      porcentajeAportacion,
      dineroRecibido,
      deuda,
    };

    if (deuda > 0) {
      deudaTotal[socioId] = deuda;
    }
  });

  // Fondo empresa: 20% del remanente si hay
  let fondoEmpresa = 0;
  if (utilidadNeta > totalGastos) {
    const remanente = utilidadNeta - totalGastos;
    fondoEmpresa = remanente * 0.2;
  }

  return {
    utilidadNeta,
    gastosPorSocio,
    reparticion,
    fondoEmpresa,
    deudaTotal,
  };
}
