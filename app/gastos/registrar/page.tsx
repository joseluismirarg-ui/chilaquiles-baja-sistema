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
  const [cantidad, setCantidad] = useState('');
  const [unidad, setUnidad] = useState('kg');
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
      if (!concepto.trim()) throw new Error('Debes indicar qué es el gasto');
      if (!monto || parseFloat(monto) <= 0) throw new Error('El monto debe ser mayor a 0');

      const gastoData = {
        tipo: tipo as any,
        concepto: concepto.trim(),
        monto: parseFloat(monto),
        socio_id: user.id,
        proveedor_id: proveedor || undefined,
        fecha: new Date().toISOString().split('T')[0],
        notas: notas || undefined,
      };

      console.log('Registrando gasto:', gastoData);

      const result = await registrarGasto(gastoData);

      if (!result) {
        throw new Error('No se pudo guardar el gasto');
      }

      // Si es variable, agregar al inventario
      if (tipo === 'variable' && cantidad) {
        try {
          const cantidadNum = parseFloat(cantidad);
          const montoNum = parseFloat(monto);
          if (cantidadNum > 0) {
            // Obtener insumo si existe
            const { data: insumoExistente } = await supabase
              .from('inventario')
              .select('*')
              .ilike('nombre', concepto)
              .single();

            if (insumoExistente) {
              // Actualizar cantidad existente
              await supabase
                .from('inventario')
                .update({
                  cantidad: insumoExistente.cantidad + cantidadNum,
                  precio_promedio: montoNum / cantidadNum,
                })
                .eq('id', insumoExistente.id);
            } else {
              // Crear nuevo insumo
              await supabase.from('inventario').insert([
                {
                  nombre: concepto,
                  cantidad: cantidadNum,
                  unidad,
                  precio_promedio: montoNum / cantidadNum,
                },
              ]);
            }
          }
        } catch (inventarioErr) {
          console.error('Error agregando al inventario:', inventarioErr);
        }
      }

      // Limpiar y redirigir
      setConcepto('');
      setMonto('');
      setCantidad('');
      setNotas('');
      router.push('/gastos');
    } catch (err: any) {
      console.error('Error completo:', err);

      let mensaje = err.message || 'Error al registrar gasto';

      // Errores comunes de Supabase
      if (err.code === 'PGRST116') {
        mensaje = '❌ Las tablas no existen en Supabase. Ejecuta SETUP_SUPABASE_SQL.sql primero';
      } else if (err.code === '42P01') {
        mensaje = '❌ Tabla no encontrada. Ejecuta el SQL de setup en Supabase';
      } else if (err.message?.includes('permission denied')) {
        mensaje = '❌ Permiso denegado. Revisa las políticas RLS en Supabase';
      } else if (err.message?.includes('relation')) {
        mensaje = '❌ La tabla no existe. Ejecuta SETUP_SUPABASE_SQL.sql en Supabase';
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

            {/* CANTIDAD Y UNIDAD (solo variables) */}
            {tipo === 'variable' && (
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
            )}

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
