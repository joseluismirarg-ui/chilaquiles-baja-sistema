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

const COLUMNAS_INGRESOS = [
  'Earnings',
  'Ingresos',
  'Total Earnings',
  'Subtotal',
  'Monto',
  'Bruto',
  'Sales',
  'Ingresos Totales',
  'Precio original del producto',
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
  'Tarifa de entrega por parte de la tienda',
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
  'Gastos de promo pagados por la tienda',
];

function extraerNumero(valor: any): number {
  if (!valor) return 0;
  const numero = parseFloat(valor.toString().replace(/[^0-9.-]/g, ''));
  return isNaN(numero) ? 0 : numero;
}

function obtenerValorFila(
  fila: Record<string, any>,
  posiblesColumnas: string[]
): number {
  for (const columna of posiblesColumnas) {
    const valor = fila[columna];
    if (valor !== undefined && valor !== null && valor !== '') {
      const numero = extraerNumero(valor);
      if (numero !== 0) return numero;
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

  const nombreArchivo = archivo.name.toLowerCase();
  let plataforma: 'uber_eats' | 'didi_food' = 'didi_food';

  if (nombreArchivo.includes('uber')) {
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
    comisiones: Math.abs(comisiones),
    promociones: Math.abs(promociones),
    dineroNeto: Math.max(0, ingresosBrutos - Math.abs(comisiones) - Math.abs(promociones)),
    detalles: {
      totalPedidos: registros.length,
      comisionPorcentaje:
        ingresosBrutos > 0
          ? Math.round((Math.abs(comisiones) / ingresosBrutos) * 100)
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

  const nombreArchivo = archivo.name.toLowerCase();
  let plataforma: 'uber_eats' | 'didi_food' = 'didi_food';

  if (nombreArchivo.includes('uber')) {
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
    comisiones: Math.abs(comisiones),
    promociones: Math.abs(promociones),
    dineroNeto: Math.max(0, ingresosBrutos - Math.abs(comisiones) - Math.abs(promociones)),
    detalles: {
      totalPedidos: registros.length,
      comisionPorcentaje:
        ingresosBrutos > 0
          ? Math.round((Math.abs(comisiones) / ingresosBrutos) * 100)
          : 0,
    },
  };
}

// Parser para PDF de Uber Eats - extrae del resumen consolidado
export async function parsearPDF(
  archivo: File
): Promise<ReporteData | null> {
  const contenido = await archivo.text();

  // Expresiones regulares para extraer valores
  const ventasMatch = contenido.match(/Ventas\s*\(\s*(\d+)\s*Pedidos?\s*\)\s*\$?([\d,]+\.?\d*)/i);
  const comisionesMatch = contenido.match(/Tasas de servicio[^$]*-?\$?([\d,]+\.?\d*)/i);
  const oferasMatch = contenido.match(/Gastos por servicios de marketing\s*[^$]*-?\$?([\d,]+\.?\d*)/i);
  const netoMatch = contenido.match(/Total neto\s*\$?([\d,]+\.?\d*)/i);
  const fechaMatch = contenido.match(/([A-Z][a-z]{2})\s+(\d{1,2})-(\d{1,2}),?\s+(\d{4})/);

  const ingresosBrutos = ventasMatch ? parseFloat(ventasMatch[2].replace(/,/g, '')) : 0;
  const comisiones = comisionesMatch ? parseFloat(comisionesMatch[1].replace(/,/g, '')) : 0;
  const promociones = oferasMatch ? parseFloat(oferasMatch[1].replace(/,/g, '')) : 0;
  const dineroNeto = netoMatch ? parseFloat(netoMatch[1].replace(/,/g, '')) : 0;
  const totalPedidos = ventasMatch ? parseInt(ventasMatch[1]) : 0;

  let fechaInicio = new Date().toISOString().split('T')[0];
  if (fechaMatch) {
    const año = fechaMatch[4];
    const mes = new Date(`${fechaMatch[1]} 1, ${año}`).getMonth() + 1;
    fechaInicio = `${año}-${String(mes).padStart(2, '0')}-01`;
  }

  return {
    plataforma: 'uber_eats',
    fechaInicio,
    fechaFin: new Date().toISOString().split('T')[0],
    ingresosBrutos,
    comisiones,
    promociones,
    dineroNeto,
    detalles: {
      totalPedidos,
      comisionPorcentaje:
        ingresosBrutos > 0 ? Math.round((comisiones / ingresosBrutos) * 100) : 0,
    },
  };
}

export async function parsearReporte(archivo: File): Promise<ReporteData | null> {
  const tipo = archivo.name.split('.').pop()?.toLowerCase();

  if (tipo === 'csv') {
    return parsearCSV(archivo);
  } else if (tipo === 'xlsx' || tipo === 'xls') {
    return parsearExcel(archivo);
  } else if (tipo === 'pdf') {
    return parsearPDF(archivo);
  }

  return null;
}
