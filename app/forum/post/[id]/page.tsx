'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { supabase } from '../../../../lib/supabase';
import NavBar from '../../../components/NavBar';
import PopularTopics from '../../../components/PopularTopics';
import { FaQuestionCircle, FaComments, FaCog, FaDollarSign } from 'react-icons/fa';

// Types
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
  const params = useParams();
  const id = params?.id as string;
  const { address } = useAccount();
  const [isAuthor, setAuthor] = useState(true);
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [commentLoading, setCommentLoading] = useState(false);
  const [canComment, setCanComment] = useState(false);
  const [clickedCommentId, setClickedCommentId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPostAndComments() {
      try {
        const { data: postData } = await supabase
          .from('posts')
          .select('*, user:users(display_name)')
          .eq('post_id', id)
          .single();

        if (!postData) throw new Error('Post not found');

        const { data: userWalletData } = await supabase
          .from('users')
          .select('wallet_address')
          .eq('user_id', postData.user_id)
          .single();

        // Compare wallet addresses to determine if current user is the author
        console.log("User Wallet Data", userWalletData?.wallet_address);
        console.log("Current User Address", address);
        if (userWalletData?.wallet_address != address) {
          console.log("no");
          setAuthor(true);
        } else {
          setAuthor(false);
        }

        const { data: commentsData } = await supabase
          .from('comments')
          .select('*, user:users(display_name)')
          .eq('post_id', id)
          .order('created_at');

        setPost(postData);
        setComments(commentsData || []);
        setCanComment(true);

        console.log('Author wallet address:', userWalletData?.wallet_address);
      } catch {
        const fallbackPost: Post = {
          post_id: '1',
          title: 'Exploring the Future of Decentralized Identity',
          content: `Decentralized identity has the potential to revolutionize how we manage personal data. 
In this post, I dive into the core concepts, use cases, and future potential of DID across different Web3 platforms. If you've worked with Ceramic, Spruce, or any DID-based projects, I'd love to hear your thoughts and experiences!`,
          user_id: 'user_001',
          created_at: '2024-01-12T09:20:00Z',
          likes_count: 78,
          user: { display_name: 'ChainThinker' },
          disclosed_attributes: {
            age: 32,
            location: 'San Francisco',
            verified_user: true,
            membership_level: 'premium',
          },
        };

        const fallbackComments: Comment[] = [
          {
            comment_id: 'c1',
            content: 'DID is one of the most exciting concepts this year. Looking forward to seeing more real-world use cases!',
            created_at: '2024-01-12T10:15:00Z',
            user: { display_name: 'OnChainSocialWorker' },
          },
          {
            comment_id: 'c2',
            content: 'Personal data sovereignty is so important. Identity verification shouldn\'t depend on big tech platforms.',
            created_at: '2024-01-12T10:30:00Z',
            user: { display_name: 'PrivacyAdvocate' },
          },
          {
            comment_id: 'c3',
            content: 'Self-sovereign identity sounds promising, but I think there are still many UX hurdles for mainstream adoption.',
            created_at: '2024-01-12T10:45:00Z',
            user: { display_name: 'Web3CommunityOrg' },
          },
          {
            comment_id: 'c4',
            content: 'Have you experimented with Ceramic or Spruce? I\'ve been diving into their SDKs lately.',
            created_at: '2024-01-12T11:00:00Z',
            user: { display_name: 'ZKBeliever' },
          },
        ];

        setPost(fallbackPost);
        setComments(fallbackComments);
        setCanComment(true);
      } finally {
        setLoading(false);
      }
    }

    fetchPostAndComments();
  }, [id, address]);

  const handleAddComment = async () => {
    if (!commentText.trim()) return;

    setCommentLoading(true);

    try {
      const { error } = await supabase.from('comments').insert([
        {
          post_id: post?.post_id,
          content: commentText,
          user_id: address,
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;

      setComments([
        ...comments,
        {
          comment_id: Math.random().toString(36).substring(2),
          content: commentText,
          created_at: new Date().toISOString(),
          user: { display_name: 'You' },
        },
      ]);
      setCommentText('');
    } catch (error) {
      console.error('Failed to post comment:', error);
    } finally {
      setCommentLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white pb-24">
      <NavBar />
      <div className="flex max-w-7xl mx-auto pt-16">
        <aside className="hidden md:block fixed top-16 left-0 w-64 h-[calc(100vh-4rem)] bg-[#1a1a1b] text-white pt-4 px-4 overflow-hidden border-r border-gray-800">
          <div className="space-y-2 text-sm">
            <SidebarLink icon={FaQuestionCircle} label="Questions" />
            <SidebarLink icon={FaComments} label="Discussions" />
            <SidebarLink icon={FaCog} label="Settings" />
          </div>
          <hr className="border-gray-700 my-4" />
          <h3 className="text-md font-semibold mb-2 text-white/80">What's happening</h3>
          <PopularTopics />
        </aside>

        <main className="flex-1 pt-8 px-4 ml-64 relative">
          {loading ? (
            <div className="animate-bounce animate-once animate-duration-500 animate-ease-in-out text-gray-500">Loading post...</div>
          ) : post ? (
            <div className="space-y-6">
              <div className="bg-[#1a1a1b] rounded-xl p-6 shadow space-y-4 border border-gray-700">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <img src="/api/placeholder/32/32" className="w-6 h-6 rounded-full" />
                  <span className="font-medium">{post.user?.display_name}</span>
                  <span>• {new Date(post.created_at).toLocaleString()}</span>
                </div>
                <h1 className="text-2xl font-extrabold text-white leading-snug">{post.title}</h1>
                <p className="whitespace-pre-line text-gray-300 text-base leading-relaxed">{post.content}</p>

                {post.disclosed_attributes && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {'age' in post.disclosed_attributes && (
                      <span className="bg-gray-800 text-sm text-gray-300 px-3 py-1 rounded-full">age: {post.disclosed_attributes.age}</span>
                    )}
                    {'location' in post.disclosed_attributes && (
                      <span className="bg-gray-800 text-sm text-gray-300 px-3 py-1 rounded-full">location: {post.disclosed_attributes.location}</span>
                    )}
                    {post.disclosed_attributes.verified_user && (
                      <span className="bg-indigo-700 text-sm text-white px-3 py-1 rounded-full">verified user: true</span>
                    )}
                    {'membership_level' in post.disclosed_attributes && (
                      <span className="bg-gray-700 text-sm text-indigo-300 px-3 py-1 rounded-full">membership level: {post.disclosed_attributes.membership_level}</span>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-10 mb-32">
                <h2 className="text-lg font-semibold mb-4 text-white/90">All comments</h2>
                {comments.length === 0 ? (
                  <div className="text-gray-400">No comments yet.</div>
                ) : (
                  <div className="space-y-6">
                    {comments.map((comment) => (
                      <div
                        key={comment.comment_id}
                        className={`group bg-[#1a1a1b] p-4 rounded-lg border border-gray-700 flex justify-between items-center relative ${clickedCommentId === comment.comment_id ? 'animate-shake-intense' : ''}`}
                      >
                        <div>
                          <div className="text-sm text-gray-400 mb-1">
                            {comment.user?.display_name} • {new Date(comment.created_at).toLocaleString()}
                          </div>
                          <div className="text-white text-base">{comment.content}</div>
                        </div>
                        {isAuthor && (
                          <button
                            onClick={() => {
                              setClickedCommentId(comment.comment_id);
                              setTimeout(() => setClickedCommentId(null), 600);
                            }}
                            className={`absolute right-4 top-4 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-full flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 ${clickedCommentId === comment.comment_id ? 'animate-pulse' : ''}`}
                          >
                            <FaDollarSign className="text-xs" /> Reward
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-red-500">Post not found.</div>
          )}
        </main>
      </div>

      {canComment && (
        <div className="fixed bottom-0 left-64 w-[calc(100%-16rem)] bg-[#1a1a1b] border-t border-gray-700 p-4 z-50">
          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="Write a comment..."
              className="flex-1 px-4 py-2 rounded-lg bg-[#2a2a2b] border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <button
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg disabled:opacity-40"
              disabled={!commentText.trim() || commentLoading}
              onClick={handleAddComment}
            >
              {commentLoading ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const SidebarLink = ({ icon: Icon, label }: { icon: React.ElementType; label: string }) => (
  <a href="#" className="flex items-center space-x-4 px-4 py-3 rounded-md hover:bg-gray-800 text-gray-300 hover:text-white transition">
    <Icon className="w-5 h-5" />
    <span className="text-base">{label}</span>
  </a>
);
