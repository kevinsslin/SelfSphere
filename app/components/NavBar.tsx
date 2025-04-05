'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectWallet } from './ConnectWallet';

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="bg-[#0b0b0b] bg-opacity-100 shadow-[0_4px_30px_rgba(0,0,0,0.4)] backdrop-blur-sm px-4 py-3 fixed top-0 left-0 w-full z-50 border-b border-transparent">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center">
          <Link href="/" className="text-xl font-bold text-indigo-400">
            SelfSphere
          </Link>

          <div className="ml-10 flex space-x-6">
            <NavLink href="/" active={pathname === '/'}>
              Home
            </NavLink>
            <NavLink href="/forum" active={pathname === '/forum'}>
              Forum
            </NavLink>
            <NavLink href="/playground" active={pathname === '/playground'}>
              Playground
            </NavLink>
          </div>
        </div>
        <ConnectWallet />
      </div>
    </nav>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`px-3 py-2 rounded-md transition-colors duration-200 ${
        active ? 'text-indigo-400 font-medium' : 'text-gray-400 hover:text-indigo-300'
      }`}
    >
      {children}
    </Link>
  );
}