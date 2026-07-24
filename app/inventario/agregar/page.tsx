'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';

export default function AgregarInsumoPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [nombre, setNombre] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [unidad, setUnidad] = useState('kg');
  const [precio, setPrecio] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.push('/login');
      } else {
        setUser(data.session.user);
      }
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!nombre.trim()) throw new Error('Debes ingresar el nombre del insumo');
      if (!cantidad || parseFloat(cantidad) <= 0)
        throw new Error('La cantidad debe ser mayor a 0');
      if (!unidad.trim()) throw new Error('Debes seleccionar una unidad');

      const { data, error: insertError } = await supabase
        .from('inventario')
        .insert([
          {
            nombre: nombre.trim(),
            cantidad: parseFloat(cantidad),
            unidad,
            precio_promedio: precio ? parseFloat(precio) : 0,
          },
        ])
        .select()
        .single();

      if (insertError) throw insertError;
      if (!data) throw new Error('No se pudo guardar el insumo');

      router.push('/inventario');
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Error al guardar insumo');
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-2xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Agregar insumo</h1>
        <p className="text-gray-600 mb-8">Al inventario de chilaquiles</p>

        <div className="bg-white rounded-lg shadow p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-100 text-red-700 p-4 rounded-lg">
                {error}
              </div>
            )}

            {/* NOMBRE */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del insumo
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Tomates, Cebolla, Queso..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* CANTIDAD */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cantidad
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unidad
                </label>
                <select
                  value={unidad}
                  onChange={(e) => setUnidad(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option>kg</option>
                  <option>lb</option>
                  <option>lt</option>
                  <option>ml</option>
                  <option>unidad</option>
                  <option>docena</option>
                  <option>piezas</option>
                </select>
              </div>
            </div>

            {/* PRECIO PROMEDIO */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Precio promedio (opcional)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-2xl text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-600 text-sm">por {unidad}</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                📝 Útil para calcular cuánto vale el inventario
              </p>
            </div>

            {/* BOTONES */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:bg-gray-400 transition font-semibold"
              >
                {loading ? 'Guardando...' : 'Guardar insumo'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
