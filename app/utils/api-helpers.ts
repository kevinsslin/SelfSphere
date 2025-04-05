import { supabase } from '../../lib/supabase';
import type { PostData, CommentData, VerificationResult } from './types';

/**
 * Submit a verified post to the database
 */
export async function submitVerifiedPost(
  postData: PostData, 
  verificationResult: VerificationResult
) {
  if (!verificationResult || !verificationResult.isValid) {
    throw new Error('Invalid verification result');
  }

  if (!postData) {
    throw new Error('No post data provided');
  }

  // Create post in database
  const { data, error } = await supabase
    .from('posts')
    .insert([postData])
    .select()
    .single();
    
  if (error) {
    console.error("Error creating post:", error);
    throw new Error(`Failed to create post: ${error.message}`);
  }
  
  // If post has rewards enabled, log it for future processing
  if (postData.reward_enabled) {
    console.log(`Post with rewards created: ${data.post_id}, reward type: ${postData.reward_type}`);
  }
  
  return data;
}

/**
 * Submit a verified comment to the database
 */
export async function submitVerifiedComment(
  commentData: CommentData, 
  verificationResult: VerificationResult
) {
  if (!verificationResult || !verificationResult.isValid) {
    throw new Error('Invalid verification result');
  }

  if (!commentData) {
    throw new Error('No comment data provided');
  }

  // Check if the post exists
  const { data: postData, error: postError } = await supabase
    .from('posts')
    .select('allowed_commenters, reward_enabled, reward_type')
    .eq('post_id', commentData.post_id)
    .single();

  if (postError) {
    console.error("Error finding post:", postError);
    throw new Error(`Post not found: ${postError.message}`);
  }

  // Validate comment against post restrictions
  validateCommentRestrictions(postData.allowed_commenters, verificationResult);

  // Create comment
  const { data, error } = await supabase
    .from('comments')
    .insert([commentData])
    .select()
    .single();
    
  if (error) {
    console.error("Error creating comment:", error);
    throw new Error(`Failed to create comment: ${error.message}`);
  }
  
  // Process rewards if needed
  if (postData.reward_enabled) {
    await processRewards(commentData.post_id, commentData.user_id, postData.reward_type);
  }
  
  return data;
}

/**
 * Validate if a user is allowed to comment based on post restrictions
 */
function validateCommentRestrictions(
  restrictions: Record<string, unknown> | null, 
  verificationResult: VerificationResult
) {
  if (!restrictions) return;
  
  // Validate nationality restrictions
  if (restrictions.nationality && verificationResult.credentialSubject?.nationality) {
    const nationMode = (restrictions.nationality as { mode: string; countries: string[] }).mode;
    const nationList = (restrictions.nationality as { mode: string; countries: string[] }).countries;
    const userNationality = verificationResult.credentialSubject.nationality as string;
    
    if (nationMode === 'exclude' && nationList.includes(userNationality)) {
      throw new Error('User nationality is excluded from commenting');
    }
    
    if (nationMode === 'include' && !nationList.includes(userNationality)) {
      throw new Error('User nationality is not allowed to comment');
    }
  }
  
  // Validate gender restrictions
  if (restrictions.gender && verificationResult.credentialSubject?.gender) {
    const allowedGender = restrictions.gender as string;
    const userGender = verificationResult.credentialSubject.gender as string;
    
    if (allowedGender !== userGender) {
      throw new Error('User gender does not match restriction');
    }
  }
  
  // Validate age restrictions
  if (restrictions.minimumAge && verificationResult.credentialSubject?.date_of_birth) {
    const minimumAge = restrictions.minimumAge as number;
    const dob = verificationResult.credentialSubject.date_of_birth as string;
    const birthDate = new Date(dob);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    
    if (age < minimumAge) {
      throw new Error('User does not meet minimum age requirement');
    }
  }
  
  // Validate issuing state restrictions
  if (restrictions.issuing_state && verificationResult.credentialSubject?.issuing_state) {
    const allowedState = restrictions.issuing_state as string;
    const userState = verificationResult.credentialSubject.issuing_state as string;
    
    if (allowedState !== userState) {
      throw new Error('User issuing state does not match restriction');
    }
  }
}

/**
 * Process rewards for comments
 */
async function processRewards(postId: string, userId: string, rewardType: number) {
  try {
    // For reward type 1 (first commenter), check if this is the first comment
    if (rewardType === 1) {
      // Count existing rewards for this post
      const { count, error: countError } = await supabase
        .from('rewards')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId)
        .eq('reward_type', 1);
          
      if (countError || (count && count > 0)) {
        // This is not the first comment or there was an error
        return;
      }
    }
    
    // Create reward record
    await supabase
      .from('rewards')
      .insert([{
        post_id: postId,
        user_id: userId,
        reward_type: rewardType,
        status: 'pending'
      }]);
        
    console.log(`Reward (type ${rewardType}) created for user ${userId} on post ${postId}`);
  } catch (error) {
    console.error('Error processing rewards:', error);
  }
} 