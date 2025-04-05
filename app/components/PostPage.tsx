import React from "react";

interface Comment {
  id: string;
  author: string;
  school: string;
  text: string;
  likes: number;
  createdAt: string;
}

interface PostPageProps {
  title: string;
  school: string;
  createdAt: string;
  category: string;
  content: string[];
  likes: number;
  comments: Comment[];
}

export default function PostPage({
  title,
  school,
  createdAt,
  category,
  content,
  likes,
  comments,
}: PostPageProps) {
  return (
    <div className="bg-white dark:bg-[#1a1a1b] rounded-xl shadow px-6 py-8 text-black dark:text-white">
      {/* 貼文標頭 */}
      <div className="flex gap-4 mb-6 items-center">
        <img src="/api/placeholder/48/48" alt="avatar" className="w-12 h-12 rounded-full" />
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <div className="text-sm text-gray-500 dark:text-gray-400 flex flex-wrap gap-2 mt-1">
            <span>{school}</span>
            <span>{createdAt}</span>
            <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full text-xs">{category}</span>
          </div>
        </div>
      </div>

      {/* 貼文內容 */}
      <div className="space-y-4 mb-6 text-base text-gray-800 dark:text-gray-200 leading-relaxed">
        {content.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      {/* 操作列 */}
      <div className="flex gap-6 border-y border-gray-200 dark:border-gray-700 py-4 mb-6 text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-1">❤️ <span>{likes}</span></div>
        <div className="flex items-center gap-1">💬 <span>{comments.length}</span></div>
        <div className="cursor-pointer">🔖</div>
        <div className="cursor-pointer">↗️</div>
      </div>

      {/* 留言篩選 Tab（靜態） */}
      <div className="flex gap-2 mb-4 text-sm">
        <div className="px-3 py-1 rounded-full bg-gray-200 dark:bg-gray-700 font-medium">熱門留言</div>
        <div className="px-3 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer">最新</div>
        <div className="px-3 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer">最舊</div>
      </div>

      {/* 留言輸入框（尚未接功能） */}
      <div className="flex gap-3 mb-6">
        <img src="/api/placeholder/40/40" className="w-10 h-10 rounded-full" alt="user avatar" />
        <input
          type="text"
          placeholder="發表你的留言..."
          className="flex-grow px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-sm"
        />
      </div>

      {/* 留言列表 */}
      <div className="space-y-6">
        {comments.map((c) => (
          <div key={c.id} className="flex gap-3">
            <img src="/api/placeholder/40/40" className="w-10 h-10 rounded-full" alt="comment user avatar" />
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl w-full">
              <div className="font-semibold text-sm mb-1">{c.author} • {c.school}</div>
              <div className="text-sm mb-2">{c.text}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 flex gap-4">
                <span>❤️ {c.likes}</span>
                <span>回覆</span>
                <span>{c.createdAt}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}