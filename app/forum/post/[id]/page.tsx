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
import { FaQuestionCircle, FaComments, FaCog } from 'react-icons/fa';
import Link from 'next/link';

interface PostWithUser extends Post {
  user?: {
    display_name: string;
  };
  allowed_commenters?: {
    nationality?: {
      mode: string;
      countries: string[];
    };
    gender?: string;
    minimumAge?: number;
    issuing_state?: string;
  };
}

interface CommentWithUser extends Comment {
  user?: {
    display_name: string;
  };
}

export default function PostPage() {
  const params = useParams();
  const postId = params?.id as string;
  const { address } = useAccount();
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
      
      // Fetch post with user info
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select('*, user:users(display_name)')
        .eq('post_id', postId)
        .single();

      if (postError) throw postError;
      setPost(postData);

      // Fetch comments for this post with posted status and user info
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('*, user:users(display_name)')
        .eq('post_id', postId)
        .eq('status', 'posted')
        .order('created_at', { ascending: false });

      if (commentsError) throw commentsError;
      setComments(commentsData || []);
      setCanComment(true);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchPostAndComments();
  }, [fetchPostAndComments]);

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setCommentLoading(true);

    try {
      // First, get the user_id from users table using wallet address
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('user_id')
        .eq('wallet_address', address)
        .single();

      if (userError) throw userError;
      if (!userData) throw new Error('User not found');

      // Check for any pending comments by this user
      const { data: pendingComments, error: pendingError } = await supabase
        .from('comments')
        .select('comment_id')
        .eq('post_id', postId)
        .eq('user_id', userData.user_id)
        .eq('status', 'pending');

      if (pendingError) throw pendingError;

      // If there are pending comments, mark them as failed
      if (pendingComments && pendingComments.length > 0) {
        const { error: updateError } = await supabase
          .from('comments')
          .update({ status: 'failed' })
          .in('comment_id', pendingComments.map(c => c.comment_id));

        if (updateError) throw updateError;
      }

      // Create a new pending comment
      const { data: newComment, error: commentError } = await supabase
        .from('comments')
        .insert([
          {
            post_id: postId,
            content: commentText,
            user_id: userData.user_id,
            status: 'pending'
          }
        ])
        .select()
        .single();

      if (commentError) throw commentError;
      if (!newComment) throw new Error('Failed to create comment');

      // Set the new comment ID and show QR code
      setCommentId(newComment.comment_id);
      setShowQRCode(true);
      setShowVerification(true);
    } catch (error) {
      console.error('Failed to create comment:', error);
      setCommentLoading(false);
    }
  };

  const handleVerificationSuccess = async () => {
    try {
      console.log('Verification successful, updating comment status');
      
      // Update comment status to posted
      const { error } = await supabase
        .from('comments')
        .update({ status: 'posted' })
        .eq('comment_id', commentId);

      if (error) throw error;

      // Refresh comments
      const { data: commentsData } = await supabase
        .from('comments')
        .select('*, user:users(display_name)')
        .eq('post_id', postId)
        .order('created_at');

      setComments(commentsData || []);
      setCommentText('');
      setShowVerification(false);
      setShowQRCode(false);
      setCommentLoading(false);
      
      console.log('Comment verified successfully');
    } catch (error) {
      console.error('Failed to verify comment:', error);
      setCommentLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0b0b] text-white flex items-center justify-center">
        <div className="text-xl">Loading post...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-[#0b0b0b] text-white flex items-center justify-center">
        <div className="text-xl text-red-500">Post not found</div>
      </div>
    );
  }

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
          <h3 className="text-md font-semibold mb-2 text-white/80">What&apos;s happening</h3>
          <PopularTopics />
        </aside>

        <main className="flex-1 pt-8 px-4 ml-64 relative">
          <div className="space-y-6">
            <div className="bg-[#1a1a1b] rounded-xl p-6 shadow space-y-4 border border-gray-700">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <img src="/api/placeholder/32/32" alt="user avatar" className="w-6 h-6 rounded-full" />
                <span className="font-medium">{post.user?.display_name}</span>
                <span>• {new Date(post.created_at || '').toLocaleString()}</span>
              </div>
              <h1 className="text-2xl font-extrabold text-white leading-snug">{post.title}</h1>
              <p className="whitespace-pre-line text-gray-300 text-base leading-relaxed">{post.content}</p>

              {/* 🔻 Add metadata tags here */}
              {post.disclosed_attributes && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {'age' in post.disclosed_attributes && (
                    <span className="bg-gray-800 text-sm text-gray-300 px-3 py-1 rounded-full">
                      age: {post.disclosed_attributes.age}
                    </span>
                  )}
                  {'nationality' in post.disclosed_attributes && (
                    <span className="bg-gray-800 text-sm text-gray-300 px-3 py-1 rounded-full">
                      nationality: {post.disclosed_attributes.nationality}
                    </span>
                  )}
                  {'gender' in post.disclosed_attributes && (
                    <span className="bg-gray-800 text-sm text-gray-300 px-3 py-1 rounded-full">
                      gender: {post.disclosed_attributes.gender}
                    </span>
                  )}
                  {'issuing_state' in post.disclosed_attributes && (
                    <span className="bg-gray-800 text-sm text-gray-300 px-3 py-1 rounded-full">
                      issuing state: {post.disclosed_attributes.issuing_state}
                    </span>
                  )}
                  {'name' in post.disclosed_attributes && (
                    <span className="bg-gray-800 text-sm text-gray-300 px-3 py-1 rounded-full">
                      name: {post.disclosed_attributes.name}
                    </span>
                  )}
                  {'passport_number' in post.disclosed_attributes && (
                    <span className="bg-gray-800 text-sm text-gray-300 px-3 py-1 rounded-full">
                      passport number: {post.disclosed_attributes.passport_number}
                    </span>
                  )}
                  {'expiry_date' in post.disclosed_attributes && (
                    <span className="bg-gray-800 text-sm text-gray-300 px-3 py-1 rounded-full">
                      expiry date: {post.disclosed_attributes.expiry_date}
                    </span>
                  )}
                  {'date_of_birth' in post.disclosed_attributes && (
                    <span className="bg-gray-800 text-sm text-gray-300 px-3 py-1 rounded-full">
                      date of birth: {post.disclosed_attributes.date_of_birth}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="mt-10 mb-32">
              <h2 className="text-lg font-semibold mb-4 text-white/90">All comments</h2>
              
              {/* Comment Requirements */}
              {post.allowed_commenters && (
                <div className="bg-[#1a1a1b] p-4 rounded-lg border border-gray-700 mb-6">
                  <h3 className="text-md font-semibold mb-2 text-white/90">Comment Requirements</h3>
                  <div className="space-y-2 text-sm text-gray-300">
                    {post.allowed_commenters.nationality && (
                      <p>• Nationality verification required: {post.allowed_commenters.nationality.countries.join(', ')}</p>
                    )}
                    {post.allowed_commenters.gender && (
                      <p>• Gender verification required: {post.allowed_commenters.gender === 'M' ? 'Male' : post.allowed_commenters.gender === 'F' ? 'Female' : 'Other/Non-binary'}</p>
                    )}
                    {post.allowed_commenters.minimumAge && post.allowed_commenters.minimumAge > 0 && (
                      <p>• Minimum age: {post.allowed_commenters.minimumAge}</p>
                    )}
                    {post.allowed_commenters.issuing_state && (
                      <p>• Issuing state verification required: {post.allowed_commenters.issuing_state}</p>
                    )}
                  </div>
                </div>
              )}

              {comments.length === 0 ? (
                <div className="text-gray-400">No comments yet.</div>
              ) : (
                <div className="space-y-6">
                  {comments.map((comment) => (
                    <div key={comment.comment_id} className="bg-[#1a1a1b] p-4 rounded-lg border border-gray-700">
                      <div className="text-sm text-gray-400 mb-1">
                        {comment.user?.display_name} • {new Date(comment.created_at || '').toLocaleString()}
                      </div>
                      <div className="text-white text-base">{comment.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Comment input fixed at bottom */}
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
              type="button"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg disabled:opacity-40"
              disabled={!commentText.trim() || commentLoading}
              onClick={handleAddComment}
            >
              {commentLoading ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      )}

      {/* Self QR Code Modal */}
      {showVerification && showQRCode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1b] p-6 rounded-xl max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Verify Your Identity</h3>
            <p className="text-gray-400 mb-4">
              Please scan this QR code with your Self app to verify your identity and post your comment.
            </p>
            <div className="flex justify-center mb-4">
              {commentId && post && (
                <SelfQRcodeWrapper
                  selfApp={new SelfAppBuilder({
                    appName: "SelfSphere",
                    scope: "self-sphere-comment",
                    endpoint: "https://6317-111-235-226-130.ngrok-free.app/api/verify-comment",
                    logoBase64: logo,
                    userId: commentId,
                    disclosures: {
                      nationality: !!post.allowed_commenters?.nationality,
                      gender: !!post.allowed_commenters?.gender,
                      date_of_birth: post.allowed_commenters?.minimumAge !== undefined,
                      minimumAge: post.allowed_commenters?.minimumAge,
                      issuing_state: !!post.allowed_commenters?.issuing_state,
                    },
                    devMode: true,
                  } as Partial<SelfApp>).build()}
                  onSuccess={handleVerificationSuccess}
                  darkMode={false}
                />
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setShowVerification(false);
                setShowQRCode(false);
                setCommentLoading(false);
              }}
              className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
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
  <Link href="/" className="flex items-center space-x-4 px-4 py-3 rounded-md hover:bg-gray-800 text-gray-300 hover:text-white transition">
    <Icon className="w-5 h-5" />
    <span className="text-base">{label}</span>
  </Link>
);