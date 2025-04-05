import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Type definitions matching the database schema exactly
export type User = {
  user_id: string;
  wallet_address: string;
  display_name?: string;
  avatar_url?: string;
  nationality?: string;
  gender?: string;
  date_of_birth?: string;
  issuing_state?: string;
  name?: string;
  passport_number?: string;
  expiry_date?: string;
  passport_verified?: boolean;
  verification_time?: string;
  created_at?: string;
  updated_at?: string;
};

export type Post = {
  post_id: string;
  user_id: string;
  post_contract_address?: string;
  title: string;
  content: string;
  anonymity_flag: boolean;
  allowed_viewers?: Record<string, unknown>;
  allowed_commenters?: Record<string, unknown>;
  disclosed_attributes?: Record<string, boolean>;
  status: 'pending' | 'posted' | 'cancelled';
  likes_count: number;
  reward_enabled: boolean;
  reward_type?: number;
  reward_contract?: string;
  created_at?: string;
  updated_at?: string;
};

export type Comment = {
  comment_id: string;
  post_id: string;
  user_id: string;
  content: string;
  likes_count: number;
  created_at?: string;
  updated_at?: string;
};

export type Like = {
  like_id: string;
  user_id: string;
  target_id: string;
  target_type: 'Post' | 'Comment';
  created_at?: string;
};

export type Reward = {
  reward_id: string;
  post_id: string;
  user_id: string;
  reward_type: number;
  status: 'pending' | 'claimed' | 'failed';
  created_at?: string;
}; 