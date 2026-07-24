'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';
import { registrarGasto } from '@/lib/gastos';

export default function RegistrarGananciaPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('');
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
      if (!concepto.trim()) throw new Error('Debes indicar de dónde viene la ganancia');
      if (!monto || parseFloat(monto) <= 0) throw new Error('El monto debe ser mayor a 0');

      await registrarGasto({
        tipo: 'ganancia_manual',
        concepto: concepto.trim(),
        monto: parseFloat(monto),
        socio_id: user.id,
        fecha: new Date().toISOString().split('T')[0],
        notas: notas || undefined,
      });

      router.push('/ganancias');
    } catch (err: any) {
      console.error('Error:', err);
      let mensaje = err.message || 'Error al registrar ganancia';

      if (err.message?.includes('CHECK constraint')) {
        mensaje =
          '⚠️ El tipo "ganancia_manual" no existe. Contacta a soporte.';
      }

      setError(mensaje);
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-2xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Registrar ganancia
        </h1>
        <p className="text-gray-600 mb-8">Ingreso manual - {user?.email}</p>

        <div className="bg-white rounded-lg shadow p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-100 text-red-700 p-4 rounded-lg">
                {error}
              </div>
            )}

            {/* CONCEPTO */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ¿De dónde viene?
              </label>
              <input
                type="text"
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                placeholder="Ej: Venta directa, Regalo, Devolución de dinero..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                📝 Describe el origen de la ganancia
              </p>
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

            {/* NOTAS */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nota (opcional)
              </label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Detalles adicionales..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
              />
            </div>

            {/* INFO */}
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <p className="text-sm text-blue-900">
                ℹ️ Esta ganancia se sumará al total de ingresos para calcular
                la utilidad neta.
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
                className="flex-1 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition font-semibold"
              >
                {loading ? 'Guardando...' : 'Registrar ganancia'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
