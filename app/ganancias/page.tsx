'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';

export default function GananciasPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [ganancias, setGanancias] = useState<any[]>([]);
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
      loadGanancias();
    } catch (err: any) {
      setError('Error al verificar autenticación');
    }
  }

  async function loadGanancias() {
    try {
      const mesActual = new Date().toISOString().split('T')[0].slice(0, 7);
      const [año, mes] = mesActual.split('-');
      const inicio = `${año}-${mes}-01`;
      const fin = `${año}-${mes}-31`;

      const { data, error: queryError } = await supabase
        .from('gastos')
        .select('*')
        .eq('tipo', 'ganancia_manual')
        .gte('fecha', inicio)
        .lte('fecha', fin)
        .order('fecha', { ascending: false });

      if (queryError && !queryError.message.includes('does not exist')) {
        throw queryError;
      }

      setGanancias(data || []);
    } catch (err: any) {
      console.error('Error:', err);
      // Si no existe la columna o tabla, seguir sin error
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta ganancia?')) return;

    try {
      const { error: deleteError } = await supabase
        .from('gastos')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setGanancias(ganancias.filter((g) => g.id !== id));
    } catch (err: any) {
      alert('Error al eliminar: ' + err.message);
    }
  }

  if (!user) return null;

  const mesActual = new Date().toLocaleDateString('es-MX', {
    month: 'long',
    year: 'numeric',
  });

  const totalGanancias = ganancias.reduce((sum, g) => sum + g.monto, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-6xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Ganancias</h1>
            <p className="text-gray-600 mt-2">{mesActual}</p>
          </div>
          <Link
            href="/ganancias/registrar"
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition font-semibold"
          >
            ➕ Registrar ganancia
          </Link>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">
            <p className="font-semibold">Error:</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {/* TOTAL */}
        <div className="bg-green-50 border border-green-200 rounded-lg shadow p-6 mb-8">
          <p className="text-sm font-medium text-green-700">Total ganancias este mes</p>
          <p className="text-4xl font-bold text-green-600 mt-2">
            ${totalGanancias.toLocaleString()}
          </p>
        </div>

        {/* LISTA */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Ingresos registrados</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-600">Cargando...</div>
          ) : ganancias.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-600 mb-4">No hay ganancias registradas</p>
              <Link
                href="/ganancias/registrar"
                className="inline-block bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                Registrar la primera
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {ganancias.map((ganancia) => (
                <div
                  key={ganancia.id}
                  className="p-6 flex justify-between items-center hover:bg-gray-50 transition"
                >
                  <div>
                    <p className="font-semibold text-gray-900">
                      {ganancia.concepto}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {ganancia.fecha}
                    </p>
                    {ganancia.notas && (
                      <p className="text-xs text-gray-500 mt-1">
                        📝 {ganancia.notas}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-lg font-bold text-green-600">
                      +${ganancia.monto.toLocaleString()}
                    </p>
                    <button
                      onClick={() => handleDelete(ganancia.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-semibold"
                    >
                      Eliminar
                    </button>
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
