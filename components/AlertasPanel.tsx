'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { obtenerAlertas } from '@/lib/alertas';
import type { Alerta } from '@/lib/alertas';

export default function AlertasPanel() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlertas();
  }, []);

  async function loadAlertas() {
    try {
      const data = await obtenerAlertas();
      setAlertas(data);
    } catch (err) {
      console.error('Error cargando alertas:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return null;

  if (alertas.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-green-700 font-semibold">✓ Sin alertas activas</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alertas.map((alerta) => {
        let bgColor = 'bg-blue-50 border-blue-200';
        let iconColor = 'text-blue-600';
        let icon = 'ℹ️';

        if (alerta.tipo === 'advertencia') {
          bgColor = 'bg-yellow-50 border-yellow-200';
          iconColor = 'text-yellow-600';
          icon = '⚠️';
        } else if (alerta.tipo === 'alerta') {
          bgColor = 'bg-red-50 border-red-200';
          iconColor = 'text-red-600';
          icon = '🚨';
        }

        return (
          <Link key={alerta.id} href={alerta.accion || '#'}>
            <div className={`border rounded-lg p-4 ${bgColor} hover:shadow transition cursor-pointer`}>
              <div className="flex items-start gap-3">
                <span className="text-xl">{icon}</span>
                <div className="flex-1 min-w-0">
                  <h4 className={`font-semibold ${iconColor} text-sm mb-1`}>{alerta.titulo}</h4>
                  <p className="text-sm text-gray-700">{alerta.descripcion}</p>
                  <p className="text-xs text-gray-500 mt-1">{alerta.fecha}</p>
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
