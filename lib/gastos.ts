import { supabase } from './supabase';
import { Gasto } from './types';

export async function registrarGasto(gasto: Omit<Gasto, 'id' | 'created_at'>) {
  // Obtener el email del usuario actual si no está incluido
  let gastoConEmail = gasto;
  if (!gasto.email_socio) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user?.email) {
      gastoConEmail = { ...gasto, email_socio: data.session.user.email };
    }
  }

  const { data, error } = await supabase
    .from('gastos')
    .insert([gastoConEmail])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function obtenerGastosMes(mes: string) {
  const [año, mesNum] = mes.split('-');
  const inicio = `${año}-${mesNum}-01`;
  const fin = `${año}-${mesNum}-31`;

  const { data, error } = await supabase
    .from('gastos')
    .select('*')
    .gte('fecha', inicio)
    .lte('fecha', fin)
    .order('fecha', { ascending: false });

  if (error) throw error;
  return data as Gasto[];
}

export async function obtenerGastosPorSocio(socioId: string, mes: string) {
  const gastos = await obtenerGastosMes(mes);
  return gastos.filter(g => g.socio_id === socioId);
}

export async function obtenerTotalesGastos(mes: string) {
  const gastos = await obtenerGastosMes(mes);

  const totales = {
    fijos: gastos
      .filter(g => g.tipo === 'fijo')
      .reduce((sum, g) => sum + g.monto, 0),
    variables: gastos
      .filter(g => g.tipo === 'variable')
      .reduce((sum, g) => sum + g.monto, 0),
    ventasFisica: gastos
      .filter(g => g.tipo === 'venta_fisica')
      .reduce((sum, g) => sum + g.monto, 0),
    ventasPlataforma: gastos
      .filter(g => g.tipo === 'venta_plataforma')
      .reduce((sum, g) => sum + g.monto, 0),
  };

  return totales;
}
