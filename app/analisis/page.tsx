'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import {
  VentasChart,
  IngresosGastosChart,
  GastosPorCategoriaChart,
  MargenChart,
  ComisionesChart,
  TopInsumosChart,
} from '@/components/Charts';
import { supabase } from '@/lib/supabase';
import { obtenerGastosMes } from '@/lib/gastos';

export default function AnalisisPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [gastos, setGastos] = useState<any[]>([]);
  const [mes, setMes] = useState(new Date().toISOString().split('T')[0].slice(0, 7));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) loadData();
  }, [mes, user]);

  async function checkAuth() {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      router.push('/login');
      return;
    }
    setUser(data.session.user);
  }

  async function loadData() {
    try {
      setLoading(true);
      const data = await obtenerGastosMes(mes);
      setGastos(data || []);
    } catch (err) {
      console.error('Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  }

  if (!user || loading) return null;

  // Procesamiento de datos
  const ventasFisica = gastos
    .filter((g) => g.tipo === 'venta_fisica')
    .reduce((sum, g) => sum + g.monto, 0);

  const ventasPlataforma = gastos
    .filter((g) => g.tipo === 'venta_plataforma')
    .reduce((sum, g) => sum + g.monto, 0);

  const gastosFijos = gastos
    .filter((g) => g.tipo === 'fijo')
    .reduce((sum, g) => sum + g.monto, 0);

  const gastosVariables = gastos
    .filter((g) => g.tipo === 'variable')
    .reduce((sum, g) => sum + g.monto, 0);

  const totalVentas = ventasFisica + ventasPlataforma;
  const totalGastos = gastosFijos + gastosVariables;
  const utilidad = totalVentas - totalGastos;
  const margen = totalVentas > 0 ? (utilidad / totalVentas) * 100 : 0;

  // Gráfica 1: Ingresos vs Gastos
  const ingresosGastosData = [
    {
      periodo: 'Este mes',
      ingresos: totalVentas,
      gastos: totalGastos,
      utilidad: Math.max(0, utilidad),
    },
  ];

  // Gráfica 2: Gastos por categoría
  const gastosPorCategoriaData = [
    { nombre: 'Fijos', valor: gastosFijos },
    { nombre: 'Variables', valor: gastosVariables },
  ].filter((d) => d.valor > 0);

  // Gráfica 3: Top insumos
  const insumosMap: { [key: string]: number } = {};
  gastos
    .filter((g) => g.tipo === 'variable')
    .forEach((g) => {
      insumosMap[g.concepto] = (insumosMap[g.concepto] || 0) + g.monto;
    });

  const topInsumosData = Object.entries(insumosMap)
    .map(([insumo, monto]) => ({ insumo, monto }))
    .sort((a, b) => b.monto - a.monto)
    .slice(0, 5);

  // Gráfica 4: Comisiones por plataforma
  const comisionesData = [
    {
      plataforma: 'Física',
      comision: totalVentas > 0 ? ((ventasFisica - ventasPlataforma) / totalVentas) * 100 : 0,
    },
    {
      plataforma: 'Plataformas',
      comision: ventasPlataforma > 0 ? (gastosFijos / ventasPlataforma) * 100 : 0,
    },
  ];

  const mesFormato = new Date(`${mes}-01`).toLocaleDateString('es-MX', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">📊 Análisis Financiero</h1>

          {/* Selector de mes */}
          <div className="flex items-center gap-4 mb-6">
            <label className="text-sm font-medium text-gray-700">Mes:</label>
            <input
              type="month"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-sm text-gray-600">Visualizando: {mesFormato}</p>
          </div>
        </div>

        {/* KPIs principales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">Ingresos totales</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              ${totalVentas.toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">Gastos totales</p>
            <p className="text-3xl font-bold text-red-600 mt-2">
              ${totalGastos.toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">Utilidad neta</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              ${utilidad.toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">Margen</p>
            <p className="text-3xl font-bold text-purple-600 mt-2">
              {margen.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Gráficas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Ingresos vs Gastos */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Ingresos vs Gastos</h2>
            <IngresosGastosChart data={ingresosGastosData} />
          </div>

          {/* Gastos por categoría */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Distribución de gastos</h2>
            {gastosPorCategoriaData.length > 0 ? (
              <GastosPorCategoriaChart data={gastosPorCategoriaData} />
            ) : (
              <p className="text-gray-600 text-center py-8">Sin datos</p>
            )}
          </div>

          {/* Top insumos */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Top 5 insumos más caros</h2>
            {topInsumosData.length > 0 ? (
              <TopInsumosChart data={topInsumosData} />
            ) : (
              <p className="text-gray-600 text-center py-8">Sin datos</p>
            )}
          </div>

          {/* Margen operativo */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Margen operativo</h2>
            <MargenChart
              data={[
                {
                  fecha: mesFormato,
                  margen: margen,
                },
              ]}
            />
          </div>
        </div>

        {/* Tabla de resumen */}
        <div className="bg-white rounded-lg shadow p-6 mt-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Resumen detallado</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-gray-900">Concepto</th>
                  <th className="px-6 py-3 text-right font-semibold text-gray-900">Monto</th>
                  <th className="px-6 py-3 text-right font-semibold text-gray-900">% Ingresos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr className="bg-green-50">
                  <td className="px-6 py-3 font-semibold text-gray-900">Ventas físicas</td>
                  <td className="px-6 py-3 text-right font-semibold text-green-600">
                    ${ventasFisica.toLocaleString()}
                  </td>
                  <td className="px-6 py-3 text-right text-green-600">
                    {totalVentas > 0 ? ((ventasFisica / totalVentas) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
                <tr className="bg-green-50">
                  <td className="px-6 py-3 font-semibold text-gray-900">Ventas plataformas</td>
                  <td className="px-6 py-3 text-right font-semibold text-green-600">
                    ${ventasPlataforma.toLocaleString()}
                  </td>
                  <td className="px-6 py-3 text-right text-green-600">
                    {totalVentas > 0 ? ((ventasPlataforma / totalVentas) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-3 font-semibold text-gray-900">Gastos fijos</td>
                  <td className="px-6 py-3 text-right font-semibold text-red-600">
                    -${gastosFijos.toLocaleString()}
                  </td>
                  <td className="px-6 py-3 text-right text-red-600">
                    {totalVentas > 0 ? ((gastosFijos / totalVentas) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-3 font-semibold text-gray-900">Gastos variables</td>
                  <td className="px-6 py-3 text-right font-semibold text-red-600">
                    -${gastosVariables.toLocaleString()}
                  </td>
                  <td className="px-6 py-3 text-right text-red-600">
                    {totalVentas > 0 ? ((gastosVariables / totalVentas) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
                <tr className="bg-blue-50 font-bold">
                  <td className="px-6 py-3 text-gray-900">UTILIDAD NETA</td>
                  <td className="px-6 py-3 text-right text-blue-600">
                    ${utilidad.toLocaleString()}
                  </td>
                  <td className="px-6 py-3 text-right text-blue-600">
                    {margen.toFixed(1)}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
