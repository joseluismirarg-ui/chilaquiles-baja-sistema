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
};

export async function parsearCSV(
  archivo: File
): Promise<ReporteData | null> {
  const contenido = await archivo.text();
  const registros = parse(contenido, { columns: true }) as Record<
    string,
    string
  >[];

  if (registros.length === 0) return null;

  // Detección automática de plataforma
  const primeraFila = registros[0];
  const columnasStr = JSON.stringify(primeraFila).toLowerCase();

  let plataforma: 'uber_eats' | 'didi_food' = 'uber_eats';
  if (columnasStr.includes('didi')) {
    plataforma = 'didi_food';
  }

  // Parser general - adaptar según formato real
  let ingresosBrutos = 0;
  let comisiones = 0;
  let promociones = 0;

  registros.forEach(fila => {
    const ingreso = parseFloat(fila['Earnings'] || fila['Ingresos'] || '0');
    const comision = parseFloat(fila['Service Fee'] || fila['Comisión'] || '0');
    const promo = parseFloat(fila['Promotions'] || fila['Promociones'] || '0');

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
    dineroNeto: ingresosBrutos - comisiones - promociones,
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
  const primeraFila = JSON.stringify(registros[0]).toLowerCase();
  let plataforma: 'uber_eats' | 'didi_food' = 'uber_eats';
  if (primeraFila.includes('didi')) {
    plataforma = 'didi_food';
  }

  // Sumar totales
  let ingresosBrutos = 0;
  let comisiones = 0;
  let promociones = 0;

  registros.forEach(fila => {
    const ingreso = parseFloat(fila['Earnings'] || fila['Ingresos'] || '0');
    const comision = parseFloat(fila['Service Fee'] || fila['Comisión'] || '0');
    const promo = parseFloat(fila['Promotions'] || fila['Promociones'] || '0');

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
    dineroNeto: ingresosBrutos - comisiones - promociones,
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
