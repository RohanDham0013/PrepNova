import React, { useState, useCallback } from 'react';

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  error: string | null;
  preferredTime: string;
  setPreferredTime: (time: string) => void;
  preferredDuration: number;
  setPreferredDuration: (duration: number) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ 
  onFileUpload, 
  error,
  preferredTime,
  setPreferredTime,
  preferredDuration,
  setPreferredDuration,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      onFileUpload(event.target.files[0]);
    }
  };

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      onFileUpload(event.dataTransfer.files[0]);
      event.dataTransfer.clearData();
    }
  }, [onFileUpload]);

  const durationOptions = [30, 45, 60, 75, 90, 120];

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center">

      <div className="w-full mb-8 p-6 bg-gray-900/50 border border-gray-800 rounded-xl">
        <h2 className="text-xl font-semibold text-gray-200 mb-4 text-center">Step 1: Set Your Preferences</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label htmlFor="study-time" className="block text-sm font-medium text-gray-400 mb-1">Preferred Study Time</label>
                <input 
                    type="time" 
                    id="study-time" 
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                    className="w-full bg-gray-800 border-gray-700 text-white rounded-md p-2 focus:ring-yellow-500 focus:border-yellow-500"
                />
            </div>
            <div>
                <label htmlFor="session-duration" className="block text-sm font-medium text-gray-400 mb-1">Session Duration</label>
                <select 
                    id="session-duration"
                    value={preferredDuration}
                    onChange={(e) => setPreferredDuration(parseInt(e.target.value, 10))}
                    className="w-full bg-gray-800 border-gray-700 text-white rounded-md p-2 focus:ring-yellow-500 focus:border-yellow-500"
                >
                    {durationOptions.map(opt => <option key={opt} value={opt}>{opt} minutes</option>)}
                </select>
            </div>
        </div>
      </div>

      <p className="text-gray-400 mb-4 text-center">Step 2: Upload your class syllabus (.pdf, .docx)</p>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative w-full h-56 border rounded-xl flex flex-col justify-center items-center transition-all duration-300 ${isDragging ? 'border-yellow-400 shadow-[0_0_25px_rgba(250,204,21,0.2)] bg-yellow-950/50' : 'border-gray-800 bg-gray-900/50 hover:border-gray-600'}`}
      >
        <input
          type="file"
          id="file-upload"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileChange}
          accept=".pdf,.docx"
        />
        <div className="text-center text-gray-400 pointer-events-none">
          <svg className="mx-auto h-12 w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="mt-2 text-lg">
            <span className="font-semibold text-yellow-400">Click to upload</span> or drag and drop
          </p>
          <p className="text-sm">PDF or DOCX files</p>
        </div>
      </div>
      {error && (
        <div className="mt-4 text-center text-red-400 bg-red-900/50 p-3 rounded-lg">
          {error}
        </div>
      )}
    </div>
  );
};

export default FileUpload;