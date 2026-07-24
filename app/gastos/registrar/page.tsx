'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';
import { registrarGasto } from '@/lib/gastos';

export default function RegistrarGastoPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [tipo, setTipo] = useState('variable');
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('');
  const [proveedor, setProveedor] = useState('');
  const [notas, setNotas] = useState('');
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
      if (!user) throw new Error('Usuario no autenticado');

      await registrarGasto({
        tipo: tipo as any,
        concepto,
        monto: parseFloat(monto),
        socio_id: user.id,
        proveedor_id: proveedor || undefined,
        fecha: new Date().toISOString().split('T')[0],
        notas,
      });

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Error al registrar gasto');
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-2xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Registrar gasto</h1>
        <p className="text-gray-600 mb-8">Hoy - {user?.email}</p>

        <div className="bg-white rounded-lg shadow p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-100 text-red-700 p-4 rounded-lg">
                {error}
              </div>
            )}

            {/* TIPO DE GASTO */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de gasto
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="variable">Variable (insumos)</option>
                <option value="fijo">Fijo (renta, servicios)</option>
                <option value="venta_fisica">Venta (física)</option>
                <option value="venta_plataforma">Venta (plataforma)</option>
              </select>
            </div>

            {/* CONCEPTO */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ¿Qué es?
              </label>
              <input
                type="text"
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                placeholder="Ej: Tomates, Cebolla, Renta..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* MONTO */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monto
              </label>
              <div className="flex items-center gap-2">
                <span className="text-2xl text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* PROVEEDOR */}
            {tipo === 'variable' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Proveedor (opcional)
                </label>
                <input
                  type="text"
                  value={proveedor}
                  onChange={(e) => setProveedor(e.target.value)}
                  placeholder="Don Jorge, Mercado Central..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* NOTAS */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nota (opcional)
              </label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Kg, cantidad, detalles..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
              />
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
                {loading ? 'Guardando...' : 'Guardar gasto'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
