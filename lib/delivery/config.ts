// Configuración de las integraciones de delivery.
//
// IMPORTANTE: este módulo lee secretos y sólo debe importarse desde código que
// corre en el servidor (route handlers de `app/api/**`). Ninguna de estas
// variables lleva el prefijo NEXT_PUBLIC_, así que Next.js nunca las manda al
// navegador; el guard de abajo evita que un import accidental lo intente.

import { Plataforma } from './types';

function soloServidor() {
  if (typeof window !== 'undefined') {
    throw new Error(
      'lib/delivery/config.ts contiene credenciales y no puede importarse desde el navegador.'
    );
  }
}

function leer(nombre: string): string | undefined {
  const valor = process.env[nombre];
  if (valor === undefined) return undefined;
  const limpio = valor.trim();
  return limpio.length > 0 ? limpio : undefined;
}

function leerLista(nombre: string): string[] {
  return (leer(nombre) ?? '')
    .split(',')
    .map((valor) => valor.trim())
    .filter(Boolean);
}

export type ConfigUberEats = {
  clientId: string;
  clientSecret: string;
  /** Sucursales a consultar. Uber acepta hasta 50 por petición de reporte. */
  storeIds: string[];
  scope: string;
  tokenUrl: string;
  apiUrl: string;
  webhookSecret?: string;
};

export type ConfigDidiFood = {
  appId: string;
  appSecret: string;
  storeIds: string[];
  /** Base de la API que entrega Didi en el alta de comercio. */
  apiUrl: string;
  tokenUrl: string;
  /** Algoritmo de firma indicado en la documentación de tu cuenta. */
  algoritmoFirma: 'hmac-sha256' | 'md5';
  webhookSecret?: string;
};

export type ConfigGeneral = {
  /** Zona horaria del negocio, usada para agrupar pedidos por día. */
  zonaHoraria: string;
  moneda: string;
  /**
   * socio_id con el que se registran los ingresos creados automáticamente.
   * Debe ser un usuario real de Supabase (idealmente uno de "sistema").
   */
  socioIdSincronizacion?: string;
  /** Token compartido para disparar la sincronización desde un cron externo. */
  cronSecret?: string;
};

export function configUberEats(): ConfigUberEats | null {
  soloServidor();

  const clientId = leer('UBER_EATS_CLIENT_ID');
  const clientSecret = leer('UBER_EATS_CLIENT_SECRET');
  const storeIds = leerLista('UBER_EATS_STORE_IDS');

  if (!clientId || !clientSecret || storeIds.length === 0) return null;

  return {
    clientId,
    clientSecret,
    storeIds,
    scope: leer('UBER_EATS_SCOPE') ?? 'eats.report eats.store eats.order',
    tokenUrl: leer('UBER_EATS_TOKEN_URL') ?? 'https://auth.uber.com/oauth/v2/token',
    apiUrl: (leer('UBER_EATS_API_URL') ?? 'https://api.uber.com').replace(/\/+$/, ''),
    webhookSecret: leer('UBER_EATS_WEBHOOK_SECRET'),
  };
}

export function configDidiFood(): ConfigDidiFood | null {
  soloServidor();

  const appId = leer('DIDI_FOOD_APP_ID');
  const appSecret = leer('DIDI_FOOD_APP_SECRET');
  const storeIds = leerLista('DIDI_FOOD_STORE_IDS');
  // Didi no publica una base única: la asigna por región/cuenta al dar de alta
  // el comercio, así que aquí es obligatoria en vez de tener un valor supuesto.
  const apiUrl = leer('DIDI_FOOD_API_URL');

  if (!appId || !appSecret || !apiUrl || storeIds.length === 0) return null;

  const base = apiUrl.replace(/\/+$/, '');
  const algoritmo = leer('DIDI_FOOD_SIGN_ALGO');

  return {
    appId,
    appSecret,
    storeIds,
    apiUrl: base,
    tokenUrl: leer('DIDI_FOOD_TOKEN_URL') ?? `${base}/oauth/token`,
    algoritmoFirma: algoritmo === 'md5' ? 'md5' : 'hmac-sha256',
    webhookSecret: leer('DIDI_FOOD_WEBHOOK_SECRET'),
  };
}

export function configGeneral(): ConfigGeneral {
  soloServidor();

  return {
    zonaHoraria: leer('DELIVERY_TIMEZONE') ?? 'America/Tijuana',
    moneda: leer('DELIVERY_MONEDA') ?? 'MXN',
    socioIdSincronizacion: leer('DELIVERY_SYNC_SOCIO_ID'),
    cronSecret: leer('DELIVERY_CRON_SECRET'),
  };
}

/** Variables que faltan para poder activar cada plataforma. */
export function variablesFaltantes(plataforma: Plataforma): string[] {
  soloServidor();

  const requeridas: Record<Plataforma, string[]> = {
    uber_eats: ['UBER_EATS_CLIENT_ID', 'UBER_EATS_CLIENT_SECRET', 'UBER_EATS_STORE_IDS'],
    didi_food: [
      'DIDI_FOOD_APP_ID',
      'DIDI_FOOD_APP_SECRET',
      'DIDI_FOOD_API_URL',
      'DIDI_FOOD_STORE_IDS',
    ],
  };

  return requeridas[plataforma].filter((nombre) => !leer(nombre));
}

export function plataformaConfigurada(plataforma: Plataforma): boolean {
  return variablesFaltantes(plataforma).length === 0;
}
