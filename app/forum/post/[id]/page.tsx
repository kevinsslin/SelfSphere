'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import NavBar from '../../../components/NavBar';
import { useAccount } from 'wagmi';

type Post = {
  post_id: string;
  title: string;
  content: string;
  user_id: string;
  created_at: string;
  likes_count: number;
  disclosed_attributes?: Record<string, string | number | boolean>;
  allowed_commenters?: Record<string, string>;
  user?: {
    display_name: string;
  };
};

type Comment = {
  comment_id: string;
  content: string;
  created_at: string;
  user?: {
    display_name: string;
  };
};

export default function PostPage() {
  const { id } = useParams();
  const { address } = useAccount();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [commentLoading, setCommentLoading] = useState(false);
  const [canComment, setCanComment] = useState(false);
  const [error, setError] = useState('');

  // Fetch post and comments
  useEffect(() => {
    async function fetchPostAndComments() {
      if (!id) return;

      try {
        // Fetch post
        const { data: postData, error: postError } = await supabase
          .from('posts')
          .select(`
            *,
            user:users(display_name)
          `)
          .eq('post_id', id)
          .single();

        if (postError) {
          throw postError;
        }

        setPost(postData);

        // Fetch comments
        const { data: commentsData, error: commentsError } = await supabase
          .from('comments')
          .select(`
            *,
            user:users(display_name)
          `)
          .eq('post_id', id)
          .order('created_at', { ascending: true });

        if (commentsError) {
          throw commentsError;
        }

        setComments(commentsData || []);

        // Check if user can comment
        if (address && postData.allowed_commenters) {
          // Here we'd normally check against Self attributes
          // For now, we'll assume the user can comment if we have a wallet address
          setCanComment(true);
        } else if (!postData.allowed_commenters) {
          // No restrictions, anyone can comment
          setCanComment(true);
        }
      } catch (error) {
        console.error('Error fetching post:', error);
        setError('Failed to load post');
      } finally {
        setLoading(false);
      }
    }

    fetchPostAndComments();
  }, [id, address]);

  // Submit a new comment
  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;
    if (!post || !address) {
      setError('You must be logged in to comment');
      return;
    }

    setCommentLoading(true);
    setError('');

    try {
      // Get user ID from wallet address
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('user_id')
        .eq('wallet_address', address)
        .single();

      if (userError) {
        throw new Error('User not found');
      }

      // Create comment
      const { data: newComment, error: commentError } = await supabase
        .from('comments')
        .insert([
          {
            post_id: post.post_id,
            user_id: userData.user_id,
            content: commentText
          }
        ])
        .select(`
          *,
          user:users(display_name)
        `)
        .single();

      if (commentError) {
        throw commentError;
      }

      // Add new comment to the list
      setComments(prev => [...prev, newComment]);
      setCommentText('');

      // TODO: Check for rewards eligibility here
    } catch (error) {
      console.error('Error creating comment:', error);
      setError('Failed to submit comment');
    } finally {
      setCommentLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="max-w-4xl mx-auto py-8 px-4">
          <div className="animate-pulse">Loading post...</div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <div className="max-w-4xl mx-auto py-8 px-4">
          <div className="text-red-600">Post not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      
      <main className="max-w-4xl mx-auto py-8 px-4">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4">
            {error}
          </div>
        )}
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Post header */}
          <div className="p-6 border-b">
            <h1 className="text-3xl font-bold mb-2">{post.title}</h1>
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div>Posted by: {post.user?.display_name || 'Anonymous'}</div>
              <div>{new Date(post.created_at).toLocaleString()}</div>
            </div>
          </div>
          
          {/* Post content */}
          <div className="p-6">
            <div className="prose max-w-none">
              {post.content}
            </div>
          </div>
          
          {/* Disclosed attributes */}
          {post.disclosed_attributes && Object.keys(post.disclosed_attributes).length > 0 && (
            <div className="px-6 pb-6 border-t pt-4">
              <h3 className="text-lg font-semibold mb-3">Verified Attributes</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(post.disclosed_attributes).map(([key, value]) => (
                  <div key={key} className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm">
                    <span className="font-medium">{key.replace('_', ' ')}:</span> {String(value)}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Comments section */}
          <div className="border-t px-6 py-4 bg-gray-50">
            <h3 className="text-xl font-semibold mb-4">Comments</h3>
            
            {comments.length === 0 ? (
              <div className="text-gray-500 py-4">No comments yet.</div>
            ) : (
              <div className="space-y-4 mb-6">
                {comments.map(comment => (
                  <div key={comment.comment_id} className="bg-white p-4 rounded-md shadow-sm">
                    <div className="text-sm text-gray-500 mb-1">
                      {comment.user?.display_name || 'Anonymous'} • {new Date(comment.created_at).toLocaleString()}
                    </div>
                    <div>{comment.content}</div>
                  </div>
                ))}
              </div>
            )}
            
            {canComment ? (
              <div className="mt-6">
                <textarea
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2"
                  rows={3}
                />
                <button
                  type="button"
                  onClick={handleSubmitComment}
                  disabled={commentLoading || !commentText.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {commentLoading ? 'Submitting...' : 'Submit Comment'}
                </button>
              </div>
            ) : (
              <div className="mt-6 p-3 bg-yellow-50 text-yellow-700 rounded-md">
                You cannot comment on this post due to the author's restrictions.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 