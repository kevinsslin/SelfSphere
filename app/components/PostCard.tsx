'use client';

import Link from 'next/link';

type Post = {
  post_id: string;
  title: string;
  content: string;
  user_id: string;
  created_at: string;
  likes_count: number;
  comments_count?: number;
  user?: {
    display_name: string;
  };
  disclosed_attributes?: Record<string, string | number | boolean>;
};

type PostCardProps = {
  post: Post;
};

export default function PostCard({ post }: PostCardProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition duration-200">
      <Link href={`/forum/post/${post.post_id}`}>
        <h2 className="text-xl font-semibold mb-2 hover:text-indigo-600">{post.title}</h2>
      </Link>
      <p className="text-gray-600 mb-4 line-clamp-3">{post.content}</p>
      
      {/* Displayed attributes */}
      {post.disclosed_attributes && Object.keys(post.disclosed_attributes).length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(post.disclosed_attributes).map(([key, value]) => (
            <div key={key} className="bg-green-50 text-green-700 px-2 py-1 rounded-full text-xs">
              <span className="font-medium">{key.replace('_', ' ')}:</span> {String(value)}
            </div>
          ))}
        </div>
      )}
      
      <div className="flex items-center justify-between text-sm text-gray-500">
        <div>Posted by: {post.user?.display_name || 'Anonymous'}</div>
        <div className="flex items-center space-x-4">
          <div>
            <span>❤️ {post.likes_count}</span>
          </div>
          <div>
            <span>💬 {post.comments_count || 0}</span>
          </div>
          <div className="text-xs">{new Date(post.created_at).toLocaleDateString()}</div>
        </div>
      </div>
    </div>
  );
} 