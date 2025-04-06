'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { supabase } from '../../../../lib/supabase';
import type { Post, Comment } from '../../../../lib/supabase';
import NavBar from '../../../components/NavBar';
import SelfQRcodeWrapper from '@selfxyz/qrcode';
import type { SelfApp } from '@selfxyz/qrcode';
import { SelfAppBuilder } from '@selfxyz/qrcode';
import { v4 as uuidv4 } from 'uuid';
import { logo } from '../../../content/playgroundAppLogo';
import PopularTopics from '../../../components/PopularTopics';
import { FaQuestionCircle, FaComments, FaCog, FaDollarSign } from 'react-icons/fa';
import Link from 'next/link';

interface PostWithUser extends Post {
  user?: { display_name: string };
  allowed_commenters?: {
    nationality?: { mode: string; countries: string[] };
    gender?: string;
    minimumAge?: number;
    issuing_state?: string;
  };
}

interface CommentWithUser extends Comment {
  user?: { display_name: string };
}

export default function PostPage() {
  const params = useParams();
  const postId = params?.id as string;
  const { address } = useAccount();
  const [isAuthor, setAuthor] = useState(false);
  const [post, setPost] = useState<PostWithUser | null>(null);
  const [comments, setComments] = useState<CommentWithUser[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [commentLoading, setCommentLoading] = useState(false);
  const [canComment, setCanComment] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [commentId, setCommentId] = useState<string>('');
  const [showQRCode, setShowQRCode] = useState(false);

  const fetchPostAndComments = useCallback(async () => {
    if (!postId) return;
    try {
      setLoading(true);
      const { data: postData } = await supabase
        .from('posts')
        .select('*, user:users(display_name)')
        .eq('post_id', postId)
        .single();
      setPost(postData);

      if (!postData) throw new Error('Post not found');

      const { data: userWalletData } = await supabase
        .from('users')
        .select('wallet_address')
        .eq('user_id', postData.user_id)
        .single();

      // Compare wallet addresses to determine if current user is the author
      console.log("User Wallet Data", userWalletData?.wallet_address);
      console.log("Current User Address", address);
      if (userWalletData?.wallet_address == address) {
        setAuthor(true);
      } else {
        setAuthor(false);
      }

      const { data: commentsData } = await supabase
        .from('comments')
        .select('*, user:users(display_name)')
        .eq('post_id', postId)
        .eq('status', 'posted')
        .order('created_at', { ascending: false });

      setComments(commentsData || []);
      setCanComment(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [postId, address]);

  useEffect(() => { fetchPostAndComments(); }, [fetchPostAndComments]);

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setCommentLoading(true);
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('user_id')
        .eq('wallet_address', address)
        .single();
      const { data: newComment } = await supabase
        .from('comments')
        .insert([{ post_id: postId, content: commentText, user_id: userData.user_id, status: 'pending' }])
        .select()
        .single();
      setCommentId(newComment.comment_id);
      setShowQRCode(true);
      setShowVerification(true);
    } catch (err) {
      console.error(err);
      setCommentLoading(false);
    }
  };

  const handleVerificationSuccess = async () => {
    try {
      await supabase.from('comments').update({ status: 'posted' }).eq('comment_id', commentId);
      const { data: updatedComments } = await supabase
        .from('comments')
        .select('*, user:users(display_name)')
        .eq('post_id', postId)
        .order('created_at');
      setComments(updatedComments || []);
      setCommentText('');
      setShowVerification(false);
      setShowQRCode(false);
      setCommentLoading(false);
    } catch (err) {
      console.error(err);
      setCommentLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#0b0b0b] text-white flex items-center justify-center">Loading...</div>;
  if (!post) return <div className="min-h-screen bg-[#0b0b0b] text-red-500 flex items-center justify-center">Post not found</div>;

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white pb-24">
      <NavBar />
      <div className="flex max-w-7xl mx-auto pt-16">
        <aside className="hidden md:block fixed top-16 left-0 w-64 h-[calc(100vh-4rem)] bg-[#1a1a1b] text-white pt-4 px-4 border-r border-gray-800">
          <SidebarLink icon={FaQuestionCircle} label="Questions" />
          <SidebarLink icon={FaComments} label="Discussions" />
          <SidebarLink icon={FaCog} label="Settings" />
          <PopularTopics />
        </aside>

        <main className="flex-1 pt-8 px-4 ml-64">
          <div className="bg-[#1a1a1b] rounded-xl p-6 shadow border border-gray-700 space-y-4">
            <div className="flex gap-2 text-sm text-gray-400 items-center">
              <img src="/api/placeholder/32/32" className="w-6 h-6 rounded-full" alt="avatar" />
              <span className="font-medium">{post.user?.display_name}</span>
              <span>• {new Date(post.created_at || '').toLocaleString()}</span>
            </div>
            <h1 className="text-2xl font-extrabold">{post.title}</h1>
            <p className="whitespace-pre-line text-gray-300">{post.content}</p>
          </div>

          <div className="mt-10 mb-32">
            <h2 className="text-lg font-semibold mb-4">All comments</h2>
            <div className="space-y-6">
              {comments.map(comment => (
                <div
                  key={comment.comment_id}
                  className="group bg-[#1a1a1b] p-4 rounded-lg border border-gray-700 relative"
                >
                  <div className="text-sm text-gray-400 mb-1">
                    {comment.user?.display_name} • {new Date(comment.created_at || '').toLocaleString()}
                  </div>
                  <div className="text-white text-base">{comment.content}</div>
                  {isAuthor && (
                    <button
                      className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 bg-indigo-600 hover:bg-indigo-500 transition text-white px-3 py-1 text-sm rounded-full flex items-center gap-2"
                      onClick={() => alert('Reward coming soon!')}
                    >
                      <FaDollarSign className="text-xs" /> Reward
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      {canComment && (
        <div className="fixed bottom-0 left-64 w-[calc(100%-16rem)] bg-[#1a1a1b] border-t border-gray-700 p-4 z-50">
          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="Write a comment..."
              className="flex-1 px-4 py-2 rounded-lg bg-[#2a2a2b] border border-gray-600 text-white placeholder-gray-400"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <button
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg"
              disabled={!commentText.trim() || commentLoading}
              onClick={handleAddComment}
            >
              {commentLoading ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      )}

      {showVerification && showQRCode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1b] p-6 rounded-xl max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Verify Your Identity</h3>
            <p className="text-gray-400 mb-4">Scan QR to verify identity before posting comment.</p>
            <div className="flex justify-center mb-4">
              <SelfQRcodeWrapper
                selfApp={new SelfAppBuilder({
                  appName: 'SelfSphere',
                  scope: 'self-sphere-comment',
                  endpoint: 'https://self-sphere.vercel.app/api/verify-comment',
                  logoBase64: logo,
                  userId: commentId,
                  disclosures: {
                    nationality: true,
                    gender: true,
                    date_of_birth: true,
                    minimumAge: 18,
                    issuing_state: true,
                  },
                  devMode: true,
                } as Partial<SelfApp>).build()}
                onSuccess={handleVerificationSuccess}
              />
            </div>
            <button
              className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
              onClick={() => {
                setShowQRCode(false);
                setShowVerification(false);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const SidebarLink = ({ icon: Icon, label }: { icon: React.ElementType; label: string }) => (
  <Link href="#" className="flex items-center space-x-4 px-4 py-3 rounded-md hover:bg-gray-800 text-gray-300 hover:text-white">
    <Icon className="w-5 h-5" />
    <span>{label}</span>
  </Link>
);
