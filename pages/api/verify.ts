import { NextApiRequest, NextApiResponse } from 'next';
import { 
    getUserIdentifier, 
    SelfBackendVerifier, 
    countryCodes 
} from '@selfxyz/core';
import { kv } from '@vercel/kv';
import { SelfApp } from '@selfxyz/qrcode';
import { supabase } from '../../lib/supabase';

type PostData = {
    title: string;
    content: string;
    user_id: string;
    allowed_commenters: Record<string, unknown> | null;
    disclosed_attributes: Record<string, boolean>;
    reward_enabled: boolean;
    reward_type: number | null;
};

type CommentData = {
    post_id: string;
    content: string;
    user_id: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        try {
            const { proof, publicSignals, actionType, postData } = req.body;

            if (!proof || !publicSignals) {
                return res.status(400).json({ message: 'Proof and publicSignals are required' });
            }

            const userId = await getUserIdentifier(publicSignals);
            console.log("Extracted userId from verification result:", userId);

            // Default options
            let minimumAge;
            let excludedCountryList: string[] = [];
            let enableOfac = false;
            let enabledDisclosures = {
                issuing_state: false,
                name: false,
                nationality: true,
                date_of_birth: false,
                passport_number: false,
                gender: false,
                expiry_date: false
            };
            
            // Try to retrieve options from store using userId
            if (userId) {
                const savedOptions = await kv.get(userId) as SelfApp["disclosures"];
                if (savedOptions) {
                    console.log("Raw saved options from store:", savedOptions);
                    
                    // Apply saved options
                    minimumAge = savedOptions.minimumAge || minimumAge;
                    
                    if (savedOptions.excludedCountries && savedOptions.excludedCountries.length > 0) {
                        excludedCountryList = savedOptions.excludedCountries.map(
                            (code: string) => countryCodes[code as keyof typeof countryCodes] || code
                        );
                    }
                    
                    // 更嚴格的 OFAC 設置檢查
                    enableOfac = Boolean(savedOptions.ofac);
                    console.log("OFAC setting from saved options:", {
                        raw: savedOptions.ofac,
                        processed: enableOfac
                    });
                    
                    // Apply all disclosure settings
                    enabledDisclosures = {
                        issuing_state: Boolean(savedOptions.issuing_state),
                        name: Boolean(savedOptions.name),
                        nationality: Boolean(savedOptions.nationality),
                        date_of_birth: Boolean(savedOptions.date_of_birth),
                        passport_number: Boolean(savedOptions.passport_number),
                        gender: Boolean(savedOptions.gender),
                        expiry_date: Boolean(savedOptions.expiry_date)
                    };
                    
                    console.log("Final enabled disclosures:", enabledDisclosures);
                } else {
                    console.log("No saved options found for userId:", userId);
                }
            } else {
                console.log("No userId found in verification result, using default options");
            }
            
            const configuredVerifier = new SelfBackendVerifier(
                "self-sphere",
                "https://6317-111-235-226-130.ngrok-free.app",
                //"https://playground-self-flame.vercel.app",
                "uuid",
                true // This is to enable the mock passport
            );
            
            console.log("Verifier configuration:", {
                minimumAge,
                excludedCountryList,
                enableOfac,
                enabledDisclosures
            });
            
            if (minimumAge !== undefined) {
                configuredVerifier.setMinimumAge(minimumAge);
                console.log("Set minimum age:", minimumAge);
            }
            
            if (excludedCountryList.length > 0) {
                configuredVerifier.excludeCountries(
                    ...excludedCountryList as (keyof typeof countryCodes)[]
                );
                console.log("Excluded countries:", excludedCountryList);
            }
            
            if (enableOfac) {
                configuredVerifier.enableNameAndDobOfacCheck();
                console.log("Enabled OFAC check");
            }

            console.log("Starting verification with proof and publicSignals");
            console.log("Proof:", proof);
            console.log("Public signals:", publicSignals);
            const result = await configuredVerifier.verify(proof, publicSignals);
            console.log("Verification result:", result);

            if (result.isValid) {
                const filteredSubject = { ...result.credentialSubject };
                
                if (!enabledDisclosures.issuing_state && filteredSubject) {
                    filteredSubject.issuing_state = "Not disclosed";
                }
                if (!enabledDisclosures.name && filteredSubject) {
                    filteredSubject.name = "Not disclosed";
                }
                if (!enabledDisclosures.nationality && filteredSubject) {
                    filteredSubject.nationality = "Not disclosed";
                }
                if (!enabledDisclosures.date_of_birth && filteredSubject) {
                    filteredSubject.date_of_birth = "Not disclosed";
                }
                if (!enabledDisclosures.passport_number && filteredSubject) {
                    filteredSubject.passport_number = "Not disclosed";
                }
                if (!enabledDisclosures.gender && filteredSubject) {
                    filteredSubject.gender = "Not disclosed";
                }
                if (!enabledDisclosures.expiry_date && filteredSubject) {
                    filteredSubject.expiry_date = "Not disclosed";
                }
                
                // Handle database operations based on actionType
                let dbOperationResult = null;
                
                if (actionType === 'create_post' && postData) {
                    // Create a new post in the database
                    console.log("Creating new post with data:", postData);
                    const { data, error } = await supabase
                        .from('posts')
                        .insert([postData as PostData])
                        .select()
                        .single();
                        
                    if (error) {
                        console.error("Error creating post:", error);
                        return res.status(500).json({
                            status: 'error',
                            message: 'Failed to create post',
                            error: error.message
                        });
                    }
                    
                    dbOperationResult = data;
                    console.log("Post created successfully:", data);
                } else if (actionType === 'create_comment' && postData) {
                    // Create a new comment in the database
                    console.log("Creating new comment with data:", postData);
                    const { data, error } = await supabase
                        .from('comments')
                        .insert([postData as CommentData])
                        .select()
                        .single();
                        
                    if (error) {
                        console.error("Error creating comment:", error);
                        return res.status(500).json({
                            status: 'error',
                            message: 'Failed to create comment',
                            error: error.message
                        });
                    }
                    
                    // Check if post has rewards enabled and process them
                    if (postData.post_id) {
                        const { data: postDetails, error: postError } = await supabase
                            .from('posts')
                            .select('reward_enabled, reward_type')
                            .eq('post_id', postData.post_id)
                            .single();
                            
                        if (!postError && postDetails?.reward_enabled) {
                            // Process rewards based on reward_type
                            await processRewards(postData.post_id, postData.user_id, postDetails.reward_type);
                        }
                    }
                    
                    dbOperationResult = data;
                    console.log("Comment created successfully:", data);
                }
                
                res.status(200).json({
                    status: 'success',
                    result: result.isValid,
                    credentialSubject: filteredSubject,
                    verificationOptions: {
                        minimumAge,
                        ofac: enableOfac,
                        excludedCountries: excludedCountryList.map(countryName => {
                            const entry = Object.entries(countryCodes).find(([_, name]) => name === countryName);
                            return entry ? entry[0] : countryName;
                        })
                    },
                    dbOperationResult
                });
            } else {
                res.status(400).json({
                    status: 'error', 
                    result: result.isValid,
                    message: 'Verification failed',
                    details: result.isValidDetails
                });
            }
        } catch (error) {
            console.error('Error verifying proof:', error);
            return res.status(500).json({ 
                message: 'Error verifying proof',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    } else {
        res.status(405).json({ message: 'Method not allowed' });
    }
}

// Helper function to process rewards
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