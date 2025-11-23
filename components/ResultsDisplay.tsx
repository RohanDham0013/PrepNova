
import React, { useMemo, useState, useCallback } from 'react';
import { StudySession } from '../types';

interface ResultsDisplayProps {
  plan: StudySession[];
  onContinue: () => void;
  onFeedback: (session: StudySession) => void;
  adjustmentResult: { summary: string[]; encouragement: string; } | null;
  isAdjusting: boolean;
  isSignedIn: boolean;
  accessToken: string | null;
  onAuthError: () => void;
  error: string | null;
}

export const createSessionEvent = (session: StudySession) => {
  // Robust time parsing to handle AI variations (e.g. "7:00 PM", "07:00pm", "19:00", "7:00")
  const timeRegex = /(\d{1,2})[:.](\d{2})\s?([AaPp][Mm])?/;
  const match = session.sessionTime.match(timeRegex);

  let hours = 12; // Default to noon if parsing fails completely
  let minutes = 0;

  if (match) {
    hours = parseInt(match[1], 10);
    minutes = parseInt(match[2], 10);
    const modifier = match[3] ? match[3].toUpperCase() : null;

    if (modifier === 'PM' && hours < 12) {
      hours += 12;
    } else if (modifier === 'AM' && hours === 12) {
      hours = 0;
    }
  } else {
    // Attempt native date parsing as fallback
    const d = new Date(`2000-01-01 ${session.sessionTime}`);
    if (!isNaN(d.getTime())) {
      hours = d.getHours();
      minutes = d.getMinutes();
    } else {
      console.warn("Could not parse time string:", session.sessionTime);
    }
  }

  // Robust date parsing (handles YYYY-MM-DD and YYYY/MM/DD)
  const dateParts = session.sessionDate.split(/[-/]/).map(Number);
  const year = dateParts[0] || new Date().getFullYear();
  const month = (dateParts[1] || 1) - 1; // Month is 0-indexed
  const day = dateParts[2] || 1;

  const startTime = new Date(year, month, day, hours, minutes, 0, 0);
  const endTime = new Date(startTime.getTime() + session.duration * 60000);

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const toLocalCalendarString = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d}T${h}:${min}:00`;
  };

  return {
    summary: session.sessionTitle,
    description: `Topics to study: ${session.topics}\n\nOptional extra task: ${session.extraTask}\n\nEvent from PrepNova Study Planner.`,
    start: { dateTime: toLocalCalendarString(startTime), timeZone },
    end:   { dateTime: toLocalCalendarString(endTime),   timeZone },
    extendedProperties: {
      private: {
        sessionId: session.sessionId,
        examName: session.examName.replace(/\s+/g, '_'),
      },
    },
  };
};

const createExamEvent = (examName: string, examDate: string) => {
  // Ensure date is valid for all-day event
  let safeDate = examDate;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(examDate)) {
      const d = new Date(examDate);
      if (!isNaN(d.getTime())) {
          safeDate = d.toISOString().split('T')[0];
      }
  }

  const nextDay = new Date(safeDate);
  nextDay.setDate(nextDay.getDate() + 1);
  const endDateStr = nextDay.toISOString().split('T')[0];

  return {
    summary: `${examName} Exam`,
    description: `Exam: ${examName}\n\nEvent from PrepNova Study Planner.`,
    start: { date: safeDate },
    end: { date: endDateStr },
  };
};

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ plan, onContinue, onFeedback, adjustmentResult, isAdjusting, isSignedIn, accessToken, onAuthError, error }) => {
  
  type CalendarStatus = 'idle' | 'loading' | 'success' | 'error';
  const [calendarStatus, setCalendarStatus] = useState<Record<string, CalendarStatus>>({});
  const [addAllStatus, setAddAllStatus] = useState<Record<string, { status: CalendarStatus, progress: string }>>({});

  const groupedPlan = useMemo(() => {
    return plan.reduce((acc: Record<string, { examDate: string, sessions: StudySession[] }>, session) => {
      if (!acc[session.examName]) {
        acc[session.examName] = {
          examDate: session.examDate,
          sessions: [],
        };
      }
      acc[session.examName].sessions.push(session);
      acc[session.examName].sessions.sort((a, b) => {
          // Use robust parsing for sorting as well
          const parseTime = (dateStr: string, timeStr: string) => {
              // Quick parse similar to createSessionEvent for sorting
              const tRegex = /(\d{1,2})[:.](\d{2})\s?([AaPp][Mm])?/;
              const tMatch = timeStr.match(tRegex);
              let h = 0, m = 0;
              if (tMatch) {
                  h = parseInt(tMatch[1]);
                  m = parseInt(tMatch[2]);
                  if (tMatch[3]?.toUpperCase() === 'PM' && h < 12) h += 12;
                  if (tMatch[3]?.toUpperCase() === 'AM' && h === 12) h = 0;
              }
              return new Date(`${dateStr}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`).getTime();
          };
          
          return parseTime(a.sessionDate, a.sessionTime) - parseTime(b.sessionDate, b.sessionTime);
      });
      return acc;
    }, {} as Record<string, { examDate: string, sessions: StudySession[] }>);
  }, [plan]);

  const addEventToCalendar = useCallback(async (eventData: object) => {
    if (!accessToken) return false;
    try {
      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventData)
      });

      if (response.status === 401) {
        onAuthError();
        throw new Error('Authentication failed. Please sign in again.');
      }
      if (!response.ok) {
        const errorData = await response.json();
        const msg = errorData.error?.message || 'Failed to create event.';
        alert(`Google Calendar Error: ${msg}`); // Explicit feedback
        throw new Error(msg);
      }
      return true;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      // If we haven't already alerted (e.g. network error), alert now
      if (error instanceof Error && !error.message.includes('Google Calendar Error')) {
         alert(`Network or System Error: ${error.message}`);
      }
      return false;
    }
  }, [accessToken, onAuthError]);

  const handleAddEvent = async (id: string, eventData: object) => {
    setCalendarStatus(prev => ({...prev, [id]: 'loading'}));
    const success = await addEventToCalendar(eventData);
    setCalendarStatus(prev => ({...prev, [id]: success ? 'success' : 'error'}));
    if (success) {
      setTimeout(() => setCalendarStatus(prev => ({...prev, [id]: 'idle'})), 3000);
    }
  };

  const handleAddAll = async (examName: string, sessions: StudySession[]) => {
    setAddAllStatus(prev => ({ ...prev, [examName]: { status: 'loading', progress: `Adding 1 of ${sessions.length}...` } }));
    
    for (let i = 0; i < sessions.length; i++) {
      const session = sessions[i];
      setAddAllStatus(prev => ({ ...prev, [examName]: { status: 'loading', progress: `Adding ${i + 1} of ${sessions.length}...` } }));
      const eventData = createSessionEvent(session);
      const success = await addEventToCalendar(eventData);
      if (!success) {
        setAddAllStatus(prev => ({ ...prev, [examName]: { status: 'error', progress: `Failed at session ${i + 1}.` } }));
        return;
      }
    }

    setAddAllStatus(prev => ({ ...prev, [examName]: { status: 'success', progress: 'All added!' } }));
    setTimeout(() => setAddAllStatus(prev => ({ ...prev, [examName]: { status: 'idle', progress: '' } })), 5000);
  };

  const CalendarButton = ({ id, onAdd, eventData, isSingle }: { id: string, onAdd: (id: string, data: object) => void, eventData: object, isSingle: boolean }) => {
    const status = calendarStatus[id] || 'idle';
    const baseClasses = "font-semibold px-3 py-1.5 rounded-lg transition-colors duration-200 text-sm text-center disabled:opacity-50 disabled:cursor-not-allowed";
    const singleClasses = `w-full md:w-auto ${baseClasses}`;
    const examClasses = `${baseClasses} px-4 py-2`;
    
    let content;
    switch (status) {
        case 'loading': content = <div className="w-4 h-4 border-2 border-white border-solid border-t-transparent rounded-full animate-spin mx-auto"></div>; break;
        case 'success': content = "✓ Added!"; break;
        case 'error': content = "Retry"; break;
        default: content = isSingle ? "Add to Calendar" : "Add Exam to Calendar";
    }

    return (
        <button onClick={() => onAdd(id, eventData)} disabled={!isSignedIn || status === 'loading'} className={`${isSingle ? singleClasses : examClasses} ${isSingle ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 hover:bg-yellow-500/20' : 'bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700'}`}>
            {content}
        </button>
    );
  };
  
   const AddAllButton = ({ examName, sessions }: { examName: string, sessions: StudySession[] }) => {
    const statusInfo = addAllStatus[examName] || { status: 'idle', progress: '' };
    const { status, progress } = statusInfo;
    
    let content;
    switch (status) {
        case 'loading': content = progress; break;
        case 'success': content = progress; break;
        case 'error': content = progress; break;
        default: content = "Add All Sessions";
    }

    return (
        <button
            onClick={() => handleAddAll(examName, sessions)}
            disabled={!isSignedIn || status === 'loading'}
            className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 font-semibold px-4 py-2 rounded-lg hover:bg-yellow-500/20 transition-colors duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {content}
        </button>
    );
  };


  return (
    <div className="w-full flex flex-col items-center">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-100">Your AI Study Plan is Ready!</h2>
        <p className="text-gray-400 mt-2">Here is your personalized schedule. Give feedback on any session to adjust your plan.</p>
        {!isSignedIn && <p className="mt-4 text-yellow-400 bg-yellow-900/50 p-3 rounded-lg">Sign in with Google to add events to your calendar.</p>}
      </div>
      
      {error && (
        <div className="w-full max-w-2xl mb-6 p-4 border border-red-500/30 bg-red-900/50 rounded-lg text-center text-red-300">
          {error}
        </div>
      )}

       {isAdjusting && (
        <div className="w-full max-w-2xl mb-6 p-4 border border-yellow-500/30 bg-yellow-900/50 rounded-lg text-center">
          <p className="text-yellow-300 animate-pulse">🤖 AI is adjusting your plan and updating your calendar...</p>
        </div>
      )}

      {adjustmentResult && (
        <div className="w-full max-w-2xl mb-8 p-6 bg-gray-900 border border-yellow-500/30 rounded-xl shadow-lg shadow-yellow-500/10">
          <h3 className="text-xl font-bold text-yellow-300 mb-3">Plan Adjusted!</h3>
          <p className="text-gray-300 mb-2 font-semibold">Summary of Changes:</p>
          <ul className="list-disc list-inside text-gray-400 space-y-1 mb-4">
            {adjustmentResult.summary.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
          <p className="text-gray-300 italic">"{adjustmentResult.encouragement}"</p>
        </div>
      )}

      <div className="w-full space-y-8 mb-8">
        {Object.keys(groupedPlan).map((examName) => {
          const data = groupedPlan[examName];
          return (
            <div key={examName}>
              <div className="mb-4 p-4 bg-gray-900/70 border border-gray-800 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div>
                      <h3 className="text-2xl font-bold text-yellow-300">{examName}</h3>
                      <p className="text-gray-400">Exam Date: {data.examDate}</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                        <CalendarButton id={examName} onAdd={handleAddEvent} eventData={createExamEvent(examName, data.examDate)} isSingle={false} />
                        <AddAllButton examName={examName} sessions={data.sessions} />
                  </div>
              </div>
              <div className="space-y-4">
                  {data.sessions.map((session) => (
                      <div key={session.sessionId} className="bg-gray-900 border border-gray-800 rounded-lg p-4 transition-all duration-300 hover:border-yellow-500/50 hover:shadow-lg hover:shadow-yellow-500/10 flex flex-col md:flex-row gap-4 items-start">
                          <div className="flex-grow">
                              <h4 className="text-lg font-semibold text-gray-200 mb-2">{session.sessionTitle}</h4>
                               <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-400 mb-3">
                                  <span>🗓️ {session.sessionDate} at {session.sessionTime}</span>
                                  <span>⏳ {session.duration} minutes</span>
                              </div>
                              <p className="text-gray-300"><strong className="font-medium text-gray-100">Topics:</strong> {session.topics}</p>
                              <p className="mt-2 text-gray-400 italic"><strong className="font-medium not-italic">Extra Task:</strong> {session.extraTask}</p>
                          </div>
                          <div className="flex-shrink-0 flex items-center gap-2 w-full md:w-auto">
                              <button onClick={() => onFeedback(session)} className="w-full md:w-auto bg-gray-800/80 border border-gray-700/80 text-gray-300 font-semibold px-3 py-1.5 rounded-lg hover:bg-gray-700/80 transition-colors duration-200 text-sm text-center">
                                  Feedback
                              </button>
                               <CalendarButton id={session.sessionId} onAdd={handleAddEvent} eventData={createSessionEvent(session)} isSingle={true} />
                          </div>
                      </div>
                  ))}
              </div>
            </div>
          );
        })}
      </div>
      
      <button
        onClick={onContinue}
        className="bg-yellow-500 text-black font-semibold px-8 py-3 rounded-md hover:bg-yellow-600 transition-colors duration-200"
      >
        Done
      </button>
    </div>
  );
};

export default ResultsDisplay;
