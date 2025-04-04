'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import NavBar from '../components/NavBar';
import PostCard from '../components/PostCard';
import CreatePostModal from '../components/CreatePostModal';

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

export default function ForumPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  useEffect(() => {
    async function fetchPosts() {
      try {
        const { data, error } = await supabase
          .from('posts')
          .select(`
            *,
            user:users(display_name)
          `)
          .order('created_at', { ascending: false });
        
        if (error) {
          throw error;
        }
        
        setPosts(data || []);
      } catch (error) {
        console.error('Error fetching posts:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchPosts();
  }, []);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      
      <main className="max-w-5xl mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Forum</h1>
          
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition duration-200"
          >
            Create Post
          </button>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-pulse text-gray-600">Loading posts...</div>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-lg shadow">
            <p className="text-xl text-gray-700">No posts yet!</p>
            <p className="mt-2 text-gray-600">Be the first to create a post.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {posts.map((post) => (
              <PostCard key={post.post_id} post={post} />
            ))}
          </div>
        )}
      </main>
      
      {showCreateModal && (
        <CreatePostModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
} 