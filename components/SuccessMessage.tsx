import React from 'react';

interface SuccessMessageProps {
  onReset: () => void;
}

const SuccessMessage: React.FC<SuccessMessageProps> = ({ onReset }) => {
  return (
    <div className="w-full flex flex-col items-center text-center p-8 bg-gray-900 border border-green-500/30 rounded-xl shadow-2xl shadow-green-500/15">
       <div className="w-16 h-16 bg-green-500/10 text-green-400 rounded-full flex items-center justify-center mb-5">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-3xl font-bold text-gray-100">All Set!</h2>
      <p className="text-gray-300 mt-2">
        We hope this helps you get prepared for your exams.
      </p>
      
      <button
        onClick={onReset}
        className="mt-8 bg-gray-800 text-white font-semibold px-6 py-3 rounded-md hover:bg-gray-700 transition-colors duration-200"
      >
        Analyze Another Syllabus
      </button>
    </div>
  );
};

export default SuccessMessage;