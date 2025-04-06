import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { supabase } from '../../lib/supabase';
import postAbi from '../../abi/Post.json';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        try {
            const { postId, commenterAddress } = req.body;
            
            // Validate input
            if (!postId) {
                return res.status(400).json({ message: 'Post ID is required' });
            }
            
            if (!commenterAddress) {
                return res.status(400).json({ message: 'Commenter address is required' });
            }
            
            // Get post contract address from database
            const { data: post, error: postError } = await supabase
                .from('posts')
                .select('post_contract_address')
                .eq('post_id', postId)
                .single();
                
            if (postError || !post?.post_contract_address) {
                console.error('Error finding post:', postError);
                return res.status(404).json({ 
                    message: 'Post not found or no contract address',
                    error: postError?.message 
                });
            }
            
            console.log('Found post with contract address:', post.post_contract_address);
            
            // Interact with the blockchain
            if (!process.env.NEXT_PUBLIC_CELO_RPC) {
                throw new Error('CELO_RPC environment variable is not set');
            }
            
            const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_CELO_RPC);
            const privateKey = process.env.PRIVATE_KEY;
            
            if (!privateKey) {
                return res.status(500).json({ message: 'Private key is not configured on the server' });
            }
            
            // Create contract instance
            const signer = new ethers.Wallet(privateKey, provider);
            const contract = new ethers.Contract(post.post_contract_address, postAbi, signer);
            
            // Send reward token
            try {
                const tx = await contract.sendRewardToken(commenterAddress);
                console.log('Transaction sent:', tx.hash);
                
                // Wait for the transaction to be mined
                const receipt = await tx.wait();
                console.log('Transaction confirmed:', receipt);
                
                // Update rewards table
                const { data: rewardData, error: rewardError } = await supabase
                    .from('rewards')
                    .insert([{
                        post_id: postId,
                        user_id: req.body.userId, // The commenter's user ID
                        reward_type: 1, // Assuming 1 is the token reward type
                        status: 'claimed'
                    }])
                    .select()
                    .single();
                    
                if (rewardError) {
                    console.error('Error recording reward:', rewardError);
                }
                
                return res.status(200).json({ 
                    success: true, 
                    message: 'Reward sent successfully',
                    txHash: tx.hash
                });
            } catch (txError) {
                console.error('Error sending reward token:', txError);
                return res.status(500).json({ 
                    message: 'Error sending reward token', 
                    error: txError instanceof Error ? txError.message : 'Unknown error'
                });
            }
        } catch (error) {
            console.error('Error in reward handler:', error);
            return res.status(500).json({ 
                message: 'Server error', 
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    } else {
        return res.status(405).json({ message: 'Method not allowed' });
    }
}
