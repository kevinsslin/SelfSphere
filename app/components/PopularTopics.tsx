'use client';

import { FaFire, FaArrowUpRightFromSquare } from 'react-icons/fa6';
import { BsThreeDots } from 'react-icons/bs';

const topics = [
  {
    category: 'Business & finance · Trending',
    topic: 'S&P500',
    posts: '45.5K posts',
    trending: true,
  },
  {
    category: 'Business & finance · Trending',
    topic: 'Warren Buffett',
    posts: '18.7K posts',
    trending: true,
  },
  {
    category: 'Business & finance · Trending',
    topic: 'Ethereum',
    posts: '181K posts',
    trending: true,
  },
  {
    category: 'Business & finance · Trending',
    topic: 'EOF',
    posts: '11K posts',
    trending: false,
  },
];

export default function PopularTopics() {
  return (
    <section className="bg-[#1a1a1b] text-white rounded-xl p-4 w-full">
      <h2 className="text-lg font-bold mb-4">What’s happening</h2>

      {topics.map((item, idx) => (
        <div
          key={idx}
          className="mb-4 hover:bg-[#2a2a2b] p-2 rounded-md transition duration-150 cursor-pointer group"
        >
          <p className="text-xs text-gray-400">{item.category}</p>
          <div className="flex justify-between items-start">
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <p className="font-semibold group-hover:underline">{item.topic}</p>
                {item.trending && (
                  <FaFire className="text-orange-500 w-3.5 h-3.5 animate-pulse" />
                )}
              </div>
              <p className="text-sm text-gray-500">{item.posts}</p>
            </div>
            <button className="text-gray-400 hover:text-white">
              <BsThreeDots className="w-4 h-4 mt-1" />
            </button>
          </div>
        </div>
      ))}

      <button className="text-sm text-blue-500 hover:underline mt-2 flex items-center gap-1">
        Show more <FaArrowUpRightFromSquare className="w-3 h-3" />
      </button>
    </section>
  );
}