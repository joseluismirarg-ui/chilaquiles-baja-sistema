'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';
import { obtenerNotas, agregarNota, eliminarNota } from '@/lib/notas';
import { Nota } from '@/lib/types';

export default function NotasPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [notas, setNotas] = useState<Nota[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form
  const [contenido, setContenido] = useState('');
  const [tipo, setTipo] = useState<'general' | 'insumos_faltantes' | 'urgente'>('general');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      router.push('/login');
      return;
    }
    setUser(data.session.user);
    loadNotas();
  }

  async function loadNotas() {
    try {
      const data = await obtenerNotas(30);
      setNotas(data);
    } catch (err: any) {
      setError('Error al cargar notas');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (!contenido.trim()) throw new Error('Escribe una nota');

      await agregarNota(contenido, tipo, fecha);

      setContenido('');
      setTipo('general');
      setFecha(new Date().toISOString().split('T')[0]);
      await loadNotas();
    } catch (err: any) {
      setError(err.message || 'Error al guardar nota');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(notaId: string) {
    if (!confirm('¿Eliminar esta nota?')) return;

    try {
      await eliminarNota(notaId);
      await loadNotas();
    } catch (err) {
      alert('Error al eliminar nota');
    }
  }

  if (!user) return null;

  const tipoColors = {
    general: 'bg-blue-50 border-blue-200',
    insumos_faltantes: 'bg-orange-50 border-orange-200',
    urgente: 'bg-red-50 border-red-200',
  };

  const tipoIcons = {
    general: '📝',
    insumos_faltantes: '📦',
    urgente: '⚠️',
  };

  const tipoLabels = {
    general: 'General',
    insumos_faltantes: 'Insumos faltantes',
    urgente: 'Urgente',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">📝 Notas compartidas</h1>

        {/* FORMULARIO */}
        <div className="bg-white rounded-lg shadow p-8 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Nueva nota</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-100 text-red-700 p-4 rounded-lg">
                {error}
              </div>
            )}

            {/* TIPO */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de nota
              </label>
              <select
                value={tipo}
                onChange={(e) =>
                  setTipo(e.target.value as 'general' | 'insumos_faltantes' | 'urgente')
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="general">📝 General</option>
                <option value="insumos_faltantes">📦 Insumos faltantes</option>
                <option value="urgente">⚠️ Urgente</option>
              </select>
            </div>

            {/* FECHA */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* CONTENIDO */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nota
              </label>
              <textarea
                value={contenido}
                onChange={(e) => setContenido(e.target.value)}
                placeholder="Escribe tu nota aquí..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                rows={4}
              />
            </div>

            {/* BOTÓN */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full px-6 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:bg-gray-400 transition font-semibold"
            >
              {submitting ? 'Guardando...' : 'Guardar nota'}
            </button>
          </form>
        </div>

        {/* LISTA DE NOTAS */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Últimas notas</h2>

          {loading ? (
            <div className="text-center text-gray-600 py-8">Cargando...</div>
          ) : notas.length === 0 ? (
            <div className="text-center text-gray-600 py-8">
              No hay notas aún. ¡Sé el primero en escribir!
            </div>
          ) : (
            notas.map((nota) => (
              <div
                key={nota.id}
                className={`border-l-4 rounded-lg p-6 ${tipoColors[nota.tipo]}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">
                      {tipoIcons[nota.tipo]}
                    </span>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {tipoLabels[nota.tipo]}
                      </p>
                      <p className="text-sm text-gray-600">
                        👤 {nota.autor_email.split('@')[0]} • 📅 {nota.fecha_nota}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(nota.id)}
                    className="text-red-600 hover:text-red-800 text-sm font-semibold"
                  >
                    Eliminar
                  </button>
                </div>
                <p className="text-gray-900 whitespace-pre-wrap">{nota.contenido}</p>
                <p className="text-xs text-gray-500 mt-3">
                  Escrito: {new Date(nota.created_at).toLocaleString('es-MX')}
                </p>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
