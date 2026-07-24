'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';

interface InventarioItem {
  id: string;
  nombre: string;
  cantidad: number;
  unidad: string;
  precio_promedio: number;
  updated_at: string;
}

export default function InventarioPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [inventario, setInventario] = useState<InventarioItem[]>([]);
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
      loadInventario();
    } catch (err: any) {
      setError('Error al verificar autenticación');
    }
  }

  async function loadInventario() {
    try {
      const { data, error: queryError } = await supabase
        .from('inventario')
        .select('*')
        .order('nombre');

      if (queryError) {
        throw queryError;
      }

      setInventario(data || []);
    } catch (err: any) {
      console.error('Error:', err);
      setError(
        err.message || 'Error al cargar inventario. Asegúrate de ejecutar el SQL.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este insumo?')) return;

    try {
      const { error: deleteError } = await supabase
        .from('inventario')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setInventario(inventario.filter((item) => item.id !== id));
    } catch (err: any) {
      alert('Error al eliminar: ' + err.message);
    }
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-6xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inventario</h1>
            <p className="text-gray-600 mt-2">Gestión de insumos</p>
          </div>
          <Link
            href="/inventario/agregar"
            className="bg-blue-900 text-white px-6 py-2 rounded-lg hover:bg-blue-800 transition font-semibold"
          >
            ➕ Agregar insumo
          </Link>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">
            <p className="font-semibold">Error:</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="p-8 text-center text-gray-600">Cargando...</div>
          ) : inventario.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-600 mb-4">No hay insumos registrados</p>
              <Link
                href="/inventario/agregar"
                className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Agregar el primero
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Insumo
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Cantidad
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Precio promedio
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {inventario.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50 transition"
                    >
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900">
                          {item.nombre}
                        </p>
                        <p className="text-sm text-gray-600">
                          Actualizado:{' '}
                          {new Date(item.updated_at).toLocaleDateString(
                            'es-MX'
                          )}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold">
                          {item.cantidad} {item.unidad}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        ${item.precio_promedio?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-6 py-4">
                        ${(
                          (item.cantidad || 0) * (item.precio_promedio || 0)
                        ).toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-semibold"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
