-- Create UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table - stores user basic info, wallet address and passport credentials
CREATE TABLE IF NOT EXISTS users (
  user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  avatar_url VARCHAR(255),
  -- Passport verification data
  nationality VARCHAR(100),
  gender VARCHAR(10),
  date_of_birth VARCHAR(20),
  issuing_state VARCHAR(100),
  name VARCHAR(255),
  passport_number VARCHAR(50),
  expiry_date VARCHAR(20),
  passport_verified BOOLEAN DEFAULT false,
  verification_time TIMESTAMP WITH TIME ZONE,
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Posts Table - stores all published posts
CREATE TABLE IF NOT EXISTS posts (
  post_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  title VARCHAR(255),
  content TEXT,
  anonymity_flag BOOLEAN DEFAULT false,
  allowed_viewers JSONB, -- e.g., {"nationality": "Taiwan", "min_age": 20}
  allowed_commenters JSONB, -- comment permission rules
  disclosed_attributes JSONB, -- User-disclosed passport attributes, e.g. {"nationality": true, "gender": true}
  status VARCHAR(20) DEFAULT 'pending', -- post status: pending, posted, cancelled
  likes_count INTEGER DEFAULT 0,
  reward_enabled BOOLEAN DEFAULT false,
  reward_type INTEGER, -- 1: first commenter gets token, 2: all commenters get NFT
  reward_contract VARCHAR(255), -- smart contract address
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Comments Table - stores all comments
CREATE TABLE IF NOT EXISTS comments (
  comment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(post_id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  content TEXT,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Likes Table - tracks likes on posts and comments
CREATE TABLE IF NOT EXISTS likes (
  like_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  target_id UUID, -- can reference either post_id or comment_id
  target_type VARCHAR(20), -- "Post" or "Comment"
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Rewards Table - tracks rewards eligibility and status
CREATE TABLE IF NOT EXISTS rewards (
  reward_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(post_id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  reward_type INTEGER NOT NULL, -- 1: first commenter token, 2: commenter NFT
  status VARCHAR(20) DEFAULT 'pending', -- pending, claimed, failed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Create index for post_id + user_id combination to ensure uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS rewards_post_user_idx ON rewards (post_id, user_id); 