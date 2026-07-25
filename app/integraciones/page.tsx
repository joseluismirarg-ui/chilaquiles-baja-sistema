'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';

type EstadoPlataforma = {
  plataforma: 'uber_eats' | 'didi_food';
  nombre: string;
  configurada: boolean;
  variablesFaltantes: string[];
  conexion: { ok: boolean; error?: string } | null;
  ultimaSincronizacion: {
    fecha: string;
    estado: string;
    pedidos: number;
    dineroNeto: number;
    mensaje: string | null;
  } | null;
};

type Estado = {
  plataformas: EstadoPlataforma[];
  puedeGuardar: boolean;
  socioSincronizacionConfigurado: boolean;
};

type ResultadoPlataforma = {
  plataforma: 'uber_eats' | 'didi_food';
  ok: boolean;
  periodo?: {
    ingresosBrutos: number;
    comisiones: number;
    promociones: number;
    dineroNeto: number;
    totalPedidos: number;
    comisionPorcentaje: number;
  };
  pedidosSincronizados?: number;
  diasRegistrados?: number;
  error?: string;
  advertencias: string[];
};

type Resultado = {
  fechaInicio: string;
  fechaFin: string;
  resultados: ResultadoPlataforma[];
};

const ICONO: Record<string, string> = {
  uber_eats: '🟢',
  didi_food: '🟠',
};

function haceDias(dias: number): string {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - dias);
  return fecha.toISOString().slice(0, 10);
}

