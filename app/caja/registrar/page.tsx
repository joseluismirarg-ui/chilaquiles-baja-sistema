'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';
import { registrarCierreCaja, obtenerCierreCaja } from '@/lib/caja';
import { obtenerGastosMes } from '@/lib/gastos';

export default function RegistrarCierrePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [apertura, setApertura] = useState('0');
  const [ventasFisicas, setVentasFisicas] = useState('0');
  const [ventasPlataforma, setVentasPlataforma] = useState('0');
  const [otrosIngresos, setOtrosIngresos] = useState('0');
  const [gastosVariables, setGastosVariables] = useState('0');
  const [gastosFijos, setGastosFijos] = useState('0');
  const [otrosEgresos, setOtrosEgresos] = useState('0');
  const [efectivoContado, setEfectivoContado] = useState('0');
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) loadData();
  }, [fecha, user]);

  async function checkAuth() {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      router.push('/login');
      return;
    }
    setUser(data.session.user);
    setLoading(false);
  }

  async function loadData() {
    try {
      // Obtener cierre anterior para saber la apertura
      const mesAnterior = new Date(fecha);
      mesAnterior.setDate(mesAnterior.getDate() - 1);
      const fechaAnterior = mesAnterior.toISOString().split('T')[0];

      const cierreAnterior = await obtenerCierreCaja(fechaAnterior);
      if (cierreAnterior) {
        setApertura(String(cierreAnterior.efectivo_contado || 0));
      }

      // Obtener gastos del día
      const { data: gastosDelDia } = await supabase
        .from('gastos')
        .select('*')
        .eq('fecha', fecha);

      const gastos = gastosDelDia || [];

      const vFisicas = gastos
        .filter((g) => g.tipo === 'venta_fisica')
        .reduce((sum, g) => sum + g.monto, 0);

      const vPlataforma = gastos
        .filter((g) => g.tipo === 'venta_plataforma')
        .reduce((sum, g) => sum + g.monto, 0);

      const gVariables = gastos
        .filter((g) => g.tipo === 'variable')
        .reduce((sum, g) => sum + g.monto, 0);

      const gFijos = gastos
        .filter((g) => g.tipo === 'fijo')
        .reduce((sum, g) => sum + g.monto, 0);

      setVentasFisicas(String(vFisicas));
      setVentasPlataforma(String(vPlataforma));
      setGastosVariables(String(gVariables));
      setGastosFijos(String(gFijos));
    } catch (err) {
      console.error('Error cargando datos:', err);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (!fecha) throw new Error('Selecciona una fecha');

      await registrarCierreCaja({
        fecha,
        apertura: parseFloat(apertura) || 0,
        ventas_fisicas: parseFloat(ventasFisicas) || 0,
        ventas_plataforma: parseFloat(ventasPlataforma) || 0,
        otros_ingresos: parseFloat(otrosIngresos) || 0,
        total_ingresos: 0,
        gastos_variables: parseFloat(gastosVariables) || 0,
        gastos_fijos: parseFloat(gastosFijos) || 0,
        otros_egresos: parseFloat(otrosEgresos) || 0,
        total_egresos: 0,
        saldo_teorico: 0,
        efectivo_contado: parseFloat(efectivoContado) || 0,
        diferencia: 0,
        notas,
        responsable_cierre: user?.email,
      });

      router.push('/caja');
    } catch (err: any) {
      setError(err.message || 'Error al registrar cierre');
    } finally {
      setSaving(false);
    }
  }

  if (!user || loading) return null;

  const totalIngresos = (parseFloat(ventasFisicas) || 0) + (parseFloat(ventasPlataforma) || 0) + (parseFloat(otrosIngresos) || 0);
  const totalEgresos = (parseFloat(gastosVariables) || 0) + (parseFloat(gastosFijos) || 0) + (parseFloat(otrosEgresos) || 0);
  const saldoTeorico = (parseFloat(apertura) || 0) + totalIngresos - totalEgresos;
  const diferencia = (parseFloat(efectivoContado) || 0) - saldoTeorico;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Cierre de Caja</h1>
        <p className="text-gray-600 mb-8">{fecha}</p>

        <div className="bg-white rounded-lg shadow p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="bg-red-100 text-red-700 p-4 rounded-lg">
                {error}
              </div>
            )}

            {/* APERTURA */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Saldo inicial (apertura)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-2xl text-gray-500">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={apertura}
                  onChange={(e) => setApertura(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* INGRESOS */}
            <div className="border-t-2 border-gray-200 pt-6">
              <h3 className="text-lg font-bold text-green-700 mb-4">Ingresos del día</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ventas físicas
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xl text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={ventasFisicas}
                      onChange={(e) => setVentasFisicas(e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                      readOnly
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Cargado automáticamente</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ventas plataformas (Uber/Didi)
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xl text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={ventasPlataforma}
                      onChange={(e) => setVentasPlataforma(e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                      readOnly
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Otros ingresos
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xl text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={otrosIngresos}
                      onChange={(e) => setOtrosIngresos(e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total ingresos</p>
                  <p className="text-2xl font-bold text-green-600">${totalIngresos.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* EGRESOS */}
            <div className="border-t-2 border-gray-200 pt-6">
              <h3 className="text-lg font-bold text-red-700 mb-4">Egresos del día</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gastos variables (insumos)
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xl text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={gastosVariables}
                      onChange={(e) => setGastosVariables(e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                      readOnly
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gastos fijos
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xl text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={gastosFijos}
                      onChange={(e) => setGastosFijos(e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                      readOnly
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Otros egresos
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xl text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={otrosEgresos}
                      onChange={(e) => setOtrosEgresos(e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Total egresos</p>
                  <p className="text-2xl font-bold text-red-600">${totalEgresos.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* ARQUEO */}
            <div className="border-t-2 border-gray-200 pt-6">
              <h3 className="text-lg font-bold text-blue-700 mb-4">Arqueo de caja</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Saldo teórico</p>
                  <p className="text-2xl font-bold text-blue-600">${saldoTeorico.toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Efectivo contado
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={efectivoContado}
                      onChange={(e) => setEfectivoContado(e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* DIFERENCIA */}
              <div className={`p-6 rounded-lg border-2 ${
                diferencia === 0
                  ? 'bg-green-50 border-green-300'
                  : Math.abs(diferencia) < 100
                    ? 'bg-yellow-50 border-yellow-300'
                    : 'bg-red-50 border-red-300'
              }`}>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">Diferencia</span>
                  <span className={`text-3xl font-bold ${
                    diferencia === 0
                      ? 'text-green-600'
                      : diferencia > 0
                        ? 'text-green-600'
                        : 'text-red-600'
                  }`}>
                    {diferencia > 0 ? '+' : ''}${diferencia.toLocaleString()}
                  </span>
                </div>
                {diferencia !== 0 && (
                  <p className="text-sm text-gray-700 mt-2">
                    {diferencia > 0
                      ? '✓ Sobra dinero en caja'
                      : '✗ Falta dinero en caja'}
                  </p>
                )}
              </div>
            </div>

            {/* NOTAS */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observaciones (opcional)
              </label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Detalles del cierre, discrepancias, etc..."
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
                disabled={saving}
                className="flex-1 px-6 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:bg-gray-400 transition font-semibold"
              >
                {saving ? 'Guardando...' : 'Registrar cierre'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
