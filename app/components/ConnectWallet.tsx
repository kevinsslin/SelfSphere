'use client';

import { ConnectButton, darkTheme, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');

  useEffect(() => {
    async function getOrCreateUser() {
      if (!address || !isConnected) return;

      try {
        const { data: existingUser, error } = await supabase
          .from('users')
          .select()
          .eq('wallet_address', address)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking user:', error);
          return;
        }

        if (existingUser) {
          setDisplayName(existingUser.display_name || formatAddress(address));
          return;
        }

        const shortAddress = formatAddress(address);
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert([
            {
              wallet_address: address,
              display_name: shortAddress,
            },
          ])
          .select()
          .single();

        if (createError) {
          console.error('Error creating user:', createError);
          return;
        }

        setDisplayName(newUser.display_name);
      } catch (err) {
        console.error('Failed to handle user:', err);
      }
    }

    getOrCreateUser();
  }, [address, isConnected]);

  const formatAddress = (addr: string): string => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const updateDisplayName = async () => {
    if (!address || !newDisplayName.trim()) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ display_name: newDisplayName.trim() })
        .eq('wallet_address', address);

      if (error) {
        console.error('Error updating display name:', error);
        return;
      }

      setDisplayName(newDisplayName.trim());
      setIsEditingName(false);
    } catch (err) {
      console.error('Failed to update display name:', err);
    }
  };

  return (
    <RainbowKitProvider
    theme={darkTheme({
      accentColor: '#000000',
      accentColorForeground: 'white',
      borderRadius: 'small',
      fontStack: 'system',
      overlayBlur: 'large',
    })}>
      <div className="flex items-center space-x-4">
      {isConnected && displayName && (
        <div className="flex items-center">
          {isEditingName ? (
            <div className="flex items-center">
              <input
                type="text"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                className="px-2 py-1 border border-gray-300 rounded mr-2"
                placeholder="Display name"
              />
              <button
                type="button"
                onClick={updateDisplayName}
                className="text-sm bg-blue-500 text-white px-2 py-1 rounded"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setIsEditingName(false)}
                className="text-sm ml-1 px-2 py-1 border border-gray-300 rounded"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center">
              <span className="mr-2">{displayName}</span>
              <button
                type="button"
                onClick={() => {
                  setNewDisplayName(displayName);
                  setIsEditingName(true);
                }}
                className="text-xs text-gray-500 hover:text-gray-300"
              >
                ✏️
              </button>
            </div>
          )}
        </div>
      )}
      <div className="border border-white rounded-md text-white hover:text-black transition px-3 py-1 text-sm font-medium">
        <ConnectButton 
          showBalance={false}
        />
      </div>
    </div>
    </RainbowKitProvider>
  );
}
