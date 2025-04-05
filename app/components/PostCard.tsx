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
    <div className="bg-[#1a1a1b] border border-gray-700 rounded-md mb-3">
      <div className="flex">
        {/* Voting */}
        <div className="flex flex-col items-center w-10 bg-[#151516] p-2 rounded-l-md">
          <button className="text-gray-400 hover:text-[#ff4500]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-6 h-6"
            >
              <path
                fillRule="evenodd"
                d="M11.47 2.47a.75.75 0 0 1 1.06 0l7.5 7.5a.75.75 0 1 1-1.06 1.06l-6.22-6.22V21a.75.75 0 0 1-1.5 0V4.81l-6.22 6.22a.75.75 0 1 1-1.06-1.06l7.5-7.5Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          <span className="text-xs font-bold my-1 text-gray-100">
            {post.likes_count}
          </span>
          <button className="text-gray-400 hover:text-[#7193ff]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-6 h-6"
            >
              <path
                fillRule="evenodd"
                d="M12.53 16.28a.75.75 0 0 1-1.06 0l-7.5-7.5a.75.75 0 0 1 1.06-1.06L12 14.69l6.97-6.97a.75.75 0 1 1 1.06 1.06l-7.5 7.5Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-3 w-full">
          {/* Post metadata */}
          <div className="flex items-center text-xs text-gray-400 mb-2">
            <span>Posted by</span>
            <span className="mx-1 hover:underline">
              {post.user?.display_name || 'Anonymous'}
            </span>
            <span className="mx-1">•</span>
            <span>{new Date(post.created_at).toLocaleDateString()}</span>
          </div>

          {/* Title */}
          <Link href={`/forum/post/${post.post_id}`}>
            <h2 className="text-lg font-medium text-white mb-2 hover:text-indigo-600">
              {post.title}
            </h2>
          </Link>

          {/* Content */}
          <div className="text-sm text-gray-300 mb-3">
            <p className="line-clamp-3">{post.content}</p>
          </div>

          {/* Displayed attributes */}
          {post.disclosed_attributes && Object.keys(post.disclosed_attributes).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {Object.entries(post.disclosed_attributes).map(([key, value]) => (
                <div key={key} className="bg-gray-800 text-gray-300 px-2 py-1 rounded-full text-xs">
                  <span className="font-medium">{key.replace('_', ' ')}:</span> {String(value)}
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <button className="flex items-center space-x-1 p-1 rounded hover:bg-gray-800">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
                />
              </svg>
              <span>{post.comments_count || 0} Comments</span>
            </button>

            <button className="flex items-center space-x-1 p-1 rounded hover:bg-gray-800">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z"
                />
              </svg>
              <span>Share</span>
            </button>

            <button className="flex items-center space-x-1 p-1 rounded hover:bg-gray-800">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z"
                />
              </svg>
              <span>Save</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 