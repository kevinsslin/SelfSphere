'use client';

import { useState, useEffect, useCallback } from 'react';
import SelfQRcodeWrapper, { SelfApp, SelfAppBuilder } from '@selfxyz/qrcode';
import { v4 as uuidv4 } from 'uuid';
import { logo } from '../content/playgroundAppLogo';
import { countryCodes } from '@selfxyz/core';
import NavBar from '../components/NavBar';

export default function PlaygroundPage() {
    const [userId, setUserId] = useState<string | null>(null);
    const [savingOptions, setSavingOptions] = useState(false);

    useEffect(() => {
        setUserId(uuidv4());
    }, []);
    
    const [disclosures, setDisclosures] = useState<{
        issuing_state: boolean;
        name: boolean;
        nationality: boolean;
        date_of_birth: boolean;
        passport_number: boolean;
        gender: boolean;
        expiry_date: boolean;
        minimumAge: number;
        excludedCountries: string[];
        ofac: boolean;
    }>({
        // DG1 disclosures
        issuing_state: false,
        name: false,
        nationality: true,
        date_of_birth: false,
        passport_number: false,
        gender: false,
        expiry_date: false,
        // Custom checks
        minimumAge: 18,
        excludedCountries: [] as string[],
        ofac: false,
    });

    const [showCountryModal, setShowCountryModal] = useState(false);
    const [selectedCountries, setSelectedCountries] = useState<string[]>([
        countryCodes.IRN,
        countryCodes.IRQ,
        countryCodes.PRK,
        countryCodes.RUS,
        countryCodes.SYR,
        countryCodes.VEN
    ]);
    
    const [countrySelectionError, setCountrySelectionError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newAge = Number.parseInt(e.target.value);
        setDisclosures(prev => ({ ...prev, minimumAge: newAge }));
    };

    const handleCountryToggle = (country: string) => {
        setSelectedCountries(prev => {
            if (prev.includes(country)) {
                setCountrySelectionError(null);
                return prev.filter(c => c !== country);
            }
            
            if (prev.length >= 40) {
                setCountrySelectionError('Maximum 40 countries can be excluded');
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

        setDisclosures(prev => ({ ...prev, excludedCountries: codes }));
        setShowCountryModal(false);
    };

    const handleCheckboxChange = (field: string) => {
        setDisclosures(prev => ({
            ...prev,
            [field]: !prev[field as keyof typeof prev]
        }));
    };

    const saveOptionsToServer = useCallback(async () => {
        if (!userId || savingOptions) return;
        
        setSavingOptions(true);
        try {
            const response = await fetch('/api/saveOptions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId,
                    options: {
                        minimumAge: disclosures.minimumAge > 0 ? disclosures.minimumAge : undefined,
                        excludedCountries: disclosures.excludedCountries,
                        ofac: disclosures.ofac,
                        issuing_state: disclosures.issuing_state,
                        name: disclosures.name,
                        nationality: disclosures.nationality,
                        date_of_birth: disclosures.date_of_birth,
                        passport_number: disclosures.passport_number,
                        gender: disclosures.gender,
                        expiry_date: disclosures.expiry_date
                    }
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to save options');
            }
        } catch (error) {
            console.error('Error saving options:', error);
            // Only show alert if it's a user-facing error
            if (error instanceof Error && error.message) {
                alert(error.message);
            } else {
                alert('Failed to save verification options. Please try again.');
            }
        } finally {
            setSavingOptions(false);
        }
    }, [userId, savingOptions, disclosures]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (userId) {
                saveOptionsToServer();
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [disclosures, userId, saveOptionsToServer]);

    if (!userId) return null;

    const selfApp = new SelfAppBuilder({
        appName: "SelfSphere",
        scope: "self-sphere",
        endpoint: "https://6317-111-235-226-130.ngrok-free.app/api/verify-post",
        //endpoint: "https://self-sphere.vercel.app/api/verify-post",
        logoBase64: logo,
        userId,
        disclosures: {
            ...disclosures,
            minimumAge: disclosures.minimumAge > 0 ? disclosures.minimumAge : undefined,
        },
        devMode: true,
    } as Partial<SelfApp>).build();

    console.log("selfApp in:", selfApp);

    const filteredCountries = Object.entries(countryCodes).filter(([_, country]) =>
        country.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50">
            <NavBar />
            
            <div className="flex flex-col min-h-screen bg-white text-black pt-8" suppressHydrationWarning>
                <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
                    <div className="w-full max-w-6xl flex flex-col md:flex-row gap-8">
                        <div className="w-full md:w-1/2 flex flex-col items-center justify-center">
                            <SelfQRcodeWrapper
                                selfApp={selfApp}
                                onSuccess={() => {
                                    console.log('Verification successful');
                                }}
                                darkMode={false}
                            />
                            <p className="mt-4 text-sm text-gray-700">
                                User ID: {userId.substring(0, 8)}...
                            </p>
                        </div>

                        <div className="w-full md:w-1/2 bg-white rounded-lg shadow-md p-6 border border-gray-300">
                            <h2 className="text-2xl font-semibold mb-4">Verification Options</h2>

                            <div className="space-y-6">
                                <div className="border border-gray-300 rounded-md p-4">
                                    <h3 className="text-lg font-medium mb-3">Personal Information</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    checked={disclosures.issuing_state}
                                                    onChange={() => handleCheckboxChange('issuing_state')}
                                                    className="h-4 w-4"
                                                />
                                                <span>Disclose Issuing State</span>
                                            </label>
                                            <label className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    checked={disclosures.name}
                                                    onChange={() => handleCheckboxChange('name')}
                                                    className="h-4 w-4"
                                                />
                                                <span>Disclose Name</span>
                                            </label>
                                            <label className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    checked={disclosures.nationality}
                                                    onChange={() => handleCheckboxChange('nationality')}
                                                    className="h-4 w-4"
                                                />
                                                <span>Disclose Nationality</span>
                                            </label>
                                            <label className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    checked={disclosures.date_of_birth}
                                                    onChange={() => handleCheckboxChange('date_of_birth')}
                                                    className="h-4 w-4"
                                                />
                                                <span>Disclose Date of Birth</span>
                                            </label>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    checked={disclosures.passport_number}
                                                    onChange={() => handleCheckboxChange('passport_number')}
                                                    className="h-4 w-4"
                                                />
                                                <span>Disclose Passport Number</span>
                                            </label>
                                            <label className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    checked={disclosures.gender}
                                                    onChange={() => handleCheckboxChange('gender')}
                                                    className="h-4 w-4"
                                                />
                                                <span>Disclose Gender</span>
                                            </label>
                                            <label className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    checked={disclosures.expiry_date}
                                                    onChange={() => handleCheckboxChange('expiry_date')}
                                                    className="h-4 w-4"
                                                />
                                                <span>Disclose Expiry Date</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                <div className="border border-gray-300 rounded-md p-4">
                                    <h3 className="text-lg font-medium mb-3">Verification Rules</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label htmlFor="age-range" className="block mb-1">Minimum Age: {disclosures.minimumAge || 'None'}</label>
                                            <input
                                                id="age-range"
                                                type="range"
                                                min="0"
                                                max="99"
                                                value={disclosures.minimumAge}
                                                onChange={handleAgeChange}
                                                className="w-full"
                                            />
                                            <div className="text-sm text-gray-500 mt-1">
                                                Set to 0 to disable age requirement
                                            </div>
                                        </div>
                                        <div>
                                            <label className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    checked={disclosures.ofac}
                                                    onChange={() => handleCheckboxChange('ofac')}
                                                    className="h-4 w-4"
                                                />
                                                <span>Enable OFAC Check</span>
                                            </label>
                                        </div>
                                        
                                        <div>
                                            <button
                                                type="button"
                                                onClick={() => setShowCountryModal(true)}
                                                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                            >
                                                Configure Excluded Countries
                                            </button>
                                            <div className="mt-2 text-sm text-gray-700">
                                                {disclosures.excludedCountries.length > 0 
                                                    ? `${disclosures.excludedCountries.length} countries excluded` 
                                                    : "No countries excluded"}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Country Selection Modal */}
                {showCountryModal && (
                    <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-gray-300">
                            <h3 className="text-xl font-semibold mb-4">Select Countries to Exclude</h3>
                            
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
                                        <span className="text-sm">{country}</span>
                                    </label>
                                ))}
                            </div>
                            
                            <div className="flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCountryModal(false)}
                                    className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
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
        </div>
    );
}

