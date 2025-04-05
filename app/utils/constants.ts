// Passport attributes that can be disclosed/verified
export const PASSPORT_ATTRIBUTES = [
  { key: 'nationality', label: 'Nationality' },
  { key: 'gender', label: 'Gender' },
  { key: 'issuing_state', label: 'Issuing State' },
  { key: 'name', label: 'Name' },
  { key: 'date_of_birth', label: 'Date of Birth' },
  { key: 'expiry_date', label: 'Expiry Date' }
];

// Reward types
export const REWARD_TYPES = [
  { id: 1, name: 'First Commenter Token', description: 'Award a token to the first person who comments on this post' },
  { id: 2, name: 'Participation NFT', description: 'Award an NFT to everyone who comments on this post' }
];

// Available restrictions
export const RESTRICTIONS = {
  NATIONALITY: 'nationality',
  GENDER: 'gender',
  AGE: 'age',
  ISSUING_STATE: 'issuing_state'
};

// Operation types for verification
export const OPERATION_TYPES = {
  POST: 'create_post',
  COMMENT: 'create_comment'
}; 