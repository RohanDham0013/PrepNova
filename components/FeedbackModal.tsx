import React, { useState } from 'react';
import { StudySession, FeedbackInput } from '../types';

interface FeedbackModalProps {
  session: StudySession;
  onClose: () => void;
  onSubmit: (feedback: FeedbackInput) => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ session, onClose, onSubmit }) => {
  const [difficulty, setDifficulty] = useState(3);
  const [focus, setFocus] = useState(3);
  const [progress, setProgress] = useState(50);
  const [preparedness, setPreparedness] = useState(3);
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      difficulty_level: difficulty,
      focus_level: focus,
      progress_pct: progress,
      preparedness_level: preparedness,
      notes: notes,
    });
  };
  
  const Slider = ({ label, value, setValue, min, max, step, displaySuffix = '' }: { label: string, value: number, setValue: (val: number) => void, min: number, max: number, step: number, displaySuffix?: string }) => (
    <div>
      <label className="block text-sm font-medium text-gray-400 mb-2 flex justify-between">
        <span>{label}</span>
        <span className="font-bold text-yellow-400">{value}{displaySuffix}</span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-400"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-gray-950 border border-gray-800 rounded-xl shadow-2xl shadow-black/50 w-full max-w-lg p-6 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
            <div>
                 <h2 className="text-xl font-bold text-white">Session Feedback</h2>
                 <p className="text-sm text-gray-400">For: {session.sessionTitle}</p>
            </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
            <Slider label="Difficulty Level" value={difficulty} setValue={setDifficulty} min={1} max={5} step={1} />
            <Slider label="Focus Level" value={focus} setValue={setFocus} min={1} max={5} step={1} />
            <Slider label="Progress Made" value={progress} setValue={setProgress} min={0} max={100} step={10} displaySuffix="%" />
            <Slider label="Preparedness Level" value={preparedness} setValue={setPreparedness} min={1} max={5} step={1} />

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-400 mb-1">Notes</label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., 'Had trouble focusing on calorimetry...'"
                rows={3}
                className="w-full bg-gray-800 border-gray-700 text-white rounded-md p-2 focus:ring-yellow-500 focus:border-yellow-500"
              />
            </div>
            
            <div className="flex justify-end gap-4">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-md bg-gray-700 hover:bg-gray-600 text-white font-semibold transition-colors">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 rounded-md bg-yellow-500 hover:bg-yellow-600 text-black font-semibold transition-colors">
                Adjust My Plan
              </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default FeedbackModal;