# 📊 Análisis de Reportes - Didi Food y Uber Eats

## Didi Food Report

**Archivo:** `_Reporte diario de pedidos(01-06-2026_30-06-2026).xlsx`

### Estructura:
- **Total filas:** 40 (incluye encabezados + 39 pedidos)
- **Total columnas:** 35

### Columnas relevantes para ingresos:

| Columna | Nombre | Significado |
|---------|--------|------------|
| 25 | Precio original del producto | **Ingresos brutos** |
| 26 | Tarifa de entrega por parte de la tienda | **Comisión Didi** |
| 27 | Gastos de promo subsidiados por DiDi | Descuento que Didi paga |
| 28 | Gastos de promo pagados por la tienda | **Descuento que paga la tienda** |
| 29 | Total de recompensas de la plataforma | Bonificación Didi |

### Cálculo de ingreso neto Didi:

```
Ingreso Neto = Precio Original 
             - Gastos de promo pagados por tienda
             - (Tarifa de entrega si aplica)
             + Total de recompensas
```

**Ejemplo fila 2:**
- Precio original: $187.40
- Promo tienda: $41.28
- Recompensas: $21.42
- **Ingreso neto: $187.40 - $41.28 + $21.42 = $167.54**

---

## Uber Eats Report

**Archivo:** `jun 2026_Chilaquiles Baja (Campo Bello).pdf`

### Estructura:
- **Total páginas:** 6
- **Página 1:** Resumen consolidado mensual
- **Páginas 2+:** Detalles por período de pago

### Datos en RESUMEN MENSUAL (Página 1):

| Concepto | Valor | Significado |
|----------|-------|------------|
| Ventas (X Pedidos) | $17,167.00 | **Ingresos brutos** |
| Propinas | $0.00 | Propinas recibidas |
| Tasas de servicio | -$5,377.38 | **Comisión Uber** |
| Gastos por servicios de marketing | -$2,096.11 | **Ofertas/Promociones** |
| Ajustes | -$1,368.39 | Otros ajustes |
| **Total neto** | **$8,325.12** | **Lo que entra realmente** |

### Cálculo de ingreso neto Uber:

```
Ingreso Neto = Ventas 
             - Tasas de servicio (comisiones)
             - Gastos de marketing (ofertas)
             - Ajustes
```

**Ejemplo del reporte:**
- Ingresos: $17,167.00
- Comisiones: -$5,377.38
- Ofertas/Marketing: -$2,096.11
- Ajustes: -$1,368.39
- **Ingreso neto: $8,325.12** ✓

---

## Automación para el sistema:

El parser debe:

1. **Detectar Didi:** Si el archivo contiene columnas como "Gastos de promo" y "recompensas"
2. **Sumar por período:**
   - Ingresos brutos = SUM(Precio original)
   - Comisiones = SUM(Tarifa de entrega)
   - Promociones = SUM(Gastos de promo pagados por tienda)
   - Dinero neto = SUM(Precio original) - SUM(Gastos promo) + SUM(Recompensas)

3. **Extraer fechas:** De la columna "Fecha" (formato YYYYMMDD)

---

## Próximos pasos:

1. Analizar PDF de Uber Eats
2. Actualizar parser con estas columnas específicas
3. Hacer que detecte automáticamente el formato
