export type User = {
  id: string;
  email: string;
  name: string;
  role: string;
};

export type Gasto = {
  id: string;
  tipo: 'fijo' | 'variable' | 'venta_fisica' | 'venta_plataforma';
  concepto: string;
  monto: number;
  socio_id: string;
  proveedor_id?: string;
  fecha: string;
  notas?: string;
  created_at: string;
};

export type Proveedor = {
  id: string;
  nombre: string;
  contacto?: string;
  telefono?: string;
  direccion?: string;
  created_at: string;
};

export type PrecioHistorico = {
  id: string;
  proveedor_id: string;
  insumo: string;
  precio_unitario: number;
  cantidad: number;
  fecha: string;
  created_at: string;
};

export type Inventario = {
  id: string;
  nombre: string;
  cantidad: number;
  unidad: string;
  precio_promedio: number;
  updated_at: string;
};

export type ReporteExterno = {
  id: string;
  plataforma: 'uber_eats' | 'didi_food';
  fecha_inicio: string;
  fecha_fin: string;
  ingresos_brutos: number;
  comisiones: number;
  promociones: number;
  dinero_neto: number;
  archivo: string;
  created_at: string;
};

export type Deuda = {
  id: string;
  socio_id: string;
  monto: number;
  mes: string;
  estado: 'pendiente' | 'pagada';
  created_at: string;
};
