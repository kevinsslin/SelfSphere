import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { postId, userId, action } = req.body;
      
      // Validate required fields
      if (!postId) {
        return res.status(400).json({ message: 'Post ID is required' });
      }
      
      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }
      
      if (!action || (action !== 'like' && action !== 'unlike')) {
        return res.status(400).json({ message: 'Valid action (like/unlike) is required' });
      }
      
      // Check if post exists
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select('post_id, likes_count')
        .eq('post_id', postId)
        .single();
        
      if (postError || !postData) {
        return res.status(404).json({ message: 'Post not found' });
      }
      
      // Check if user exists
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('user_id')
        .eq('user_id', userId)
        .single();
        
      if (userError || !userData) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Handle like/unlike action
      if (action === 'like') {
        // Check if like already exists
        const { data: existingLike, error: likeError } = await supabase
          .from('likes')
          .select('like_id')
          .eq('user_id', userId)
          .eq('target_id', postId)
          .eq('target_type', 'Post')
          .single();
          
        if (existingLike) {
          return res.status(400).json({ message: 'User already liked this post' });
        }
        
        // Add like
        const { data: newLike, error: createError } = await supabase
          .from('likes')
          .insert([{
            user_id: userId,
            target_id: postId,
            target_type: 'Post'
          }])
          .select()
          .single();
          
        if (createError) {
          return res.status(500).json({ message: 'Failed to like post', error: createError.message });
        }
        
        // Update post likes count
        const newLikesCount = (postData.likes_count || 0) + 1;
        
        const { error: updateError } = await supabase
          .from('posts')
          .update({ likes_count: newLikesCount })
          .eq('post_id', postId);
          
        if (updateError) {
          return res.status(500).json({ message: 'Failed to update likes count', error: updateError.message });
        }
        
        return res.status(200).json({ 
          success: true, 
          message: 'Post liked successfully',
          likesCount: newLikesCount
        });
      }
      
      // Handle unlike action
      const { data: existingLike, error: likeError } = await supabase
        .from('likes')
        .select('like_id')
        .eq('user_id', userId)
        .eq('target_id', postId)
        .eq('target_type', 'Post')
        .single();
        
      if (!existingLike) {
        return res.status(400).json({ message: 'User has not liked this post yet' });
      }
      
      // Delete like
      const { error: deleteError } = await supabase
        .from('likes')
        .delete()
        .eq('like_id', existingLike.like_id);
        
      if (deleteError) {
        return res.status(500).json({ message: 'Failed to unlike post', error: deleteError.message });
      }
      
      // Update post likes count
      const newLikesCount = Math.max((postData.likes_count || 0) - 1, 0);
      
      const { error: updateError } = await supabase
        .from('posts')
        .update({ likes_count: newLikesCount })
        .eq('post_id', postId);
        
      if (updateError) {
        return res.status(500).json({ message: 'Failed to update likes count', error: updateError.message });
      }
      
      return res.status(200).json({ 
        success: true, 
        message: 'Post unliked successfully',
        likesCount: newLikesCount
      });
    } catch (error) {
      console.error('Error handling like action:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
} 