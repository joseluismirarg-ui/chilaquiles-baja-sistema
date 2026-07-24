'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';
import { obtenerCierresCaja, obtenerResumenCaja } from '@/lib/caja';
import type { CierreCaja } from '@/lib/caja';

export default function CajaPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [mes, setMes] = useState(new Date().toISOString().split('T')[0].slice(0, 7));
  const [cierres, setCierres] = useState<any[]>([]);
  const [resumen, setResumen] = useState<any>(null);
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
      const [cierresData, resumenData] = await Promise.all([
        obtenerCierresCaja(mes),
        obtenerResumenCaja(mes),
      ]);
      setCierres(cierresData || []);
      setResumen(resumenData);
    } catch (err) {
      console.error('Error cargando caja:', err);
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
          <h1 className="text-4xl font-bold text-gray-900 mb-4">💰 Control de Caja</h1>

          <div className="flex items-center gap-4 mb-6">
            <label className="text-sm font-medium text-gray-700">Mes:</label>
            <input
              type="month"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-sm text-gray-600">Período: {mesFormato}</p>
            <button
              onClick={() => router.push('/caja/registrar')}
              className="ml-auto px-6 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition font-semibold"
            >
              + Cierre de hoy
            </button>
          </div>
        </div>

        {/* RESUMEN DEL MES */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">Cierres registrados</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">{resumen?.total_cierres || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">Total ingresos</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              ${(resumen?.total_ingresos || 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">Total egresos</p>
            <p className="text-3xl font-bold text-red-600 mt-2">
              ${(resumen?.total_egresos || 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">Discrepancias detectadas</p>
            <p className="text-3xl font-bold text-orange-600 mt-2">
              {resumen?.cierres_con_discrepancia || 0}
            </p>
          </div>
        </div>

        {/* TABLA DE CIERRES */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Cierres de caja registrados</h2>

          {cierres.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              <p>No hay cierres registrados para este mes</p>
              <button
                onClick={() => router.push('/caja/registrar')}
                className="mt-4 px-6 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800"
              >
                Registrar cierre
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-gray-900">Fecha</th>
                    <th className="px-6 py-3 text-right font-semibold text-gray-900">Ingresos</th>
                    <th className="px-6 py-3 text-right font-semibold text-gray-900">Egresos</th>
                    <th className="px-6 py-3 text-right font-semibold text-gray-900">Saldo Teórico</th>
                    <th className="px-6 py-3 text-right font-semibold text-gray-900">Efectivo Contado</th>
                    <th className="px-6 py-3 text-right font-semibold text-gray-900">Diferencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {cierres.map((cierre) => (
                    <tr
                      key={cierre.id}
                      className={
                        Math.abs(cierre.diferencia) > 100
                          ? 'bg-red-50'
                          : cierre.diferencia === 0
                            ? 'bg-green-50'
                            : 'bg-yellow-50'
                      }
                    >
                      <td className="px-6 py-3 font-semibold text-gray-900">{cierre.fecha}</td>
                      <td className="px-6 py-3 text-right text-green-600 font-semibold">
                        ${cierre.total_ingresos.toLocaleString()}
                      </td>
                      <td className="px-6 py-3 text-right text-red-600 font-semibold">
                        ${cierre.total_egresos.toLocaleString()}
                      </td>
                      <td className="px-6 py-3 text-right font-semibold">
                        ${cierre.saldo_teorico.toLocaleString()}
                      </td>
                      <td className="px-6 py-3 text-right font-semibold">
                        ${cierre.efectivo_contado.toLocaleString()}
                      </td>
                      <td className="px-6 py-3 text-right font-semibold">
                        <span
                          className={
                            cierre.diferencia === 0
                              ? 'text-green-600'
                              : cierre.diferencia > 0
                                ? 'text-green-600'
                                : 'text-red-600'
                          }
                        >
                          {cierre.diferencia > 0 ? '+' : ''}${cierre.diferencia.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ALERTAS DE DISCREPANCIAS */}
        {(resumen?.cierres_con_discrepancia || 0) > 0 && (
          <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-6">
            <h3 className="text-lg font-bold text-orange-700 mb-4">⚠️ Discrepancias detectadas</h3>
            <p className="text-gray-700">
              Se encontraron <strong>{resumen?.cierres_con_discrepancia}</strong> cierres con
              diferencia entre el efectivo contado y el saldo teórico. Revisa estos registros.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
