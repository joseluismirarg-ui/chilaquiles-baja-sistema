'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';
import { obtenerGastosMes, obtenerTotalesGastos } from '@/lib/gastos';
import { calcularUtilidades } from '@/lib/utilidades';
import { parsearReporte } from '@/lib/parsers';

export default function ReportesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [gastos, setGastos] = useState<any[]>([]);
  const [utilidades, setUtilidades] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      router.push('/login');
    } else {
      setUser(data.session.user);
      loadData(data.session.user.id);
    }
  }

  async function loadData(userId: string) {
    try {
      const mesActual = new Date().toISOString().split('T')[0].slice(0, 7);
      const gastosData = await obtenerGastosMes(mesActual);
      setGastos(gastosData);

      const calc = calcularUtilidades(gastosData, {});
      setUtilidades(calc);
    } catch (err) {
      console.error('Error cargando datos:', err);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      const reporte = await parsearReporte(file);
      if (!reporte) throw new Error('No se pudo leer el archivo');

      // Aquí registraríamos el reporte en Supabase
      // Por ahora solo mostramos los datos extraídos
      alert(`Reporte extraído:\n${reporte.plataforma}\n$${reporte.dineroNeto} neto`);
    } catch (err: any) {
      setError(err.message || 'Error al procesar archivo');
    } finally {
      setUploading(false);
    }
  }

  if (!user) return null;

  const mesActual = new Date().toLocaleDateString('es-MX', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-6xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Reportes</h1>
        <p className="text-gray-600 mb-8">{mesActual}</p>

        {/* CARGA DE REPORTES */}
        <div className="bg-white rounded-lg shadow p-8 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            📤 Subir reporte de plataforma
          </h2>

          {error && (
            <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">
              {error}
            </div>
          )}

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-500 transition cursor-pointer">
            <div className="text-4xl mb-4">📁</div>
            <p className="font-semibold text-gray-900 mb-2">
              Arrastra CSV o Excel aquí
            </p>
            <p className="text-gray-600 text-sm mb-6">
              De Uber Eats, Didi Food, etc.
            </p>
            <input
              type="file"
              onChange={handleFileUpload}
              disabled={uploading}
              accept=".csv,.xlsx,.xls"
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition cursor-pointer"
            >
              {uploading ? 'Procesando...' : 'Seleccionar archivo'}
            </label>
          </div>

          <p className="text-sm text-gray-600 mt-4">
            ✓ Detecta automáticamente: Uber Eats, Didi Food
          </p>
        </div>

        {/* RESUMEN FINANCIERO */}
        {utilidades && (
          <div className="bg-white rounded-lg shadow p-8 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Resumen financiero
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Ingresos totales</p>
                <p className="text-2xl font-bold text-green-600 mt-2">
                  ${(
                    Object.values(utilidades.reparticion).reduce(
                      (sum: number, r: any) => sum + (r.gastoRealizado || 0),
                      0
                    ) + utilidades.utilidadNeta
                  ).toLocaleString()}
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Gastos totales</p>
                <p className="text-2xl font-bold text-red-600 mt-2">
                  ${Object.values(utilidades.gastosPorSocio)
                    .reduce((a: number, b: number) => a + b, 0)
                    .toLocaleString()}
                </p>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Utilidad neta</p>
                <p className="text-2xl font-bold text-blue-600 mt-2">
                  ${utilidades.utilidadNeta.toLocaleString()}
                </p>
              </div>

              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Fondo empresa</p>
                <p className="text-2xl font-bold text-green-600 mt-2">
                  ${utilidades.fondoEmpresa.toLocaleString()}
                </p>
              </div>
            </div>

            {/* REPARTICIÓN POR SOCIO */}
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Repartición por socio
            </h3>

            <div className="space-y-4">
              {Object.entries(utilidades.reparticion).map(
                ([socioId, datos]: [string, any]) => (
                  <div key={socioId} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-semibold text-gray-900">
                          Socio {socioId.slice(0, 8)}
                        </p>
                        <p className="text-sm text-gray-600">
                          Gastó ${datos.gastoRealizado.toLocaleString()} ({(
                            datos.porcentajeAportacion * 100
                          ).toFixed(1)}%)
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600">
                          ${datos.dineroRecibido.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-600">a recibir</p>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
                      <div className="flex justify-between text-gray-700">
                        <span>Reponer gasto</span>
                        <span className="font-semibold">
                          +${datos.reponer.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-gray-700">
                        <span>20% del remanente</span>
                        <span className="font-semibold">
                          +${(
                            datos.dineroRecibido - datos.reponer
                          ).toLocaleString()}
                        </span>
                      </div>
                      {datos.deuda > 0 && (
                        <div className="flex justify-between text-red-700 border-t pt-1">
                          <span>Empresa le debe</span>
                          <span className="font-semibold">-${datos.deuda.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* ÚLTIMAS TRANSACCIONES */}
        <div className="bg-white rounded-lg shadow p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Últimas transacciones</h2>

          <div className="space-y-2">
            {gastos.slice(0, 10).map((gasto) => {
              const nombreSocio = gasto.email_socio
                ? gasto.email_socio.split('@')[0]
                : 'Desconocido';
              return (
                <div key={gasto.id} className="flex justify-between items-center p-3 bg-gray-50 rounded hover:bg-gray-100 transition">
                  <div>
                    <p className="font-semibold text-gray-900">{gasto.concepto}</p>
                    <p className="text-sm text-gray-600">
                      👤 {nombreSocio} • {gasto.tipo.replace('_', ' ')} • {gasto.fecha}
                    </p>
                  </div>
                  <p
                    className={`font-semibold text-lg ${
                      gasto.tipo.includes('venta') ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {gasto.tipo.includes('venta') ? '+' : '-'}${gasto.monto.toLocaleString()}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
