import React from 'react';
import { UserProfile } from '../types';
import Auth from './Auth';

interface HeaderProps {
    isSignedIn: boolean;
    userProfile: UserProfile | null;
    onSignIn: () => void;
    onSignOut: () => void;
}

const Header: React.FC<HeaderProps> = ({ isSignedIn, userProfile, onSignIn, onSignOut }) => {
  return (
    <header className="relative text-center pb-4">
      <div className="absolute top-0 right-0 z-10">
        <Auth 
            isSignedIn={isSignedIn} 
            userProfile={userProfile} 
            onSignIn={onSignIn} 
            onSignOut={onSignOut} 
        />
      </div>
      <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-500">
        PrepNova AI Study Planner
      </h1>
      <p className="mt-3 text-lg text-gray-400">
        Upload your syllabus to generate a personalized study plan with spaced repetition.
      </p>
    </header>
  );
};

export default Header;