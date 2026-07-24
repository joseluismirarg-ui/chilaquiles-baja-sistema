'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';
import { obtenerBalanceGeneral, obtenerEstadoResultados, obtenerFlujoCaja } from '@/lib/reportes';
import type { BalanceGeneral, EstadoResultados, FlujoCaja } from '@/lib/reportes';

export default function BalancePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [mes, setMes] = useState(new Date().toISOString().split('T')[0].slice(0, 7));
  const [balance, setBalance] = useState<BalanceGeneral | null>(null);
  const [resultados, setResultados] = useState<EstadoResultados | null>(null);
  const [flujo, setFlujo] = useState<FlujoCaja | null>(null);
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
      const [balanceData, resultadosData, flujoData] = await Promise.all([
        obtenerBalanceGeneral(mes),
        obtenerEstadoResultados(mes),
        obtenerFlujoCaja(mes),
      ]);
      setBalance(balanceData);
      setResultados(resultadosData);
      setFlujo(flujoData);
    } catch (err) {
      console.error('Error cargando reportes:', err);
    } finally {
      setLoading(false);
    }
  }

  if (!user || loading) return null;

  const mesFormato = new Date(`${mes}-01`).toLocaleDateString('es-MX', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">📋 Reportes y Balance</h1>

          <div className="flex items-center gap-4 mb-6">
            <label className="text-sm font-medium text-gray-700">Mes:</label>
            <input
              type="month"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-sm text-gray-600">Período: {mesFormato}</p>
          </div>
        </div>

        {/* BALANCE GENERAL */}
        <div className="bg-white rounded-lg shadow p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Balance General</h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* ACTIVOS */}
            <div className="border-2 border-green-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-green-700 mb-4">Activos</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Efectivo disponible</span>
                  <span className="font-semibold">${(balance?.activos.efectivo || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Inventario</span>
                  <span className="font-semibold">${(balance?.activos.inventario || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Bancos</span>
                  <span className="font-semibold">${(balance?.activos.bancos || 0).toLocaleString()}</span>
                </div>
                <div className="border-t-2 border-green-200 pt-3 flex justify-between">
                  <span className="font-bold text-green-700">Total Activos</span>
                  <span className="font-bold text-green-700">
                    ${(balance?.activos.total || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* PASIVOS */}
            <div className="border-2 border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-red-700 mb-4">Pasivos</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Deudas</span>
                  <span className="font-semibold">${(balance?.pasivos.deudas || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Comisiones pendientes</span>
                  <span className="font-semibold">
                    ${(balance?.pasivos.comisiones_pendientes || 0).toLocaleString()}
                  </span>
                </div>
                <div className="border-t-2 border-red-200 pt-3 flex justify-between">
                  <span className="font-bold text-red-700">Total Pasivos</span>
                  <span className="font-bold text-red-700">
                    ${(balance?.pasivos.total || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* PATRIMONIO */}
            <div className="border-2 border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-blue-700 mb-4">Patrimonio</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Capital</span>
                  <span className="font-semibold">${(balance?.patrimonio.capital || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Utilidades acumuladas</span>
                  <span className="font-semibold">
                    ${(balance?.patrimonio.utilidades_acumuladas || 0).toLocaleString()}
                  </span>
                </div>
                <div className="border-t-2 border-blue-200 pt-3 flex justify-between">
                  <span className="font-bold text-blue-700">Total Patrimonio</span>
                  <span className="font-bold text-blue-700">
                    ${(balance?.patrimonio.total || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Ecuación contable */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">
              <span className="font-semibold">Ecuación contable:</span> Activos = Pasivos + Patrimonio
            </p>
            <p className="text-lg">
              ${(balance?.activos.total || 0).toLocaleString()} = $
              {((balance?.pasivos.total || 0) + (balance?.patrimonio.total || 0)).toLocaleString()}
            </p>
          </div>
        </div>

        {/* ESTADO DE RESULTADOS */}
        <div className="bg-white rounded-lg shadow p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Estado de Resultados</h2>
          <p className="text-sm text-gray-600 mb-6">Período: {resultados?.periodo}</p>

          <div className="space-y-6">
            {/* INGRESOS */}
            <div>
              <h3 className="font-bold text-green-700 mb-3">INGRESOS</h3>
              <div className="space-y-2 ml-4">
                <div className="flex justify-between text-sm">
                  <span>Ventas físicas</span>
                  <span>${(resultados?.ingresos.ventas_fisicas || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Ventas plataformas (Uber/Didi)</span>
                  <span>${(resultados?.ingresos.ventas_plataformas || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Otros ingresos</span>
                  <span>${(resultados?.ingresos.otros || 0).toLocaleString()}</span>
                </div>
                <div className="border-t border-gray-300 pt-2 flex justify-between font-bold">
                  <span>Total Ingresos</span>
                  <span className="text-green-700">${(resultados?.ingresos.total || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* GASTOS */}
            <div>
              <h3 className="font-bold text-red-700 mb-3">GASTOS</h3>
              <div className="space-y-2 ml-4">
                <div className="flex justify-between text-sm">
                  <span>Gastos variables (insumos)</span>
                  <span>${(resultados?.gastos.variables || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Gastos fijos (renta, servicios)</span>
                  <span>${(resultados?.gastos.fijos || 0).toLocaleString()}</span>
                </div>
                <div className="border-t border-gray-300 pt-2 flex justify-between font-bold">
                  <span>Total Gastos</span>
                  <span className="text-red-700">${(resultados?.gastos.total || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* UTILIDAD */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-bold text-lg">Utilidad Operativa</span>
                <span className="text-2xl font-bold text-blue-700">
                  ${(resultados?.utilidad_operativa || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="font-bold text-lg">Margen operativo</span>
                <span className="text-2xl font-bold text-blue-700">
                  {(resultados?.margen_operativo || 0).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* FLUJO DE CAJA */}
        <div className="bg-white rounded-lg shadow p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Flujo de Efectivo</h2>
          <p className="text-sm text-gray-600 mb-6">Período: {flujo?.periodo}</p>

          <div className="space-y-6">
            {/* APERTURA */}
            <div className="flex justify-between p-3 bg-gray-50 rounded">
              <span className="font-semibold">Saldo inicial</span>
              <span>${(flujo?.apertura || 0).toLocaleString()}</span>
            </div>

            {/* ENTRADAS */}
            <div>
              <h3 className="font-bold text-green-700 mb-3">ENTRADAS DE EFECTIVO</h3>
              <div className="space-y-2 ml-4">
                <div className="flex justify-between text-sm">
                  <span>Ventas física</span>
                  <span className="text-green-700">
                    +${(flujo?.entradas.ventas_fisicas || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Ventas plataformas</span>
                  <span className="text-green-700">
                    +${(flujo?.entradas.ventas_plataformas || 0).toLocaleString()}
                  </span>
                </div>
                <div className="border-t border-gray-300 pt-2 flex justify-between font-bold">
                  <span>Total entradas</span>
                  <span className="text-green-700">+${(flujo?.entradas.total || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* SALIDAS */}
            <div>
              <h3 className="font-bold text-red-700 mb-3">SALIDAS DE EFECTIVO</h3>
              <div className="space-y-2 ml-4">
                <div className="flex justify-between text-sm">
                  <span>Gastos variables</span>
                  <span className="text-red-700">
                    -${(flujo?.salidas.gastos_variables || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Gastos fijos</span>
                  <span className="text-red-700">
                    -${(flujo?.salidas.gastos_fijos || 0).toLocaleString()}
                  </span>
                </div>
                <div className="border-t border-gray-300 pt-2 flex justify-between font-bold">
                  <span>Total salidas</span>
                  <span className="text-red-700">-${(flujo?.salidas.total || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* CIERRE */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-bold text-lg">Saldo al cierre del período</span>
                <span className="text-2xl font-bold text-blue-700">
                  ${(flujo?.cierre || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
