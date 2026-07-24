'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';
import { obtenerGastosMes } from '@/lib/gastos';
import { Gasto } from '@/lib/types';

export default function GastosPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push('/login');
        return;
      }
      setUser(data.session.user);
      loadGastos();
    } catch (err: any) {
      console.error('Auth error:', err);
      setError('Error al verificar autenticación');
    }
  }

  async function loadGastos() {
    try {
      const mesActual = new Date().toISOString().split('T')[0].slice(0, 7);
      const data = await obtenerGastosMes(mesActual);
      setGastos(data || []);
    } catch (err: any) {
      console.error('Error cargando gastos:', err);
      setError('Error al cargar gastos. Asegúrate de haber creado las tablas en Supabase.');
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  const mesActual = new Date().toLocaleDateString('es-MX', {
    month: 'long',
    year: 'numeric',
  });

  const totales = {
    fijos: gastos
      .filter((g) => g.tipo === 'fijo')
      .reduce((sum, g) => sum + g.monto, 0),
    variables: gastos
      .filter((g) => g.tipo === 'variable')
      .reduce((sum, g) => sum + g.monto, 0),
    ventasFisica: gastos
      .filter((g) => g.tipo === 'venta_fisica')
      .reduce((sum, g) => sum + g.monto, 0),
    ventasPlataforma: gastos
      .filter((g) => g.tipo === 'venta_plataforma')
      .reduce((sum, g) => sum + g.monto, 0),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-6xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gastos</h1>
            <p className="text-gray-600 mt-2">{mesActual}</p>
          </div>
          <Link
            href="/gastos/registrar"
            className="bg-blue-900 text-white px-6 py-2 rounded-lg hover:bg-blue-800 transition font-semibold"
          >
            ➕ Nuevo gasto
          </Link>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">
            <p className="font-semibold">Error:</p>
            <p className="text-sm mt-1">{error}</p>
            <p className="text-xs mt-2">
              📝 Si es tu primer uso, ejecuta el SQL de SETUP_SUPABASE_SQL.sql en Supabase
            </p>
          </div>
        )}

        {/* RESUMEN */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">Fijos</p>
            <p className="text-2xl font-bold text-red-600 mt-2">
              ${totales.fijos.toLocaleString()}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">Variables</p>
            <p className="text-2xl font-bold text-red-600 mt-2">
              ${totales.variables.toLocaleString()}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">Ventas físicas</p>
            <p className="text-2xl font-bold text-green-600 mt-2">
              ${totales.ventasFisica.toLocaleString()}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">Plataformas</p>
            <p className="text-2xl font-bold text-green-600 mt-2">
              ${totales.ventasPlataforma.toLocaleString()}
            </p>
          </div>
        </div>

        {/* LISTA DE GASTOS */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Transacciones</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-600">Cargando...</div>
          ) : gastos.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-600 mb-4">No hay gastos registrados</p>
              <Link
                href="/gastos/registrar"
                className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Registrar el primero
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {gastos.map((gasto) => (
                <div
                  key={gasto.id}
                  className="p-6 flex justify-between items-center hover:bg-gray-50 transition"
                >
                  <div>
                    <p className="font-semibold text-gray-900">{gasto.concepto}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {gasto.tipo.replace(/_/g, ' ')} • {gasto.fecha}
                    </p>
                    {gasto.notas && (
                      <p className="text-xs text-gray-500 mt-1">📝 {gasto.notas}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-lg font-bold ${
                        gasto.tipo.includes('venta')
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {gasto.tipo.includes('venta') ? '+' : '-'}$
                      {gasto.monto.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
