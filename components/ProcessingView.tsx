
import React from 'react';

const LoadingSpinner: React.FC = () => (
  <div className="w-16 h-16 border-4 border-yellow-400 border-solid border-t-transparent rounded-full animate-spin"></div>
);

const ProcessingView: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center space-y-6 py-12">
      <LoadingSpinner />
      <h2 className="text-2xl font-semibold text-gray-200">Analyzing Syllabus...</h2>
      <p className="text-gray-400 text-center">
        Our AI is reading your document to find exam dates and topics.
        <br />
        This might take a moment.
      </p>
    </div>
  );
};

export default ProcessingView;