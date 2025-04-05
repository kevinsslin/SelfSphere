'use client';

import Link from 'next/link';
import NavBar from './components/NavBar';
import { motion } from 'framer-motion';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      {/* Background Layer */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          loop
          muted
          className="w-full h-full object-cover brightness-[0.2]"
        >
          <source src="/cyberpunk-bg.mp4" type="video/mp4" />
        </video>
      </div>

      {/* Content */}
      <div className="relative z-10">
        <NavBar />

        <main className="flex flex-col items-center justify-center h-screen text-center px-4">
          <motion.h1
            className="text-6xl md:text-8xl font-extrabold text-indigo-400 neon-text mb-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2 }}
          >
            SelfSphere
          </motion.h1>

          <motion.p
            className="text-lg md:text-xl text-gray-300 max-w-2xl mb-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 1 }}
          >
            Decentralized identity for Web3 discussions. Powered by ZK Proofs.
          </motion.p>

          <motion.div
            className="flex gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <Link
              href="/forum"
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-lg rounded-full transition shadow-lg"
            >
              Enter Forum
            </Link>
            <Link
              href="/playground"
              className="px-6 py-3 border border-gray-500 hover:border-indigo-400 text-gray-300 hover:text-indigo-300 rounded-full text-lg transition"
            >
              Try Playground
            </Link>
          </motion.div>
        </main>
      </div>

      <style jsx>{`
        .neon-text {
          text-shadow: 0 0 5px #7f5af0, 0 0 10px #7f5af0, 0 0 20px #7f5af0;
        }
      `}</style>
    </div>
  );
}