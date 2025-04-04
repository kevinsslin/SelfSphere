'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectWallet } from './ConnectWallet';

export default function NavBar() {
  const pathname = usePathname();
  
  return (
    <nav className="bg-white shadow-md px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center">
          <Link href="/" className="text-xl font-bold text-indigo-600">
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
      className={`px-3 py-2 rounded-md ${active 
        ? 'text-indigo-600 font-medium' 
        : 'text-gray-600 hover:text-indigo-500'}`}
    >
      {children}
    </Link>
  );
} 