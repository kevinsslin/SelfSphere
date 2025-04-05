'use client';

export default function Marquee() {
  return (
    <div className="overflow-hidden whitespace-nowrap w-full rounded-md py-2 px-4 bg-black text-white">
      <div className="inline-block animate-marquee">
        📣 Welcome to SelfSphere — A place where your thoughts matter. ✨ Share, discuss, and grow with the community! 💬🌱
      </div>
    </div>
  );
}