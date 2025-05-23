'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { supabase } from '../../lib/supabase';
import SelfQRcodeWrapper, { type SelfApp, SelfAppBuilder } from '@selfxyz/qrcode';
import { logo } from '../content/playgroundAppLogo';
import { countryCodes } from '@selfxyz/core';
import { PASSPORT_ATTRIBUTES, RESTRICTIONS } from '../utils/constants';

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
        mode: 'include', // Only include mode is allowed
        countries: [] as string[]
      },
      gender: '',
      minimumAge: 18,
      issuing_state: ''
    },
    token_name: '',
    token_symbol: ''
  });
  
  const [userId, setUserId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Country selection
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [countrySelectionError, setCountrySelectionError] = useState<string | null>(null);

  const handleNext = () => {
    if (currentStep === 1 && (!postData.title || !postData.content)) {
      setError('Please fill in both title and content');
      return;
    }
    
    if (currentStep === 4) {
      console.log('Creating pending post');
      // Create a pending post and get the post ID for subsequent verification
      createPendingPost().then(() => {
        setCurrentStep(prev => prev + 1);
      }).catch(err => {
        console.error('Error creating pending post:', err);
        setError('Failed to prepare post for verification. Please try again.');
      });
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
        return [];
      }
      
      // Only allow one country to be selected
      return [country];
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

  // Create a pending post
  const createPendingPost = async () => {
    if (!address) {
      throw new Error('Please connect your wallet first');
    }
    
    // Get user ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('user_id')
      .eq('wallet_address', address)
      .single();
    
    if (userError) {
      // Create new user if not exists
      if (userError.code === 'PGRST116') {
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert([{ wallet_address: address }])
          .select()
          .single();
          
        if (createError) {
          throw new Error(`Failed to create user: ${createError.message}`);
        }
        
        const userId = newUser.user_id;
        console.log('New user created, creating post with userId:', userId);
        return await createPostWithUserId(userId);
      }
      throw new Error(`Error fetching user: ${userError.message}`);
    }
    
    console.log('User found, creating post with userId:', userData.user_id);
    // Create post with existing user ID
    return await createPostWithUserId(userData.user_id);
  };
  
  // Create pending post with user ID
  const createPostWithUserId = async (userId: string) => {
    try {
      // Check for existing pending posts
      console.log('Checking existing posts for userId:', userId);
      const { data: existingPosts, error: checkError } = await supabase
        .from('posts')
        .select('post_id')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .limit(1);
      
      if (checkError) {
        throw new Error(`Error checking existing posts: ${checkError.message}`);
      }
      
      // Update existing pending post to failed status
      if (existingPosts && existingPosts.length > 0) {
        const { error: updateError } = await supabase
          .from('posts')
          .update({ status: 'failed' })
          .eq('post_id', existingPosts[0].post_id);
          
        if (updateError) {
          throw new Error(`Failed to update existing post status: ${updateError.message}`);
        }
        
        console.log('Updated existing pending post to failed status');
      }
      
      // Prepare restrictions
      const restrictions: Record<string, unknown> = {};
      
      if (postData.commentRestrictions.enabled[RESTRICTIONS.NATIONALITY]) {
        restrictions.nationality = {
          mode: postData.commentRestrictions.nationality.mode,
          countries: postData.commentRestrictions.nationality.countries
        };
      }
      
      if (postData.commentRestrictions.enabled[RESTRICTIONS.GENDER]) {
        restrictions.gender = postData.commentRestrictions.gender; // Store the specific gender value
      }
      
      if (postData.commentRestrictions.enabled[RESTRICTIONS.AGE]) {
        restrictions.minimumAge = postData.commentRestrictions.minimumAge;
      }
      
      if (postData.commentRestrictions.enabled[RESTRICTIONS.ISSUING_STATE]) {
        restrictions.issuing_state = postData.commentRestrictions.issuing_state;
      }
      
      // Prepare post data
      const postDataToInsert = {
        title: postData.title,
        content: postData.content,
        user_id: userId,
        allowed_commenters: Object.keys(restrictions).length > 0 ? restrictions : null,
        anonymity_flag: false,
        disclosed_attributes: postData.disclosedAttributes,
        status: 'pending',
        token_name: postData.token_name,
        token_symbol: postData.token_symbol
      };

      console.log('Creating post with data:', postDataToInsert);
      
      // Create post
      const { data, error } = await supabase
        .from('posts')
        .insert([postDataToInsert])
        .select()
        .single();
      
      if (error) {
        throw new Error(`Failed to create post: ${error.message}`);
      }
      
      console.log('Post created successfully:', data);

      // Set post ID as QR code userId
      setUserId(data.post_id); // important: set post ID as QR code userId
      console.log('Created pending post:', data);
      return data.post_id;
    } catch (error) {
      console.error('Error in createPostWithUserId:', error);
      throw error;
    }
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
                  
                  <div>
                    <button
                      type="button"
                      onClick={openCountrySelector}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      Select Allowed Country
                    </button>
                    <div className="mt-2 text-sm text-gray-700">
                      {postData.commentRestrictions.nationality.countries.length > 0 
                        ? `Only users from ${postData.commentRestrictions.nationality.countries[0]} can comment` 
                        : 'No country selected'}
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
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-black">Reward Settings</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="token-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Reward Token Name
                </label>
                <input
                  id="token-name"
                  type="text"
                  value={postData.token_name}
                  onChange={(e) => setPostData(prev => ({ 
                    ...prev, 
                    token_name: e.target.value 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-800"
                  placeholder="Enter token name"
                  required
                />
              </div>
              <div>
                <label htmlFor="token-symbol" className="block text-sm font-medium text-gray-700 mb-1">
                  Reward Token Symbol
                </label>
                <input
                  id="token-symbol"
                  type="text"
                  value={postData.token_symbol}
                  onChange={(e) => setPostData(prev => ({ 
                    ...prev, 
                    token_symbol: e.target.value 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-800"
                  placeholder="Enter token symbol"
                  required
                />
              </div>
            </div>
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
                    scope: "self-sphere-post",
                    endpoint: `${process.env.NEXT_PUBLIC_API_ENDPOINT}/api/verify-post`,
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
                    console.log('Verification successful, post published');
                    onClose();
                    // Reload the page to show the newly created post
                    window.location.reload();
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
              Select Allowed Country
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
                    type="radio"
                    name="country"
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