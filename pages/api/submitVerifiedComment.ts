import type { NextApiRequest, NextApiResponse } from 'next';
import { submitVerifiedComment } from '../../app/utils/api-helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { commentData, verificationResult } = req.body;

    // Call the API helper function
    const data = await submitVerifiedComment(commentData, verificationResult);
    
    return res.status(200).json({
      status: 'success',
      data
    });
  } catch (error) {
    console.error('Error submitting verified comment:', error);
    return res.status(500).json({ 
      message: 'Error submitting verified comment',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 