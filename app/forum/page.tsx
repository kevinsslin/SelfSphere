'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import NavBar from '../components/NavBar';
import PostCard from '../components/PostCard';
import PopularTopics from '../components/PopularTopics';
import CreatePostModal from '../components/CreatePostModal';
import Marquee from '../components/Marquee';
import { FaQuestionCircle, FaComments, FaCog } from 'react-icons/fa';

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

// TODO: remove this mock post
const mockPost = {
  post_id: "12345",
  title: "My First Post in SelfSphere",
  content: "This is a sample post content that demonstrates how the PostCard component will look with some text. It should be long enough to test the line-clamp functionality.",
  user_id: "user_67890",
  created_at: "2023-10-15T14:30:00Z",
  likes_count: 42,
  comments_count: 7,
  user: {
    display_name: "JohnDoe123"
  },
  disclosed_attributes: {
    age: 28,
    location: "New York",
    verified_user: true,
    membership_level: "premium"
  }
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
    <div className="min-h-screen bg-gray-50 dark:bg-[#0b0b0b]">
      <NavBar />

      <div className="flex max-w-7xl mx-auto">
        {/* Sidebar */}
        <aside className="hidden md:block fixed top-16 left-0 w-64 h-[calc(100vh-4rem)] bg-[#1a1a1b] text-white pt-2 px-4 overflow-hidden">
          <div className="space-y-1 text-sm">
            <SidebarLink icon={FaQuestionCircle} label="Questions" />
            <SidebarLink icon={FaComments} label="Discussions" />
            <SidebarLink icon={FaCog} label="Settings" />
          </div>

          <hr className="border-gray-700 my-4" />

          <div>
            <PopularTopics />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 pt-8 px-4 ml-64 pb-24 relative">
          {/* Marquee */}
          <div className="mb-8">
            <Marquee />
          </div>

          {/* Post Feed */}
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-pulse text-gray-600">Loading posts...</div>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-10 bg-white dark:bg-[#1a1a1b] rounded-lg shadow">
              <p className="text-xl text-gray-700 dark:text-white">No posts yet!</p>
              <p className="mt-2 text-gray-600">Be the first to create a post.</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {posts.map((post) => (
                <PostCard key={post.post_id} post={post} />
              ))}
            </div>
          )}

          {/* Optional: mockPost preview */}
          <div className="grid gap-6 mt-6">
            <PostCard key="mock-1" post={mockPost} />
            <PostCard key="mock-2" post={mockPost} />
            <PostCard key="mock-3" post={mockPost} />
          </div>

          {/* Sticky Create Post Button at the Bottom of Content */}
          <div className="sticky bottom-6 flex justify-center mt-10 z-10">
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="bg-white/10 dark:bg-white/10 text-black dark:text-white px-6 py-3 rounded-[20px] shadow-md hover:bg-white/5 dark:hover:bg-white/5 transition duration-200 border border-white/10 backdrop-blur-md hover:ring-2 hover:ring-indigo-400 hover:ring-offset-2"
            >
              Create Post
            </button>
          </div>
        </main>
      </div>

      {showCreateModal && (
        <CreatePostModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}

const SidebarLink = ({ icon: Icon, label }: { icon: React.ElementType; label: string }) => (
  <a
    href="#"
    className="flex items-center space-x-4 px-4 py-3 rounded-md hover:bg-gray-800 text-gray-300 hover:text-white transition"
  >
    <Icon className="w-5 h-5" />
    <span className="text-base">{label}</span>
  </a>
);