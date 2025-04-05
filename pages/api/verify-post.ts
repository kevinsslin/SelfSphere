import type { NextApiRequest, NextApiResponse } from 'next';
import { 
    getUserIdentifier, 
    SelfBackendVerifier, 
    countryCodes 
} from '@selfxyz/core';
import { kv } from '@vercel/kv';
import type { SelfApp } from '@selfxyz/qrcode';
import { supabase } from '../../lib/supabase';
import { ethers } from 'ethers';
import abi from '../../abi/Post.json';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        try {
            const { proof, publicSignals } = req.body;
            
            const postId = await getUserIdentifier(publicSignals);
            console.log("Extracted userId from verification result:", postId);

            if (!proof || !publicSignals) {
                return res.status(400).json({ message: 'Proof and publicSignals are required' });
            }

            if (!postId) {
                return res.status(400).json({ message: 'Post ID is required but not found' });
            }
            
            // Find pending post
            const { data: pendingPost, error: postError } = await supabase
                .from('posts')
                .select('*')
                .eq('post_id', postId)
                .eq('status', 'pending')
                .single();
                
            if (postError) {
                console.error('Error finding pending post:', postError);
                return res.status(404).json({ 
                    message: 'No pending post found with the specified ID',
                    error: postError.message 
                });
            }
            
            console.log('Found pending post:', pendingPost);
            
            // Default options
            let minimumAge: number | undefined;
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
            
            // Try to retrieve options from store using postId
            if (postId) {
                const savedOptions = await kv.get(postId) as SelfApp["disclosures"];
                if (savedOptions) {
                    console.log("Raw saved options from store:", savedOptions);
                    
                    // Apply saved options
                    minimumAge = savedOptions.minimumAge || minimumAge;
                    
                    if (savedOptions.excludedCountries && savedOptions.excludedCountries.length > 0) {
                        excludedCountryList = savedOptions.excludedCountries.map(
                            (code: string) => countryCodes[code as keyof typeof countryCodes] || code
                        );
                    }
                    
                    // More strict OFAC setting check
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
                    console.log("No saved options found for postId:", postId);
                }
            } else {
                console.log("No postId found in verification result, using default options");
            }
            
            const configuredVerifier = new SelfBackendVerifier(
                "self-sphere-post",
                //"https://6317-111-235-226-130.ngrok-free.app",
                "https://self-sphere.vercel.app",
                "uuid",
                false // This is to enable the mock passport
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
            const result = await configuredVerifier.verify(proof, publicSignals);
            console.log("Verification result:", result);

            if (result.isValid) {               
                // Prepare disclosed attributes
                const attributesWithValues: Record<string, string | number> = {};
                const disclosedAttributes = pendingPost.disclosed_attributes || {};
                
                // Only include attributes that user chose to disclose
                if (disclosedAttributes.nationality && result.credentialSubject.nationality) {
                    attributesWithValues.nationality = result.credentialSubject.nationality as string;
                }
                
                if (disclosedAttributes.gender && result.credentialSubject.gender) {
                    attributesWithValues.gender = result.credentialSubject.gender as string;
                }
                
                if (disclosedAttributes.date_of_birth && result.credentialSubject.date_of_birth) {
                    attributesWithValues.date_of_birth = result.credentialSubject.date_of_birth as string;
                    
                    // If date of birth is disclosed, calculate and include age
                    // Convert date format from DD-MM-YY to YYYY-MM-DD
                    const [day, month, year] = attributesWithValues.date_of_birth.split('-');
                    // Assume year is 20xx
                    const fullYear = Number.parseInt(year) < 50 ? `20${year}` : `19${year}`;
                    const formattedDate = `${fullYear}-${month}-${day}`;
                    
                    const birthDate = new Date(formattedDate);
                    const today = new Date();
                    
                    // Calculate age correctly
                    let age = today.getFullYear() - birthDate.getFullYear();
                    const monthDiff = today.getMonth() - birthDate.getMonth();
                    
                    // Subtract 1 if birthday hasn't passed yet
                    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                        age--;
                    }
                    
                    console.log("Calculated age:", age);
                    attributesWithValues.age = age;
                }
                
                if (disclosedAttributes.issuing_state && result.credentialSubject.issuing_state) {
                    attributesWithValues.issuing_state = result.credentialSubject.issuing_state as string;
                }
                
                if (disclosedAttributes.name && result.credentialSubject.name) {
                    attributesWithValues.name = result.credentialSubject.name as string;
                }
                
                if (disclosedAttributes.expiry_date && result.credentialSubject.expiry_date) {
                    attributesWithValues.expiry_date = result.credentialSubject.expiry_date as string;
                }
                
                // Update post status to posted and save actual disclosed attributes
                await supabase
                    .from('posts')
                    .update({
                        disclosed_attributes: attributesWithValues,
                        status: 'posted', // Update status to posted
                        updated_at: new Date().toISOString()
                    })
                    .eq('post_id', postId);

                // On-chain interaction
                const provider = new ethers.JsonRpcProvider("https://alfajores-forno.celo-testnet.org/");
                const privateKey = process.env.PRIVATE_KEY || "";
                const signer = new ethers.Wallet(privateKey, provider);
                const contractAddress = process.env.CONTRACT_ADDRESS || "";
                const contract = new ethers.Contract(contractAddress, abi, signer);
                
                try {
                    const tx = await contract.verifySelfProof({
                        a: proof.a,
                        b: [
                          [proof.b[0][1], proof.b[0][0]],
                          [proof.b[1][1], proof.b[1][0]],
                        ],
                        c: proof.c,
                        pubSignals: publicSignals,
                    });
                    const receipt = await tx.wait();
                    console.log("Successfully called verifySelfProof function:", {
                        txHash: tx.hash
                    });
                } catch (contractError) {
                    console.error("On-chain verification failed, but continuing:", contractError);
                    // Continue processing even if on-chain verification fails
                }
                
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
                    }
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