function pesos(valor: number): string {
  return `$${valor.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function IntegracionesPage() {
  const router = useRouter();
  const [autorizado, setAutorizado] = useState(false);
  const [estado, setEstado] = useState<Estado | null>(null);
  const [cargandoEstado, setCargandoEstado] = useState(true);
  const [probando, setProbando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [error, setError] = useState('');

  const [fechaInicio, setFechaInicio] = useState(haceDias(6));
  const [fechaFin, setFechaFin] = useState(haceDias(0));

  /** Las rutas de /api/delivery exigen el access token del socio. */
  const tokenDeSesion = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  const cargarEstado = useCallback(
    async (probarConexion = false) => {
      const token = await tokenDeSesion();
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const respuesta = await fetch(
          `/api/delivery/estado${probarConexion ? '?probar=1' : ''}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!respuesta.ok) {
          throw new Error('No se pudo leer el estado de las integraciones');
        }

        setEstado(await respuesta.json());
        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      }
    },
    [router, tokenDeSesion]
  );

  useEffect(() => {
    async function iniciar() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push('/login');
        return;
      }
      setAutorizado(true);
      await cargarEstado();
      setCargandoEstado(false);
    }
    iniciar();
  }, [router, cargarEstado]);

  async function probarConexiones() {
    setProbando(true);
    await cargarEstado(true);
    setProbando(false);
  }

  async function sincronizar() {
    setSincronizando(true);
    setError('');
    setResultado(null);

    try {
      const token = await tokenDeSesion();
      if (!token) {
        router.push('/login');
        return;
      }

      const respuesta = await fetch('/api/delivery/sincronizar', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fechaInicio, fechaFin }),
      });

      const datos = await respuesta.json();

      // 207 = una plataforma falló y otra no; los detalles vienen por plataforma.
      if (!respuesta.ok && respuesta.status !== 207) {
        throw new Error(datos.error || 'No se pudo sincronizar');
      }

      setResultado(datos);
      await cargarEstado();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al sincronizar');
    } finally {
      setSincronizando(false);
    }
  }

  if (!autorizado) return null;

  const faltaConfiguracion =
    estado && (!estado.puedeGuardar || !estado.socioSincronizacionConfigurado);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-6xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Integraciones de delivery</h1>
        <p className="text-gray-600 mb-8">
          Conecta Uber Eats y Didi Food por API para que las ventas entren solas, sin subir
          archivos.
        </p>

        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">{error}</div>
        )}

        {faltaConfiguracion && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-lg mb-6">
            <p className="font-semibold mb-1">Falta configuración del servidor</p>
            <ul className="text-sm list-disc list-inside space-y-1">
              {!estado?.puedeGuardar && (
                <li>
                  <code>SUPABASE_SERVICE_ROLE_KEY</code> — sin ella no se pueden guardar las
                  ventas sincronizadas.
                </li>
              )}
              {!estado?.socioSincronizacionConfigurado && (
                <li>
                  <code>DELIVERY_SYNC_SOCIO_ID</code> — socio al que se atribuyen los ingresos
                  automáticos. Si falta, se usa el socio que presione sincronizar.
                </li>
              )}
            </ul>
          </div>
        )}

        {/* ESTADO DE CADA PLATAFORMA */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {cargandoEstado && (
            <p className="text-gray-600">Cargando estado de las plataformas...</p>
          )}

          {estado?.plataformas.map((plataforma) => (
            <div key={plataforma.plataforma} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {ICONO[plataforma.plataforma]} {plataforma.nombre}
                </h2>
                <span
                  className={`text-xs font-semibold px-3 py-1 rounded-full ${
                    plataforma.configurada
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {plataforma.configurada ? 'Configurada' : 'Sin credenciales'}
                </span>
              </div>

              {!plataforma.configurada && (
                <div className="text-sm text-gray-600 mb-4">
                  <p className="mb-2">Faltan estas variables de entorno:</p>
                  <ul className="space-y-1">
                    {plataforma.variablesFaltantes.map((variable) => (
                      <li key={variable}>
                        <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                          {variable}
                        </code>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {plataforma.conexion && (
                <div
                  className={`text-sm p-3 rounded mb-4 ${
                    plataforma.conexion.ok
                      ? 'bg-green-50 text-green-800'
                      : 'bg-red-50 text-red-800'
                  }`}
                >
                  {plataforma.conexion.ok
                    ? '✓ Conexión exitosa: las credenciales funcionan.'
                    : `✗ ${plataforma.conexion.error}`}
                </div>
              )}

              {plataforma.ultimaSincronizacion ? (
                <div className="bg-gray-50 rounded p-3 text-sm text-gray-700 space-y-1">
                  <div className="flex justify-between">
                    <span>Última sincronización</span>
                    <span className="font-semibold">
                      {new Date(plataforma.ultimaSincronizacion.fecha).toLocaleString('es-MX')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Resultado</span>
                    <span
                      className={`font-semibold ${
                        plataforma.ultimaSincronizacion.estado === 'ok'
                          ? 'text-green-700'
                          : 'text-red-700'
                      }`}
                    >
                      {plataforma.ultimaSincronizacion.estado === 'ok' ? 'OK' : 'Error'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pedidos</span>
                    <span className="font-semibold">
                      {plataforma.ultimaSincronizacion.pedidos}
                    </span>
                  </div>
                  {plataforma.ultimaSincronizacion.mensaje && (
                    <p className="text-xs text-gray-600 pt-1 border-t">
                      {plataforma.ultimaSincronizacion.mensaje}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Todavía no se ha sincronizado.</p>
              )}
            </div>
          ))}
        </div>

        {/* SINCRONIZACIÓN MANUAL */}
        <div className="bg-white rounded-lg shadow p-8 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Sincronizar ventas</h2>
          <p className="text-gray-600 text-sm mb-6">
            Trae los pedidos del rango seleccionado y los registra como ventas de plataforma.
            Volver a sincronizar el mismo rango actualiza los datos en lugar de duplicarlos.
          </p>

          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Desde</label>
              <input
                type="date"
                value={fechaInicio}
                max={fechaFin}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Hasta</label>
              <input
                type="date"
                value={fechaFin}
                min={fechaInicio}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900"
              />
            </div>
            <div className="flex items-end gap-3">
              <button
                onClick={sincronizar}
                disabled={sincronizando || !estado?.plataformas.some((p) => p.configurada)}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
              >
                {sincronizando ? 'Sincronizando...' : 'Sincronizar'}
              </button>
              <button
                onClick={probarConexiones}
                disabled={probando}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
              >
                {probando ? 'Probando...' : 'Probar conexión'}
              </button>
            </div>
          </div>

          {sincronizando && (
            <p className="text-sm text-gray-600">
              Uber Eats genera el reporte de forma asíncrona: puede tardar varios minutos.
            </p>
          )}

          {resultado && (
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900">
                Resultado ({resultado.fechaInicio} a {resultado.fechaFin})
              </h3>

              {resultado.resultados.map((item) => (
                <div
                  key={item.plataforma}
                  className={`border rounded-lg p-4 ${
                    item.ok ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                  }`}
                >
                  <p className="font-semibold text-gray-900 mb-2">
                    {ICONO[item.plataforma]}{' '}
                    {item.plataforma === 'uber_eats' ? 'Uber Eats' : 'Didi Food'}
                  </p>

                  {item.ok && item.periodo ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-gray-600">Pedidos</p>
                        <p className="font-bold text-gray-900">{item.periodo.totalPedidos}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Ingresos brutos</p>
                        <p className="font-bold text-gray-900">
                          {pesos(item.periodo.ingresosBrutos)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">
                          Comisiones ({item.periodo.comisionPorcentaje}%)
                        </p>
                        <p className="font-bold text-red-700">
                          -{pesos(item.periodo.comisiones)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Depósito neto</p>
                        <p className="font-bold text-green-700">
                          {pesos(item.periodo.dineroNeto)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-red-800">{item.error}</p>
                  )}

                  {item.advertencias.length > 0 && (
                    <ul className="mt-3 text-xs text-amber-800 list-disc list-inside space-y-1">
                      {item.advertencias.map((aviso, indice) => (
                        <li key={indice}>{aviso}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-sm text-blue-900">
          <p className="font-semibold mb-2">¿Cómo obtengo las credenciales?</p>
          <p>
            Ambas plataformas requieren alta como partner: Uber Eats desde su portal de
            desarrollador y Didi Food a través de tu ejecutivo de cuenta. El paso a paso está en{' '}
            <code>INTEGRACION_DELIVERY.md</code>. Mientras tanto, la carga manual de archivos
            en Reportes sigue funcionando.
          </p>
        </div>
      </main>
    </div>
  );
}
