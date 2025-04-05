'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { supabase } from '../../lib/supabase';
import SelfQRcodeWrapper, { type SelfApp, SelfAppBuilder } from '@selfxyz/qrcode';
import { v4 as uuidv4 } from 'uuid';
import { logo } from '../content/playgroundAppLogo';
import { countryCodes } from '@selfxyz/core';
import { PASSPORT_ATTRIBUTES, REWARD_TYPES, RESTRICTIONS, OPERATION_TYPES } from '../utils/constants';

type CreatePostModalProps = {
  onClose: () => void;
};

export default function CreatePostModal({ onClose }: CreatePostModalProps) {
  const { address } = useAccount();
  const [currentStep, setCurrentStep] = useState(1);
  const [postData, setPostData] = useState({
    title: '',
    content: '',
    disclosedAttributes: {} as Record<string, boolean>,
    disclosedMinimumAge: 0, // For display purposes
    commentRestrictions: {
      enabled: {
        [RESTRICTIONS.NATIONALITY]: false,
        [RESTRICTIONS.GENDER]: false,
        [RESTRICTIONS.AGE]: false,
        [RESTRICTIONS.ISSUING_STATE]: false
      },
      nationality: {
        mode: 'exclude', // or 'include'
        countries: [] as string[]
      },
      gender: '',
      minimumAge: 18,
      issuing_state: ''
    },
    reward: {
      enabled: false,
      type: 1,
      amount: '1'
    }
  });
  
  const [userId, setUserId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Country selection
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [countrySelectionError, setCountrySelectionError] = useState<string | null>(null);

  // Generate a unique user ID for the QR code when needed
  useEffect(() => {
    if (currentStep === 5 && !userId) {
      setUserId(uuidv4());
    }
  }, [currentStep, userId]);

  // Function to handle creating a post after verification
  const handleCreatePost = async () => {
    try {
      setIsSubmitting(true);
      
      if (!address) {
        setError('Please connect your wallet first');
        return;
      }
      
      // Get user ID from wallet address
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('user_id')
        .eq('wallet_address', address)
        .single();
      
      if (userError) {
        throw new Error('User not found');
      }
      
      // Prepare restrictions based on enabled restrictions
      const restrictions: Record<string, unknown> = {};
      
      if (postData.commentRestrictions.enabled[RESTRICTIONS.NATIONALITY]) {
        restrictions.nationality = {
          mode: postData.commentRestrictions.nationality.mode,
          countries: postData.commentRestrictions.nationality.countries
        };
      }
      
      if (postData.commentRestrictions.enabled[RESTRICTIONS.GENDER] && postData.commentRestrictions.gender) {
        restrictions.gender = postData.commentRestrictions.gender;
      }
      
      if (postData.commentRestrictions.enabled[RESTRICTIONS.AGE]) {
        restrictions.minimumAge = postData.commentRestrictions.minimumAge;
      }
      
      if (postData.commentRestrictions.enabled[RESTRICTIONS.ISSUING_STATE] && postData.commentRestrictions.issuing_state) {
        restrictions.issuing_state = postData.commentRestrictions.issuing_state;
      }

      // Prepare post data
      const finalPostData = {
        title: postData.title,
        content: postData.content,
        user_id: userData.user_id,
        allowed_commenters: Object.keys(restrictions).length > 0 ? restrictions : null,
        disclosed_attributes: Object.keys(postData.disclosedAttributes)
          .filter(key => postData.disclosedAttributes[key])
          .reduce((acc, key) => {
            acc[key] = true;
            return acc;
          }, {} as Record<string, boolean>),
        reward_enabled: postData.reward.enabled,
        reward_type: postData.reward.enabled ? postData.reward.type : null
      };
      
      // Send post data to the API
      const response = await fetch('/api/submitVerifiedPost', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postData: finalPostData,
          verificationResult: { isValid: true }
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create post');
      }
      
      // Close modal after successful post creation
      onClose();
    } catch (err) {
      console.error('Error creating post:', err);
      setError('Failed to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (currentStep === 1 && (!postData.title || !postData.content)) {
      setError('Please fill in both title and content');
      return;
    }
    
    if (currentStep === 4) {
      // Generate user ID for verification and move to QR code step
      setUserId(uuidv4());
      setCurrentStep(prev => prev + 1);
      return;
    }
    
    if (currentStep === 5) {
      // Final step already - nothing to do
      return;
    }
    
    setError('');
    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
    setError('');
  };

  const handleMinimumAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAge = Number.parseInt(e.target.value);
    setPostData(prev => ({
      ...prev,
      disclosedMinimumAge: newAge,
      commentRestrictions: {
        ...prev.commentRestrictions,
        minimumAge: newAge
      }
    }));
  };

  const handleGenderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPostData(prev => ({
      ...prev,
      commentRestrictions: {
        ...prev.commentRestrictions,
        gender: e.target.value
      }
    }));
  };

  const toggleRestrictionType = (type: string) => {
    setPostData(prev => ({
      ...prev,
      commentRestrictions: {
        ...prev.commentRestrictions,
        enabled: {
          ...prev.commentRestrictions.enabled,
          [type]: !prev.commentRestrictions.enabled[type]
        }
      }
    }));
  };

  const toggleNationalityMode = () => {
    setPostData(prev => ({
      ...prev,
      commentRestrictions: {
        ...prev.commentRestrictions,
        nationality: {
          ...prev.commentRestrictions.nationality,
          mode: prev.commentRestrictions.nationality.mode === 'exclude' ? 'include' : 'exclude'
        }
      }
    }));
  };

  const openCountrySelector = () => {
    // Initialize with current selection
    setSelectedCountries(
      Object.entries(countryCodes)
        .filter(([code]) => postData.commentRestrictions.nationality.countries.includes(code))
        .map(([_, name]) => name)
    );
    setShowCountryModal(true);
  };

  const handleCountryToggle = (country: string) => {
    setSelectedCountries(prev => {
      if (prev.includes(country)) {
        setCountrySelectionError(null);
        return prev.filter(c => c !== country);
      }
      
      if (prev.length >= 40) {
        setCountrySelectionError('Maximum 40 countries can be selected');
        return prev;
      }
      
      return [...prev, country];
    });
  };

  const saveCountrySelection = () => {
    const codes = selectedCountries.map(countryName => {
      const entry = Object.entries(countryCodes).find(([_, name]) => name === countryName);
      return entry ? entry[0] : countryName.substring(0, 3).toUpperCase();
    });

    setPostData(prev => ({
      ...prev,
      commentRestrictions: {
        ...prev.commentRestrictions,
        nationality: {
          ...prev.commentRestrictions.nationality,
          countries: codes
        }
      }
    }));
    setShowCountryModal(false);
  };

  // Filter countries based on search query
  const filteredCountries = Object.entries(countryCodes).filter(([_, country]) =>
    country.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleDisclosedAttribute = (key: string) => {
    setPostData(prev => ({
      ...prev,
      disclosedAttributes: {
        ...prev.disclosedAttributes,
        [key]: !prev.disclosedAttributes[key]
      }
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Create New Post</h2>
          <button 
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        {/* Step indicators */}
        <div className="flex mb-8">
          {[1, 2, 3, 4, 5].map(step => (
            <div key={step} className="flex-1">
              <div className={`h-2 rounded-full mx-1 ${currentStep >= step ? 'bg-indigo-600' : 'bg-gray-200'}`} />
              <div className="text-xs text-center mt-1 text-gray-600">Step {step}</div>
            </div>
          ))}
        </div>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4">
            {error}
          </div>
        )}
        
        {/* Step 1: Content */}
        {currentStep === 1 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Post Content</h3>
            <div className="mb-4">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                id="title"
                value={postData.title}
                onChange={e => setPostData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-800"
                placeholder="Enter post title"
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                Content
              </label>
              <textarea
                id="content"
                value={postData.content}
                onChange={e => setPostData(prev => ({ ...prev, content: e.target.value }))}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-800"
                placeholder="Write your post content here..."
              />
            </div>
          </div>
        )}
        
        {/* Step 2: Attribute Disclosure */}
        {currentStep === 2 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Disclose Passport Attributes</h3>
            <p className="text-gray-600 mb-4">
              Select which passport attributes you want to disclose with this post.
              These will be verified and shown publicly on your post.
            </p>
            
            <div className="border border-gray-300 rounded-md p-4 mb-6">
              <h4 className="text-md font-medium mb-3 text-gray-800">Age Verification</h4>
              <div>
                <label htmlFor="age-range" className="block mb-1 text-gray-700">Minimum Age: {postData.disclosedMinimumAge || 'None'}</label>
                <input
                  id="age-range"
                  type="range"
                  min="0"
                  max="99"
                  value={postData.disclosedMinimumAge}
                  onChange={handleMinimumAgeChange}
                  className="w-full"
                />
                <div className="text-sm text-gray-500 mt-1">
                  Set to 0 to disable age requirement
                </div>
              </div>
            </div>
            
            <div className="border border-gray-300 rounded-md p-4">
              <h4 className="text-md font-medium mb-3 text-gray-800">Passport Information</h4>
              <div className="grid grid-cols-2 gap-3">
                {PASSPORT_ATTRIBUTES.map(attr => (
                  <label key={attr.key} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`attr-${attr.key}`}
                      checked={!!postData.disclosedAttributes[attr.key]}
                      onChange={() => toggleDisclosedAttribute(attr.key)}
                      className="h-4 w-4"
                    />
                    <span className="text-gray-800">Disclose {attr.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Step 3: Comment Restrictions */}
        {currentStep === 3 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Comment Restrictions</h3>
            <p className="text-gray-600 mb-4">
              Select which restrictions to apply to commenters. You can enable multiple restrictions.
            </p>
            
            <div className="space-y-4 mb-4">
              {/* Restriction Type Checkboxes */}
              <div className="border border-gray-300 rounded-md p-4">
                <h4 className="text-md font-medium mb-3 text-gray-800">Enable Restrictions</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="restrict-nationality"
                      checked={postData.commentRestrictions.enabled[RESTRICTIONS.NATIONALITY]}
                      onChange={() => toggleRestrictionType(RESTRICTIONS.NATIONALITY)}
                      className="mr-2"
                    />
                    <label htmlFor="restrict-nationality" className="text-gray-800">Nationality</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="restrict-gender"
                      checked={postData.commentRestrictions.enabled[RESTRICTIONS.GENDER]}
                      onChange={() => toggleRestrictionType(RESTRICTIONS.GENDER)}
                      className="mr-2"
                    />
                    <label htmlFor="restrict-gender" className="text-gray-800">Gender</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="restrict-age"
                      checked={postData.commentRestrictions.enabled[RESTRICTIONS.AGE]}
                      onChange={() => toggleRestrictionType(RESTRICTIONS.AGE)}
                      className="mr-2"
                    />
                    <label htmlFor="restrict-age" className="text-gray-800">Age</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="restrict-issuing-state"
                      checked={postData.commentRestrictions.enabled[RESTRICTIONS.ISSUING_STATE]}
                      onChange={() => toggleRestrictionType(RESTRICTIONS.ISSUING_STATE)}
                      className="mr-2"
                    />
                    <label htmlFor="restrict-issuing-state" className="text-gray-800">Issuing State</label>
                  </div>
                </div>
              </div>
              
              {/* Nationality Settings */}
              {postData.commentRestrictions.enabled[RESTRICTIONS.NATIONALITY] && (
                <div className="border border-gray-300 rounded-md p-4">
                  <h4 className="text-md font-medium mb-3 text-gray-800">Nationality Restriction</h4>
                  
                  <div className="flex items-center mb-3">
                    <span className="mr-4 text-gray-700">Mode:</span>
                    <button
                      type="button"
                      onClick={toggleNationalityMode}
                      className={`px-3 py-1 rounded mr-2 ${
                        postData.commentRestrictions.nationality.mode === 'include' 
                          ? 'bg-green-600 text-white' 
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      Include
                    </button>
                    <button
                      type="button"
                      onClick={toggleNationalityMode}
                      className={`px-3 py-1 rounded ${
                        postData.commentRestrictions.nationality.mode === 'exclude' 
                          ? 'bg-red-600 text-white' 
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      Exclude
                    </button>
                  </div>
                  
                  <div>
                    <button
                      type="button"
                      onClick={openCountrySelector}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      Configure {postData.commentRestrictions.nationality.mode === 'include' ? 'Included' : 'Excluded'} Countries
                    </button>
                    <div className="mt-2 text-sm text-gray-700">
                      {postData.commentRestrictions.nationality.countries.length > 0 
                        ? `${postData.commentRestrictions.nationality.countries.length} countries ${postData.commentRestrictions.nationality.mode === 'include' ? 'included' : 'excluded'}` 
                        : `No countries ${postData.commentRestrictions.nationality.mode === 'include' ? 'included' : 'excluded'}`}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Gender Settings */}
              {postData.commentRestrictions.enabled[RESTRICTIONS.GENDER] && (
                <div className="border border-gray-300 rounded-md p-4">
                  <h4 className="text-md font-medium mb-3 text-gray-800">Gender Restriction</h4>
                  <select
                    value={postData.commentRestrictions.gender}
                    onChange={handleGenderChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-800"
                  >
                    <option value="">Select required gender</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="X">Other/Non-binary</option>
                  </select>
                </div>
              )}
              
              {/* Age Settings */}
              {postData.commentRestrictions.enabled[RESTRICTIONS.AGE] && (
                <div className="border border-gray-300 rounded-md p-4">
                  <h4 className="text-md font-medium mb-3 text-gray-800">Minimum Age Restriction</h4>
                  <div>
                    <label htmlFor="min-age-range" className="block mb-1 text-gray-700">Minimum Age: {postData.commentRestrictions.minimumAge}</label>
                    <input
                      id="min-age-range"
                      type="range"
                      min="1"
                      max="99"
                      value={postData.commentRestrictions.minimumAge}
                      onChange={(e) => {
                        const value = Number.parseInt(e.target.value);
                        setPostData(prev => ({
                          ...prev,
                          commentRestrictions: {
                            ...prev.commentRestrictions,
                            minimumAge: value
                          }
                        }));
                      }}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
              
              {/* Issuing State Settings */}
              {postData.commentRestrictions.enabled[RESTRICTIONS.ISSUING_STATE] && (
                <div className="border border-gray-300 rounded-md p-4">
                  <h4 className="text-md font-medium mb-3 text-gray-800">Issuing State Restriction</h4>
                  <input
                    type="text"
                    value={postData.commentRestrictions.issuing_state}
                    onChange={e => setPostData(prev => ({ 
                      ...prev, 
                      commentRestrictions: { 
                        ...prev.commentRestrictions, 
                        issuing_state: e.target.value 
                      } 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-800"
                    placeholder="Enter required issuing state (e.g. USA)"
                  />
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Step 4: Reward Settings */}
        {currentStep === 4 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Reward Settings</h3>
            <div className="mb-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enable-rewards"
                  checked={postData.reward.enabled}
                  onChange={e => setPostData(prev => ({ 
                    ...prev, 
                    reward: { ...prev.reward, enabled: e.target.checked } 
                  }))}
                  className="mr-2"
                />
                <label htmlFor="enable-rewards" className="text-gray-800">Enable rewards for this post</label>
              </div>
            </div>
            
            {postData.reward.enabled && (
              <>
                <div className="mb-4">
                  <label htmlFor="reward-type" className="block text-sm font-medium text-gray-700 mb-1">
                    Reward Type
                  </label>
                  <select
                    id="reward-type"
                    value={postData.reward.type}
                    onChange={e => setPostData(prev => ({ 
                      ...prev, 
                      reward: { ...prev.reward, type: Number(e.target.value) } 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-800"
                  >
                    {REWARD_TYPES.map(type => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-gray-600 mt-1">
                    {REWARD_TYPES.find(t => t.id === postData.reward.type)?.description}
                  </p>
                </div>
                
                <div className="mb-4">
                  <label htmlFor="reward-amount" className="block text-sm font-medium text-gray-700 mb-1">
                    Reward Amount
                  </label>
                  <input
                    type="number"
                    id="reward-amount"
                    min="1"
                    value={postData.reward.amount}
                    onChange={e => setPostData(prev => ({ 
                      ...prev, 
                      reward: { ...prev.reward, amount: e.target.value } 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-800"
                  />
                </div>
              </>
            )}
          </div>
        )}
        
        {/* Step 5: Verification */}
        {currentStep === 5 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Verify Attributes</h3>
            <p className="text-gray-600 mb-4">
              Scan this QR code with the Self app to verify your disclosed attributes.
              Your post will be published after successful verification.
            </p>
            
            <div className="flex justify-center mb-4">
              {userId && currentStep === 5 ? (
                <SelfQRcodeWrapper
                  selfApp={new SelfAppBuilder({
                    appName: "SelfSphere",
                    scope: "self-sphere",
                    endpoint: "/api/verify",
                    logoBase64: logo,
                    userId,
                    disclosures: {
                      issuing_state: postData.disclosedAttributes.issuing_state || false,
                      name: postData.disclosedAttributes.name || false,
                      nationality: postData.disclosedAttributes.nationality || false,
                      date_of_birth: postData.disclosedAttributes.date_of_birth || false,
                      gender: postData.disclosedAttributes.gender || false,
                      expiry_date: postData.disclosedAttributes.expiry_date || false,
                      minimumAge: postData.disclosedMinimumAge > 0 ? postData.disclosedMinimumAge : undefined
                    },
                    devMode: true
                  } as Partial<SelfApp>).build()}
                  onSuccess={() => {
                    handleCreatePost();
                  }}
                  darkMode={false}
                />
              ) : (
                <div className="w-64 h-64 bg-gray-200 flex items-center justify-center">
                  <p className="text-gray-700">Loading QR code...</p>
                </div>
              )}
            </div>
            
            <p className="text-center text-sm text-gray-600">
              Scan with the Self app to verify your identity
            </p>
          </div>
        )}
        
        {/* Navigation buttons */}
        <div className="flex justify-between mt-8">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700"
            >
              Back
            </button>
          ) : (
            <div />
          )}
          
          {currentStep < 5 && (
            <button
              type="button"
              onClick={handleNext}
              disabled={isSubmitting}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              Next
            </button>
          )}
        </div>
      </div>
      
      {/* Country Selection Modal */}
      {showCountryModal && (
        <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-gray-300">
            <h3 className="text-xl font-semibold mb-4">
              Select Countries to {postData.commentRestrictions.nationality.mode === 'include' ? 'Include' : 'Exclude'}
            </h3>
            
            {countrySelectionError && (
              <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
                {countrySelectionError}
              </div>
            )}
            
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search countries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded bg-white text-black"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mb-6 max-h-80 overflow-y-auto">
              {filteredCountries.map(([code, country]) => (
                <label key={code} className="flex items-center space-x-2 p-1 hover:bg-gray-100 rounded">
                  <input
                    type="checkbox"
                    checked={selectedCountries.includes(country)}
                    onChange={() => handleCountryToggle(country)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm text-gray-800">{country}</span>
                </label>
              ))}
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowCountryModal(false)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveCountrySelection}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 