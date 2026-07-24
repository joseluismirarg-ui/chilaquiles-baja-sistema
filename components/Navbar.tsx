'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

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
        <Link href="/dashboard" className="text-2xl font-bold">
          🌶️ Chilaquiles Baja
        </Link>
        <div className="flex gap-6 items-center">
          <Link href="/dashboard" className="hover:text-blue-200 transition">
            Dashboard
          </Link>
          <Link href="/gastos" className="hover:text-blue-200 transition">
            Transacciones
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
