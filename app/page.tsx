'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import NavBar from './components/NavBar';
import Link from 'next/link';

export default function HomePage() {
  const router = useRouter();
  
  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      
      <main className="max-w-5xl mx-auto pt-16 px-4">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-indigo-600 mb-6">SelfSphere</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            A decentralized discussion platform with Web3 identity verification
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Verified Identity</h2>
            <p className="text-gray-600 mb-6">
              Use Self passport verification to securely share personal attributes without revealing your entire identity.
            </p>
            <Link
              href="/playground"
              className="inline-block bg-indigo-100 text-indigo-700 px-4 py-2 rounded-md hover:bg-indigo-200 transition"
            >
              Try the Playground
            </Link>
          </div>
          
          <div className="bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Web3 Rewards</h2>
            <p className="text-gray-600 mb-6">
              Earn tokens and NFTs for participating in discussions. First commenters get special rewards!
            </p>
            <Link
              href="/forum"
              className="inline-block bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition"
            >
              Join the Forum
            </Link>
          </div>
        </div>
        
        <div className="text-center">
          <p className="text-gray-500 mb-4">Built for ETH Taipei Hackathon</p>
          <div className="flex justify-center space-x-6">
            <Link
              href="/forum"
              className="text-indigo-600 hover:text-indigo-800"
            >
              Forum
            </Link>
            <Link
              href="/playground"
              className="text-indigo-600 hover:text-indigo-800"
            >
              Playground
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

