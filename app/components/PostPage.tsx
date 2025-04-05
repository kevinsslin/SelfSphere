import React from "react";
import type { Post, Comment } from '../../lib/supabase';

interface PostPageProps {
  post: Post & {
    user?: {
      display_name: string;
    };
  };
  comments: (Comment & {
    user?: {
      display_name: string;
    };
  })[];
}

export default function PostPage({
  post,
  comments,
}: PostPageProps) {
  return (
    <div className="bg-white dark:bg-[#1a1a1b] rounded-xl shadow px-6 py-8 text-black dark:text-white">
      {/* Post Header */}
      <div className="flex gap-4 mb-6 items-center">
        <img src="/api/placeholder/48/48" alt="avatar" className="w-12 h-12 rounded-full" />
        <div>
          <h1 className="text-2xl font-bold">{post.title}</h1>
          <div className="text-sm text-gray-500 dark:text-gray-400 flex flex-wrap gap-2 mt-1">
            <span>{post.user?.display_name || 'Anonymous'}</span>
            <span>{new Date(post.created_at || '').toLocaleString()}</span>
            {post.disclosed_attributes && Object.keys(post.disclosed_attributes).length > 0 && (
              <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full text-xs">
                Verified
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Post Content */}
      <div className="space-y-4 mb-6 text-base text-gray-800 dark:text-gray-200 leading-relaxed">
        {post.content.split('\n').map((p, i) => (
          <p key={`${post.post_id}-${i}`}>{p}</p>
        ))}
      </div>

      {/* Action Bar */}
      <div className="flex gap-6 border-y border-gray-200 dark:border-gray-700 py-4 mb-6 text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-1">❤️ <span>{post.likes_count}</span></div>
        <div className="flex items-center gap-1">💬 <span>{comments.length}</span></div>
        <div className="cursor-pointer">🔖</div>
        <div className="cursor-pointer">↗️</div>
      </div>

      {/* Comment Filter Tabs (Static) */}
      <div className="flex gap-2 mb-4 text-sm">
        <div className="px-3 py-1 rounded-full bg-gray-200 dark:bg-gray-700 font-medium">Hot Comments</div>
        <div className="px-3 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer">Latest</div>
        <div className="px-3 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer">Oldest</div>
      </div>

      {/* Comment Input Box (Functionality not implemented yet) */}
      <div className="flex gap-3 mb-6">
        <img src="/api/placeholder/40/40" className="w-10 h-10 rounded-full" alt="user avatar" />
        <input
          type="text"
          placeholder="Write your comment..."
          className="flex-grow px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-sm"
        />
      </div>

      {/* Comments List */}
      <div className="space-y-6">
        {comments.map((c) => (
          <div key={c.comment_id} className="flex gap-3">
            <img src="/api/placeholder/40/40" className="w-10 h-10 rounded-full" alt="comment user avatar" />
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl w-full">
              <div className="font-semibold text-sm mb-1">{c.user?.display_name || 'Anonymous'}</div>
              <div className="text-sm mb-2">{c.content}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 flex gap-4">
                <span>❤️ {c.likes_count}</span>
                <span>Reply</span>
                <span>{new Date(c.created_at || '').toLocaleString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}