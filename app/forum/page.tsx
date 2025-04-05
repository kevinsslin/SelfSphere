'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import NavBar from '../components/NavBar';
import PostCard from '../components/PostCard';
import PopularTopics from '../components/PopularTopics';
import CreatePostModal from '../components/CreatePostModal';
import Marquee from '../components/Marquee';
import { FaQuestionCircle, FaComments, FaCog } from 'react-icons/fa';
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

// TODO: remove this mock post
export const mockPosts = [
  {
    post_id: "1",
    title: "Exploring the Future of Decentralized Identity",
    content: "Decentralized identity has the potential to revolutionize how we manage personal data. In this post, I dive into the concepts and potential implementations of DID on Web3 platforms.",
    user_id: "user_001",
    created_at: "2024-01-12T09:20:00Z",
    likes_count: 78,
    comments_count: 12,
    user: {
      display_name: "ChainThinker"
    },
    disclosed_attributes: {
      age: 32,
      location: "San Francisco",
      verified_user: true,
      membership_level: "premium"
    }
  },
  {
    post_id: "2",
    title: "Quick Guide: Launching a DAO in 2025",
    content: "Ever wanted to create your own DAO? Here's a quick breakdown of the tools and steps you need to spin up a decentralized autonomous organization in just a few hours.",
    user_id: "user_002",
    created_at: "2025-03-22T18:00:00Z",
    likes_count: 54,
    comments_count: 9,
    user: {
      display_name: "MetaDAO"
    },
    disclosed_attributes: {
      age: 29,
      location: "Berlin",
      verified_user: false,
      membership_level: "standard"
    }
  },
  {
    post_id: "3",
    title: "How I Learned Solidity in 30 Days",
    content: "Solidity seemed intimidating at first, but after 30 days of focused learning and building, I'm confident enough to write smart contracts from scratch. Here's my roadmap.",
    user_id: "user_003",
    created_at: "2024-11-05T15:10:00Z",
    likes_count: 133,
    comments_count: 20,
    user: {
      display_name: "DevEth"
    },
    disclosed_attributes: {
      age: 24,
      location: "Taipei",
      verified_user: true,
      membership_level: "premium"
    }
  },
  {
    post_id: "4",
    title: "Should We Still Trust Centralized Exchanges?",
    content: "After the recent FTX collapse, I've been questioning the safety of keeping assets on CEXs. Let's discuss safer alternatives and personal custody.",
    user_id: "user_004",
    created_at: "2023-12-01T21:45:00Z",
    likes_count: 98,
    comments_count: 14,
    user: {
      display_name: "SkepticSatoshi"
    },
    disclosed_attributes: {
      age: 35,
      location: "London",
      verified_user: false,
      membership_level: "standard"
    }
  },
  {
    post_id: "5",
    title: "My Favorite ZK Projects Right Now",
    content: "Zero-Knowledge proofs are becoming more popular in scaling and privacy. Here are a few exciting projects I've been following closely.",
    user_id: "user_005",
    created_at: "2025-02-08T11:30:00Z",
    likes_count: 76,
    comments_count: 6,
    user: {
      display_name: "zkNinja"
    },
    disclosed_attributes: {
      age: 27,
      location: "Singapore",
      verified_user: true,
      membership_level: "premium"
    }
  },
  {
    post_id: "6",
    title: "How to Pitch a Web3 Startup to VCs",
    content: "I recently raised $500K for my dApp. Here's what worked in my pitch deck and what didn't. TLDR: storytelling matters!",
    user_id: "user_006",
    created_at: "2024-08-17T13:50:00Z",
    likes_count: 110,
    comments_count: 15,
    user: {
      display_name: "FounderFuel"
    },
    disclosed_attributes: {
      age: 30,
      location: "Toronto",
      verified_user: true,
      membership_level: "premium"
    }
  },
  {
    post_id: "7",
    title: "The Ethics of AI on Blockchain",
    content: "With AI agents now writing smart contracts and managing wallets, where do we draw the line on responsibility and decision-making?",
    user_id: "user_007",
    created_at: "2024-09-10T07:20:00Z",
    likes_count: 65,
    comments_count: 5,
    user: {
      display_name: "TechEthicist"
    },
    disclosed_attributes: {
      age: 38,
      location: "Amsterdam",
      verified_user: false,
      membership_level: "standard"
    }
  },
  {
    post_id: "8",
    title: "Web3 UX Still Sucks: Here's Why",
    content: "Wallet pop-ups, transaction delays, confusing gas fees — why hasn't the UX caught up with Web2? Let's rant and brainstorm improvements.",
    user_id: "user_008",
    created_at: "2025-01-14T10:05:00Z",
    likes_count: 89,
    comments_count: 13,
    user: {
      display_name: "PixelPusher"
    },
    disclosed_attributes: {
      age: 31,
      location: "Melbourne",
      verified_user: true,
      membership_level: "standard"
    }
  },
  {
    post_id: "9",
    title: "My DAO Just Got Rugged",
    content: "We trusted the wrong devs, and our treasury got drained. AMA if you want to avoid the same fate.",
    user_id: "user_009",
    created_at: "2025-04-01T16:00:00Z",
    likes_count: 23,
    comments_count: 3,
    user: {
      display_name: "DAOGriever"
    },
    disclosed_attributes: {
      age: 26,
      location: "Lisbon",
      verified_user: false,
      membership_level: "standard"
    }
  },
  {
    post_id: "10",
    title: "Beginner's Guide to On-Chain Data Analysis",
    content: "Dune, Flipside, Nansen… these tools helped me land a data analyst role in crypto. Here's how you can start analyzing wallets and protocols today.",
    user_id: "user_010",
    created_at: "2025-03-28T20:40:00Z",
    likes_count: 102,
    comments_count: 8,
    user: {
      display_name: "DataByte"
    },
    disclosed_attributes: {
      age: 23,
      location: "Seoul",
      verified_user: true,
      membership_level: "premium"
    }
  }
];

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
          .eq('status', 'posted')
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

      <div className="flex max-w-7xl mx-auto pt-16">
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
            <div className="grid gap-6 mt-6">
            {mockPosts.map((mockPost) => (
              <Link key={mockPost.post_id} href={`/forum/${mockPost.post_id}`}>
                <PostCard post={mockPost} />
              </Link>
            ))}
            </div>
            // <div className="text-center py-10 bg-white dark:bg-[#1a1a1b] rounded-lg shadow">
            //   <p className="text-xl text-gray-700 dark:text-white">No posts yet!</p>
            //   <p className="mt-2 text-gray-600">Be the first to create a post.</p>
            // </div>
          ) : (
            <div>
                <div className="grid gap-6 mt-6">
                {mockPosts.map((mockPost) => (
                  <Link key={mockPost.post_id} href={`/forum/${mockPost.post_id}`}>
                    <PostCard post={mockPost} />
                  </Link>
                ))}
                </div>
                <div className="grid gap-6">
                  {posts.map((post) => (
                    <Link key={post.post_id} href={`/forum/${post.post_id}`}>
                      <PostCard post={post} />
                    </Link>
                  ))}
                </div>
            </div>
          )}

          {/* Sticky Create Post Button at the Bottom of Content */}
          {!loading && (
            <div className="sticky bottom-6 flex justify-center mt-10 z-10">
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="bg-white/10 dark:bg-white/5 text-black dark:text-white px-6 py-3 rounded-[20px] shadow-md hover:bg-white/2 dark:hover:bg-white/2 transition duration-1000 border border-white/10 backdrop-blur-md hover:ring-1 hover:ring-indigo-400 hover:ring-offset-10 transform hover:scale-110"
              >
                Create Post
              </button>
            </div>
          )}
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