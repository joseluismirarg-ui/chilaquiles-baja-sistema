'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import Logo from './Logo';

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user);
    });
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (!user) return null;

  return (
    <nav className="bg-blue-900 text-white p-4">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition">
          <Logo size="md" />
          <div>
            <div className="text-lg font-bold">Chilaquiles Baja</div>
            <div className="text-xs text-blue-200">Sistema Contable</div>
          </div>
        </Link>
        <div className="flex gap-6 items-center text-sm">
          <Link href="/dashboard" className="hover:text-blue-200 transition">
            Dashboard
          </Link>
          <Link href="/gastos" className="hover:text-blue-200 transition">
            Gastos
          </Link>
          <Link href="/ganancias" className="hover:text-blue-200 transition">
            Ganancias
          </Link>
          <Link href="/inventario" className="hover:text-blue-200 transition">
            Inventario
          </Link>
          <Link href="/notas" className="hover:text-blue-200 transition">
            Notas
          </Link>
          <Link href="/reportes" className="hover:text-blue-200 transition">
            Reportes
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="bg-red-600 px-3 py-1 rounded hover:bg-red-700"
            >
              Salir
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
