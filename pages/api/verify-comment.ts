import type { NextApiRequest, NextApiResponse } from 'next';
import { 
    getUserIdentifier, 
    SelfBackendVerifier
} from '@selfxyz/core';
import { supabase } from '../../lib/supabase';
import { ethers } from 'ethers';
import abi from '../../abi/Post.json';
import { calculateAge } from '../../app/utils/ageCalculator';
import type { Country3LetterCode } from '@selfxyz/core/dist/common/src/constants/countries';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        try {
            const { proof, publicSignals } = req.body;
            
            const commentId = await getUserIdentifier(publicSignals);
            console.log("Extracted commentId from verification result:", commentId);

            if (!proof || !publicSignals) {
                return res.status(400).json({ message: 'Proof and publicSignals are required' });
            }

            if (!commentId) {
                return res.status(400).json({ message: 'Comment ID is required but not found' });
            }
            
            // First, get the pending comment to get post_id
            const { data: pendingComment, error: commentError } = await supabase
                .from('comments')
                .select('post_id')
                .eq('comment_id', commentId)
                .eq('status', 'pending')
                .single();
                
            if (commentError) {
                console.error('Error finding pending comment:', commentError);
                return res.status(404).json({ 
                    message: 'No pending comment found with the specified ID',
                    error: commentError.message 
                });
            }
            
            console.log('Found pending comment:', pendingComment);

            // Then, get the post contract address and restrictions using post_id
            const { data: post, error: postError } = await supabase
                .from('posts')
                .select('post_contract_address, allowed_commenters')
                .eq('post_id', pendingComment.post_id)
                .single();

            if (postError || !post?.post_contract_address) {
                console.error('Error finding post:', postError);
                return res.status(404).json({ 
                    message: 'Post not found or no contract address',
                    error: postError?.message 
                });
            }

            console.log('Found post:', post);
            
            // Configure verifier based on post restrictions
            const configuredVerifier = new SelfBackendVerifier(
                "self-sphere-comment",
                process.env.NEXT_PUBLIC_API_ENDPOINT as string,
                "uuid",
                true // Enable mock passport
            );
            
            // Set up verification options based on post restrictions
            if (post.allowed_commenters?.minimumAge) {
                configuredVerifier.setMinimumAge(post.allowed_commenters.minimumAge);
                console.log("Set minimum age:", post.allowed_commenters.minimumAge);
            }

            if (post.allowed_commenters?.nationality?.countries?.length > 0) {
                configuredVerifier.setNationality(
                    post.allowed_commenters.nationality.countries[0] as Country3LetterCode
                );
                console.log("Set nationality:", post.allowed_commenters.nationality.countries[0]);
            }

            console.log("Starting verification with proof and publicSignals");
            const result = await configuredVerifier.verify(proof, publicSignals);
            console.log("Verification result:", result);

            if (result.isValid) {
                // On-chain interaction
                const provider = new ethers.JsonRpcProvider("https://alfajores-forno.celo-testnet.org/");
                const privateKey = process.env.PRIVATE_KEY;
                const contractAddress = post.post_contract_address;
                
                if (privateKey && contractAddress) {
                    const signer = new ethers.Wallet(privateKey, provider);
                    const contract = new ethers.Contract(contractAddress, abi, signer);
                    
                    try {
                        // Check if date of birth is required and provided
                        const requiresDateOfBirth = post.allowed_commenters?.minimumAge !== undefined;
                        const hasDateOfBirth = result.credentialSubject?.date_of_birth !== undefined;

                        console.log("Requires date of birth:", requiresDateOfBirth);
                        console.log("Has date of birth:", hasDateOfBirth);
                        
                        let age: number | undefined;
                        
                        if (requiresDateOfBirth) {
                            if (!hasDateOfBirth) {
                                throw new Error('Date of birth is required but not provided in verification result');
                            }
                            
                            const dateOfBirth = result.credentialSubject.date_of_birth as string;
                            console.log("Date of birth from verification:", dateOfBirth);
                            
                            age = calculateAge(dateOfBirth);
                            console.log("Calculated age:", age);
                            
                            if (Number.isNaN(age)) {
                                throw new Error('Invalid age calculated from date of birth');
                            }
                            
                            // Check if age meets minimum requirement
                            if (age < post.allowed_commenters.minimumAge) {
                                throw new Error(`Age ${age} does not meet minimum requirement of ${post.allowed_commenters.minimumAge}`);
                            }
                        }

                        // Call verifySelfProof function
                        const tx = await contract.verifySelfProof({
                            a: proof.a,
                            b: [
                                [proof.b[0][1], proof.b[0][0]],
                                [proof.b[1][1], proof.b[1][0]],
                            ],
                            c: proof.c,
                            pubSignals: publicSignals,
                        }, age || 0); // Use 0 if age is not required
                        
                        // Wait for transaction to be mined
                        const receipt = await tx.wait();
                        
                        // Check if the transaction was successful
                        if (receipt.status !== 1) {
                            throw new Error('Transaction failed');
                        }
                        
                        console.log("Successfully verified comment on-chain:", {
                            txHash: tx.hash
                        });

                        // Update comment status to verified
                        const { error: updateError } = await supabase
                            .from('comments')
                            .update({
                                status: 'posted',
                                updated_at: new Date().toISOString()
                            })
                            .eq('comment_id', commentId);

                        if (updateError) {
                            throw updateError;
                        }
                        
                        res.status(200).json({
                            status: 'success',
                            result: true,
                            credentialSubject: result.credentialSubject,
                            verificationOptions: {
                                minimumAge: post.allowed_commenters?.minimumAge,
                                ofac: false
                            }
                        });
                    } catch (contractError) {
                        console.error("On-chain comment verification failed:", contractError);
                        
                        // Update comment status to failed
                        await supabase
                            .from('comments')
                            .update({
                                status: 'failed',
                                updated_at: new Date().toISOString()
                            })
                            .eq('comment_id', commentId);
                        
                        res.status(400).json({
                            status: 'error',
                            result: false,
                            message: 'On-chain comment verification failed',
                            details: contractError instanceof Error ? contractError.message : 'Unknown error'
                        });
                    }
                }
            } else {
                res.status(400).json({
                    status: 'error',
                    result: false,
                    message: 'Verification failed',
                    details: result.isValidDetails
                });
            }
        } catch (error) {
            console.error('Error verifying comment:', error);
            return res.status(500).json({ 
                status: 'error',
                result: false,
                message: 'Error verifying comment',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    } else {
        res.status(405).json({ message: 'Method not allowed' });
    }
}
