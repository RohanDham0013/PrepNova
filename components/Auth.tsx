import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../types';

interface AuthProps {
    isSignedIn: boolean;
    userProfile: UserProfile | null;
    onSignIn: () => void;
    onSignOut: () => void;
}

const Auth: React.FC<AuthProps> = ({ isSignedIn, userProfile, onSignIn, onSignOut }) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);


    if (!isSignedIn) {
        return (
            <button
                onClick={onSignIn}
                className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
            >
                <svg className="w-5 h-5" viewBox="0 0 48 48">
                    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"></path>
                    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"></path>
                    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.222 0-9.519-3.486-11.188-8.166l-6.57 4.82C9.656 39.663 16.318 44 24 44z"></path>
                    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.099 34.92 44 29.832 44 24c0-1.341-.138-2.65-.389-3.917z"></path>
                </svg>
                Sign in with Google
            </button>
        );
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button onClick={() => setIsDropdownOpen(prev => !prev)} className="flex items-center gap-2">
                {userProfile && (
                    <>
                        <img src={userProfile.picture} alt="User profile" className="w-10 h-10 rounded-full border-2 border-gray-700" />
                        <span className="font-semibold text-gray-300 hidden sm:inline">{userProfile.name}</span>
                        <svg className={`w-5 h-5 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </>
                )}
            </button>
            {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-md shadow-lg py-1 z-20">
                    <button
                        onClick={() => {
                            onSignOut();
                            setIsDropdownOpen(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                    >
                        Sign Out
                    </button>
                </div>
            )}
        </div>
    );
};

export default Auth;
