// Pruebas de la normalización de datos de delivery.
//
//   npm run probar:delivery
//
// No tocan la red: verifican el parseo de los reportes, la agregación por
// periodo y la verificación de firmas. Si Uber o Didi te mandan encabezados o
// campos que el parser no reconoce, agrega el caso aquí junto con el alias
// nuevo en lib/delivery/.

import assert from 'node:assert';
import { createHmac } from 'node:crypto';
import { normalizarCsvUber } from '@/lib/delivery/uber-eats';
import { normalizarPedidoDidi, firmarParametros } from '@/lib/delivery/didi-food';
import { agregarPeriodo, esFechaValida } from '@/lib/delivery/types';
import { firmaValida } from '@/lib/delivery/webhooks';

// --- Uber: CSV en inglés ---------------------------------------------------
const csvEn = `Order ID,Store UUID,Order Date,Order Status,Food Sales,Marketplace Fee,Promotions on Items,Tax,Total Payout,Currency
ord-1,store-a,07/24/2026,COMPLETED,"$250.00","-$75.00","-$20.00","$40.00","$155.00",MXN
ord-2,store-a,07/24/2026,CANCELED,"$100.00","$0.00","$0.00","$0.00","$0.00",MXN
ord-3,store-a,2026-07-25,DELIVERED,"$300.00","-$90.00","$0.00","$48.00","$210.00",MXN`;

const uber = normalizarCsvUber(csvEn, '2026-07-24', 'MXN');
assert.strictEqual(uber.pedidos.length, 3);
assert.deepStrictEqual(uber.advertencias, []);
assert.strictEqual(uber.pedidos[0].fecha, '2026-07-24', 'MM/DD/YYYY debe convertirse');
assert.strictEqual(uber.pedidos[0].comisiones, 75, 'la comisión negativa se guarda positiva');
assert.strictEqual(uber.pedidos[0].dineroNeto, 155);
assert.strictEqual(uber.pedidos[1].estado, 'cancelado');
assert.strictEqual(uber.pedidos[2].fecha, '2026-07-25', 'ISO se respeta');
assert.strictEqual(uber.pedidos[2].estado, 'completado');

const periodo = agregarPeriodo('uber_eats', '2026-07-24', '2026-07-25', uber.pedidos);
assert.strictEqual(periodo.totalPedidos, 2, 'el cancelado no cuenta');
assert.strictEqual(periodo.pedidosCancelados, 1);
assert.strictEqual(periodo.ingresosBrutos, 550);
assert.strictEqual(periodo.comisiones, 165);
assert.strictEqual(periodo.dineroNeto, 365);
assert.strictEqual(periodo.comisionPorcentaje, 30);
console.log('✓ Uber CSV inglés + agregación');

// --- Uber: CSV en español con otros encabezados ----------------------------
const csvEs = `ID de pedido,Fecha,Estado,Ventas,Tasas de servicio,Gastos por servicios de marketing,Pago total
p-1,2026-07-24,Entregado,"1,250.50","-375.15","-50.00","825.35"`;

const uberEs = normalizarCsvUber(csvEs, '2026-07-24', 'MXN');
assert.strictEqual(uberEs.pedidos[0].ingresosBrutos, 1250.5, 'separador de miles');
assert.strictEqual(uberEs.pedidos[0].comisiones, 375.15);
assert.strictEqual(uberEs.pedidos[0].estado, 'completado', 'acento en "Entregado"');
assert.strictEqual(uberEs.pedidos[0].moneda, 'MXN', 'sin columna moneda usa el default');
console.log('✓ Uber CSV español (acentos, miles, alias)');

// --- Uber: encabezados desconocidos avisan en vez de romper ----------------
const csvRaro = `foo,bar\n1,2`;
const uberRaro = normalizarCsvUber(csvRaro, '2026-07-24', 'MXN');
assert.strictEqual(uberRaro.advertencias.length, 1);
assert.ok(uberRaro.advertencias[0].includes('foo'), 'la advertencia lista las columnas');
assert.ok(uberRaro.pedidos[0].pedidoExternoId.startsWith('uber-'), 'id sintético de respaldo');
console.log('✓ Uber CSV desconocido -> advertencia, no excepción');

