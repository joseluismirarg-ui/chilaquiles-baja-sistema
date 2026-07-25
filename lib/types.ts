export type User = {
  id: string;
  email: string;
  name: string;
  role: string;
};

export type Gasto = {
  id: string;
  tipo: 'fijo' | 'variable' | 'venta_fisica' | 'venta_plataforma' | 'ganancia_manual';
  concepto: string;
  monto: number;
  socio_id: string;
  email_socio?: string;
  proveedor_id?: string;
  fecha: string;
  notas?: string;
  /** 'manual' cuando lo capturó un socio, 'api_delivery' si vino de una plataforma. */
  origen?: string;
  /** Llave natural del origen externo (p. ej. "uber_eats:2026-07-24"). */
  origen_ref?: string;
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
  impuestos?: number;
  dinero_neto: number;
  total_pedidos?: number;
  moneda?: string;
  /** 'archivo' si se subió un CSV/Excel, 'api' si vino de la sincronización. */
  origen?: 'archivo' | 'api';
  archivo: string;
  created_at: string;
  actualizado_at?: string;
};

export type PedidoDeliveryFila = {
  id: string;
  plataforma: 'uber_eats' | 'didi_food';
  pedido_externo_id: string;
  tienda_externa_id?: string;
  fecha: string;
  estado: 'completado' | 'cancelado' | 'desconocido';
  ingresos_brutos: number;
  comisiones: number;
  promociones: number;
  impuestos: number;
  dinero_neto: number;
  moneda: string;
  created_at: string;
  actualizado_at: string;
};

export type SincronizacionDelivery = {
  id: string;
  plataforma: 'uber_eats' | 'didi_food';
  fecha_inicio: string;
  fecha_fin: string;
  estado: 'ok' | 'error';
  pedidos_sincronizados: number;
  dinero_neto: number;
  mensaje?: string;
  disparado_por?: string;
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

export type Nota = {
  id: string;
  autor_id: string;
  autor_email: string;
  contenido: string;
  tipo: 'general' | 'insumos_faltantes' | 'urgente';
  fecha_nota: string;
  created_at: string;
};
