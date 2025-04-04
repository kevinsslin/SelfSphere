import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Type definitions for tables based on the PRD
export type User = {
  user_id: string;
  wallet_address: string;
  display_name?: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
};

export type Post = {
  post_id: string;
  user_id: string;
  title: string;
  content: string;
  anonymity_flag: boolean;
  allowed_viewers?: Record<string, unknown>;
  allowed_commenters?: Record<string, unknown>;
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

export type Reward = {
  reward_id: string;
  post_id: string;
  user_id: string;
  reward_type: number;
  status: 'pending' | 'claimed' | 'failed';
  created_at?: string;
}; 