// --- Didi: centavos + epoch ------------------------------------------------
const didi = normalizarPedidoDidi(
  {
    order_id: 'didi-1',
    shop_id: 'tienda-1',
    order_time: 1785000000, // epoch en segundos
    order_status: 'finished',
    product_amount: 25000, // centavos -> 250.00
    commission_amount: 7500,
    shop_discount_amount: 2000,
    tax_amount: 4000,
    settle_amount: 15500,
    currency: 'MXN',
  },
  '2026-07-24',
  'MXN'
);
assert.strictEqual(didi.ingresosBrutos, 250, 'centavos convertidos');
assert.strictEqual(didi.comisiones, 75);
assert.strictEqual(didi.dineroNeto, 155);
assert.strictEqual(didi.estado, 'completado');
assert.strictEqual(didi.fecha, new Date(1785000000000).toISOString().slice(0, 10));
console.log('✓ Didi normalización (centavos, epoch, estado)');

// Sin settle_amount el neto se deriva.
const didiDerivado = normalizarPedidoDidi(
  { order_id: 'didi-2', total_amount: 10000, commission_amount: 3000, order_status: '5' },
  '2026-07-24',
  'MXN'
);
assert.strictEqual(didiDerivado.dineroNeto, 70, 'neto derivado = bruto - comisión - promo');
assert.strictEqual(didiDerivado.estado, 'cancelado', 'código numérico 5 = cancelado');
console.log('✓ Didi neto derivado y estado por código');

// --- Firmas ----------------------------------------------------------------
const firma1 = firmarParametros({ b: '2', a: '1' }, 'secreto', 'hmac-sha256');
const firma2 = firmarParametros({ a: '1', b: '2' }, 'secreto', 'hmac-sha256');
assert.strictEqual(firma1, firma2, 'la firma no depende del orden de inserción');
assert.notStrictEqual(
  firma1,
  firmarParametros({ a: '1', b: '2' }, 'otro', 'hmac-sha256'),
  'otro secreto -> otra firma'
);
assert.strictEqual(firmarParametros({ a: '1' }, 's', 'md5').length, 32, 'md5 hex');
console.log('✓ Firma Didi determinista');

// --- Webhook: verificación HMAC -------------------------------------------
const cuerpo = JSON.stringify({ event_type: 'orders.notification', order_id: 'x' });
const buena = createHmac('sha256', 'secreto').update(cuerpo, 'utf8').digest('hex');
assert.ok(firmaValida(cuerpo, buena, 'secreto'));
assert.ok(firmaValida(cuerpo, buena.toUpperCase(), 'secreto'), 'hex en mayúsculas');
assert.ok(firmaValida(cuerpo, `sha256=${buena}`, 'secreto'), 'prefijo sha256=');
assert.ok(!firmaValida(cuerpo, buena, 'otro'), 'secreto equivocado se rechaza');
assert.ok(!firmaValida(`${cuerpo} `, buena, 'secreto'), 'cuerpo alterado se rechaza');
assert.ok(!firmaValida(cuerpo, '', 'secreto'), 'sin firma se rechaza');
assert.ok(!firmaValida(cuerpo, 'abc', 'secreto'), 'firma corta no truena');
console.log('✓ Verificación de firma de webhooks');

// --- Validación de fechas --------------------------------------------------
assert.ok(esFechaValida('2026-07-24'));
assert.ok(!esFechaValida('2026-13-01'), 'mes inexistente');
assert.ok(!esFechaValida('2026-02-30'), 'día inexistente');
assert.ok(!esFechaValida('24/07/2026'));
assert.ok(!esFechaValida(''));
console.log('✓ Validación de fechas');

console.log('\nTodas las pruebas pasaron.');
