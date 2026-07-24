'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Logo from '@/components/Logo';
import { supabase } from '@/lib/supabase';
import { obtenerTotalesGastos } from '@/lib/gastos';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [totales, setTotales] = useState({
    fijos: 0,
    variables: 0,
    ventasFisica: 0,
    ventasPlataforma: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    loadData();
  }, []);

  async function checkAuth() {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      router.push('/login');
    } else {
      setUser(data.session.user);
    }
  }

  async function loadData() {
    try {
      const mesActual = new Date().toISOString().split('T')[0].slice(0, 7);
      const datos = await obtenerTotalesGastos(mesActual);
      setTotales(datos);
    } catch (err) {
      console.error('Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  const ventasTotales = totales.ventasFisica + totales.ventasPlataforma;
  const gastosTotales = totales.fijos + totales.variables;
  const utilidadNeta = ventasTotales - gastosTotales;
  const margen = ventasTotales > 0 ? (utilidadNeta / ventasTotales * 100).toFixed(1) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-6xl mx-auto p-6">
        {/* HEADER */}
        <div className="mb-8 flex items-center gap-6">
          <Logo size="lg" />
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Chilaquiles Baja</h1>
            <p className="text-gray-600 mt-2">
              {new Date().toLocaleDateString('es-MX', {
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>

        {/* MÉTRICAS PRINCIPALES */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">Ventas totales</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              ${ventasTotales.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">Física + Plataformas</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">Gastos</p>
            <p className="text-3xl font-bold text-red-600 mt-2">
              ${gastosTotales.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">Fijos + Variables</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">Utilidad neta</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              ${utilidadNeta.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">Después de gastos</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">Margen</p>
            <p className="text-3xl font-bold text-purple-600 mt-2">{margen}%</p>
            <p className="text-xs text-gray-500 mt-1">Rentabilidad</p>
          </div>
        </div>

        {/* ACCIONES RÁPIDAS */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Acciones rápidas</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <a
              href="/gastos/registrar"
              className="bg-red-600 text-white p-4 rounded-lg text-center hover:bg-red-700 transition"
            >
              <div className="text-2xl mb-2">➖</div>
              <div className="font-semibold text-sm">Gasto</div>
            </a>
            <a
              href="/ganancias/registrar"
              className="bg-green-600 text-white p-4 rounded-lg text-center hover:bg-green-700 transition"
            >
              <div className="text-2xl mb-2">➕</div>
              <div className="font-semibold text-sm">Ganancia</div>
            </a>
            <a
              href="/inventario/agregar"
              className="bg-purple-600 text-white p-4 rounded-lg text-center hover:bg-purple-700 transition"
            >
              <div className="text-2xl mb-2">📦</div>
              <div className="font-semibold text-sm">Insumo</div>
            </a>
            <a
              href="/reportes"
              className="bg-blue-600 text-white p-4 rounded-lg text-center hover:bg-blue-700 transition"
            >
              <div className="text-2xl mb-2">📊</div>
              <div className="font-semibold text-sm">Reportes</div>
            </a>
            <a
              href="/gastos"
              className="bg-gray-600 text-white p-4 rounded-lg text-center hover:bg-gray-700 transition"
            >
              <div className="text-2xl mb-2">📝</div>
              <div className="font-semibold text-sm">Historial</div>
            </a>
          </div>
        </div>

        {/* DESGLOSE DETALLADO */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Desglose de gastos</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-gray-700">Gastos fijos</span>
              <span className="font-semibold text-gray-900">
                ${totales.fijos.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-gray-700">Gastos variables</span>
              <span className="font-semibold text-gray-900">
                ${totales.variables.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded">
              <span className="text-gray-700">Ventas físicas</span>
              <span className="font-semibold text-green-700">
                ${totales.ventasFisica.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded">
              <span className="text-gray-700">Ventas plataformas</span>
              <span className="font-semibold text-green-700">
                ${totales.ventasPlataforma.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
