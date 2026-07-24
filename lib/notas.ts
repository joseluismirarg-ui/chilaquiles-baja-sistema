import { supabase } from './supabase';
import { Nota } from './types';

export async function agregarNota(
  contenido: string,
  tipo: 'general' | 'insumos_faltantes' | 'urgente' = 'general',
  fechaNota?: string
) {
  const { data: session } = await supabase.auth.getSession();
  if (!session?.session?.user?.email) throw new Error('No autenticado');

  const fecha = fechaNota || new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('notas')
    .insert([
      {
        autor_id: session.session.user.id,
        autor_email: session.session.user.email,
        contenido,
        tipo,
        fecha_nota: fecha,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function obtenerNotas(dias: number = 7) {
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() - dias);

  const { data, error } = await supabase
    .from('notas')
    .select('*')
    .gte('fecha_nota', fechaLimite.toISOString().split('T')[0])
    .order('fecha_nota', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as Nota[]) || [];
}

export async function eliminarNota(notaId: string) {
  const { error } = await supabase
    .from('notas')
    .delete()
    .eq('id', notaId);

  if (error) throw error;
}
