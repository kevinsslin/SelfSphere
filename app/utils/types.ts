// Verification related types
export type VerificationResult = {
  isValid: boolean;
  isValidDetails?: string;
  credentialSubject?: Record<string, unknown>;
};

// Post related types
export type PostData = {
  title: string;
  content: string;
  user_id: string;
  allowed_commenters: Record<string, unknown> | null;
  disclosed_attributes: Record<string, boolean>;
  reward_enabled: boolean;
  reward_type: number | null;
};

// Comment related types
export type CommentData = {
  content: string;
  post_id: string;
  user_id: string;
  disclosed_attributes: Record<string, boolean>;
}; 