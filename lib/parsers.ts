import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';

export type ReporteData = {
  plataforma: 'uber_eats' | 'didi_food';
  fechaInicio: string;
  fechaFin: string;
  ingresosBrutos: number;
  comisiones: number;
  promociones: number;
  dineroNeto: number;
  detalles?: {
    totalPedidos?: number;
    comisionPorcentaje?: number;
  };
};

// Variantes de nombres de columnas que pueden tener los reportes
const COLUMNAS_INGRESOS = [
  'Earnings',
  'Ingresos',
  'Total Earnings',
  'Subtotal',
  'Monto',
  'Bruto',
  'Sales',
  'Ingresos Totales',
];

const COLUMNAS_COMISIONES = [
  'Service Fee',
  'Comisión',
  'Commission',
  'Comisiones',
  'Service Fees',
  'Tarifa de Servicio',
  'Fee',
  'Comisión Plataforma',
];

const COLUMNAS_PROMOCIONES = [
  'Promotions',
  'Promociones',
  'Promotion Credits',
  'Promo',
  'Descuentos',
  'Ajustes',
  'Credits',
  'Descuento a Clientes',
];

function obtenerValorFila(
  fila: Record<string, any>,
  posiblesColumnas: string[]
): number {
  for (const columna of posiblesColumnas) {
    const valor = fila[columna];
    if (valor !== undefined && valor !== null && valor !== '') {
      const numero = parseFloat(valor.toString().replace(/[^0-9.-]/g, ''));
      if (!isNaN(numero)) return numero;
    }
  }
  return 0;
}

export async function parsearCSV(
  archivo: File
): Promise<ReporteData | null> {
  const contenido = await archivo.text();
  const registros = parse(contenido, { columns: true }) as Record<
    string,
    string
  >[];

  if (registros.length === 0) return null;

  // Detección de plataforma por nombre de archivo
  const nombreArchivo = archivo.name.toLowerCase();
  let plataforma: 'uber_eats' | 'didi_food' = 'uber_eats';

  if (nombreArchivo.includes('didi')) {
    plataforma = 'didi_food';
  } else if (nombreArchivo.includes('uber')) {
    plataforma = 'uber_eats';
  }

  let ingresosBrutos = 0;
  let comisiones = 0;
  let promociones = 0;

  registros.forEach((fila) => {
    const ingreso = obtenerValorFila(fila, COLUMNAS_INGRESOS);
    const comision = obtenerValorFila(fila, COLUMNAS_COMISIONES);
    const promo = obtenerValorFila(fila, COLUMNAS_PROMOCIONES);

    if (ingreso) ingresosBrutos += ingreso;
    if (comision) comisiones += comision;
    if (promo) promociones += promo;
  });

  return {
    plataforma,
    fechaInicio: new Date().toISOString().split('T')[0],
    fechaFin: new Date().toISOString().split('T')[0],
    ingresosBrutos,
    comisiones,
    promociones,
    dineroNeto: Math.max(0, ingresosBrutos - comisiones - promociones),
    detalles: {
      totalPedidos: registros.length,
      comisionPorcentaje:
        ingresosBrutos > 0
          ? Math.round((comisiones / ingresosBrutos) * 100)
          : 0,
    },
  };
}

export async function parsearExcel(
  archivo: File
): Promise<ReporteData | null> {
  const buffer = await archivo.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const registros = XLSX.utils.sheet_to_json(sheet) as Record<string, any>[];

  if (registros.length === 0) return null;

  // Detección de plataforma
  const nombreArchivo = archivo.name.toLowerCase();
  let plataforma: 'uber_eats' | 'didi_food' = 'uber_eats';

  if (nombreArchivo.includes('didi')) {
    plataforma = 'didi_food';
  } else if (nombreArchivo.includes('uber')) {
    plataforma = 'uber_eats';
  }

  let ingresosBrutos = 0;
  let comisiones = 0;
  let promociones = 0;

  registros.forEach((fila) => {
    const ingreso = obtenerValorFila(fila, COLUMNAS_INGRESOS);
    const comision = obtenerValorFila(fila, COLUMNAS_COMISIONES);
    const promo = obtenerValorFila(fila, COLUMNAS_PROMOCIONES);

    if (ingreso) ingresosBrutos += ingreso;
    if (comision) comisiones += comision;
    if (promo) promociones += promo;
  });

  return {
    plataforma,
    fechaInicio: new Date().toISOString().split('T')[0],
    fechaFin: new Date().toISOString().split('T')[0],
    ingresosBrutos,
    comisiones,
    promociones,
    dineroNeto: Math.max(0, ingresosBrutos - comisiones - promociones),
    detalles: {
      totalPedidos: registros.length,
      comisionPorcentaje:
        ingresosBrutos > 0
          ? Math.round((comisiones / ingresosBrutos) * 100)
          : 0,
    },
  };
}

export async function parsearReporte(archivo: File): Promise<ReporteData | null> {
  const tipo = archivo.name.split('.').pop()?.toLowerCase();

  if (tipo === 'csv') {
    return parsearCSV(archivo);
  } else if (tipo === 'xlsx' || tipo === 'xls') {
    return parsearExcel(archivo);
  }

  return null;
}
