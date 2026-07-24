import type { BalanceGeneral, EstadoResultados, FlujoCaja } from './reportes';

export function generarPDFBalance(
  balance: BalanceGeneral,
  periodo: string
): string {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Balance General - ${periodo}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .section { margin-bottom: 30px; }
        .section h3 { background-color: #f0f0f0; padding: 10px; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #e0e0e0; font-weight: bold; }
        .total-row { font-weight: bold; background-color: #f9f9f9; }
        .amount { text-align: right; font-family: monospace; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Chilaquiles Baja</h1>
        <h2>Balance General</h2>
        <p>Período: ${periodo}</p>
      </div>

      <div class="section">
        <h3>ACTIVOS</h3>
        <table>
          <tr>
            <td>Efectivo disponible</td>
            <td class="amount">$${(balance.activos.efectivo || 0).toLocaleString()}</td>
          </tr>
          <tr>
            <td>Inventario</td>
            <td class="amount">$${(balance.activos.inventario || 0).toLocaleString()}</td>
          </tr>
          <tr>
            <td>Bancos</td>
            <td class="amount">$${(balance.activos.bancos || 0).toLocaleString()}</td>
          </tr>
          <tr class="total-row">
            <td>TOTAL ACTIVOS</td>
            <td class="amount">$${(balance.activos.total || 0).toLocaleString()}</td>
          </tr>
        </table>
      </div>

      <div class="section">
        <h3>PASIVOS</h3>
        <table>
          <tr>
            <td>Deudas</td>
            <td class="amount">$${(balance.pasivos.deudas || 0).toLocaleString()}</td>
          </tr>
          <tr>
            <td>Comisiones pendientes</td>
            <td class="amount">$${(balance.pasivos.comisiones_pendientes || 0).toLocaleString()}</td>
          </tr>
          <tr class="total-row">
            <td>TOTAL PASIVOS</td>
            <td class="amount">$${(balance.pasivos.total || 0).toLocaleString()}</td>
          </tr>
        </table>
      </div>

      <div class="section">
        <h3>PATRIMONIO</h3>
        <table>
          <tr>
            <td>Capital</td>
            <td class="amount">$${(balance.patrimonio.capital || 0).toLocaleString()}</td>
          </tr>
          <tr>
            <td>Utilidades acumuladas</td>
            <td class="amount">$${(balance.patrimonio.utilidades_acumuladas || 0).toLocaleString()}</td>
          </tr>
          <tr class="total-row">
            <td>TOTAL PATRIMONIO</td>
            <td class="amount">$${(balance.patrimonio.total || 0).toLocaleString()}</td>
          </tr>
        </table>
      </div>

      <div class="section">
        <p><strong>Ecuación contable:</strong> Activos = Pasivos + Patrimonio</p>
        <p>$${(balance.activos.total || 0).toLocaleString()} = $${((balance.pasivos.total || 0) + (balance.patrimonio.total || 0)).toLocaleString()}</p>
      </div>
    </body>
    </html>
  `;

  return html;
}

export function generarPDFEstadoResultados(
  resultados: EstadoResultados,
): string {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Estado de Resultados - ${resultados.periodo}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .section { margin-bottom: 30px; }
        .section h3 { background-color: #f0f0f0; padding: 10px; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #e0e0e0; font-weight: bold; }
        .total-row { font-weight: bold; background-color: #f9f9f9; }
        .amount { text-align: right; font-family: monospace; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Chilaquiles Baja</h1>
        <h2>Estado de Resultados</h2>
        <p>Período: ${resultados.periodo}</p>
      </div>

      <div class="section">
        <h3>INGRESOS</h3>
        <table>
          <tr>
            <td>Ventas físicas</td>
            <td class="amount">$${(resultados.ingresos.ventas_fisicas || 0).toLocaleString()}</td>
          </tr>
          <tr>
            <td>Ventas plataformas (Uber/Didi)</td>
            <td class="amount">$${(resultados.ingresos.ventas_plataformas || 0).toLocaleString()}</td>
          </tr>
          <tr>
            <td>Otros ingresos</td>
            <td class="amount">$${(resultados.ingresos.otros || 0).toLocaleString()}</td>
          </tr>
          <tr class="total-row">
            <td>TOTAL INGRESOS</td>
            <td class="amount">$${(resultados.ingresos.total || 0).toLocaleString()}</td>
          </tr>
        </table>
      </div>

      <div class="section">
        <h3>GASTOS</h3>
        <table>
          <tr>
            <td>Gastos variables (insumos)</td>
            <td class="amount">-$${(resultados.gastos.variables || 0).toLocaleString()}</td>
          </tr>
          <tr>
            <td>Gastos fijos (renta, servicios)</td>
            <td class="amount">-$${(resultados.gastos.fijos || 0).toLocaleString()}</td>
          </tr>
          <tr class="total-row">
            <td>TOTAL GASTOS</td>
            <td class="amount">-$${(resultados.gastos.total || 0).toLocaleString()}</td>
          </tr>
        </table>
      </div>

      <div class="section">
        <table>
          <tr class="total-row" style="background-color: #e8f4f8;">
            <td style="font-size: 16px;">UTILIDAD OPERATIVA</td>
            <td class="amount" style="font-size: 16px;">$${(resultados.utilidad_operativa || 0).toLocaleString()}</td>
          </tr>
          <tr class="total-row" style="background-color: #e8f4f8;">
            <td style="font-size: 16px;">MARGEN OPERATIVO</td>
            <td class="amount" style="font-size: 16px;">${(resultados.margen_operativo || 0).toFixed(1)}%</td>
          </tr>
        </table>
      </div>
    </body>
    </html>
  `;

  return html;
}

export function descargarPDF(html: string, nombreArchivo: string) {
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${nombreArchivo}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function generarCSVBalance(balance: BalanceGeneral, periodo: string): string {
  let csv = 'Chilaquiles Baja - Balance General\n';
  csv += `Período,${periodo}\n\n`;

  csv += 'ACTIVOS\n';
  csv += 'Concepto,Monto\n';
  csv += `Efectivo disponible,$${balance.activos.efectivo}\n`;
  csv += `Inventario,$${balance.activos.inventario}\n`;
  csv += `Bancos,$${balance.activos.bancos}\n`;
  csv += `TOTAL ACTIVOS,$${balance.activos.total}\n\n`;

  csv += 'PASIVOS\n';
  csv += 'Concepto,Monto\n';
  csv += `Deudas,$${balance.pasivos.deudas}\n`;
  csv += `Comisiones pendientes,$${balance.pasivos.comisiones_pendientes}\n`;
  csv += `TOTAL PASIVOS,$${balance.pasivos.total}\n\n`;

  csv += 'PATRIMONIO\n';
  csv += 'Concepto,Monto\n';
  csv += `Capital,$${balance.patrimonio.capital}\n`;
  csv += `Utilidades acumuladas,$${balance.patrimonio.utilidades_acumuladas}\n`;
  csv += `TOTAL PATRIMONIO,$${balance.patrimonio.total}\n`;

  return csv;
}

export function descargarCSV(csv: string, nombreArchivo: string) {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${nombreArchivo}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
