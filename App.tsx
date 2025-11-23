
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AppStep, StudySession, FeedbackInput, AdjustmentResponse, UserProfile } from './types';
import { analyzeSyllabus, adjustStudyPlan } from './services/geminiService';
import FileUpload from './components/FileUpload';
import ResultsDisplay, { createSessionEvent } from './components/ResultsDisplay';
import SuccessMessage from './components/SuccessMessage';
import ProcessingView from './components/ProcessingView';
import Header from './components/Header';
import FeedbackModal from './components/FeedbackModal';

const GOOGLE_CLIENT_ID = "1097693008937-07hopqqbu7q5o5o98idhgj5n3nhm6vv7.apps.googleusercontent.com";

declare global {
  interface Window {
    google: any;
  }
}

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>('upload');
  const [studyPlan, setStudyPlan] = useState<StudySession[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [preferredTime, setPreferredTime] = useState('19:00'); // Default to 7:00 PM
  const [preferredDuration, setPreferredDuration] = useState(60); // Default to 60 minutes
  
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [sessionForFeedback, setSessionForFeedback] = useState<StudySession | null>(null);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjustmentResult, setAdjustmentResult] = useState<{ summary: string[]; encouragement: string; } | null>(null);

  // Auth state
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const tokenClient = useRef<any>(null);

  const fetchUserProfile = useCallback(async (token: string) => {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch user profile');
      const profile = await response.json();
      setUserProfile({
        name: profile.name,
        email: profile.email,
        picture: profile.picture,
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Handle error, maybe sign out
    }
  }, []);

  useEffect(() => {
    const initializeGsi = () => {
      // FIX: Removed redundant check for placeholder GOOGLE_CLIENT_ID which was causing a TypeScript error as the ID has been set.
      if (window.google) {
        tokenClient.current = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
          callback: async (tokenResponse: any) => {
            if (tokenResponse.error) {
                console.error("Google Sign-In Error:", tokenResponse);
                alert(`Sign-in failed: ${tokenResponse.error_description || tokenResponse.error}`);
                return;
            }
            if (tokenResponse && tokenResponse.access_token) {
              setAccessToken(tokenResponse.access_token);
              await fetchUserProfile(tokenResponse.access_token);
              setIsSignedIn(true);
            }
          },
        });
      }
    };
     if (document.readyState === 'complete') {
        initializeGsi();
    } else {
        window.addEventListener('load', initializeGsi);
        return () => window.removeEventListener('load', initializeGsi);
    }
  }, [fetchUserProfile]);

  const handleSignIn = useCallback(() => {
    if (tokenClient.current) {
      tokenClient.current.requestAccessToken({ prompt: '' });
    } else {
        alert("Google Sign-In is not ready. Please check if your ad blocker is preventing the script from loading.");
    }
  }, []);

  const handleSignOut = useCallback(() => {
    if (accessToken && window.google) {
        window.google.accounts.oauth2.revoke(accessToken, () => {});
    }
    setAccessToken(null);
    setIsSignedIn(false);
    setUserProfile(null);
  }, [accessToken]);


  const handleFileAnalyze = useCallback(async (file: File) => {
    setStep('processing');
    setError(null);
    setAdjustmentResult(null);
    try {
      const results = await analyzeSyllabus(file, preferredTime, preferredDuration);
      if (results.length === 0) {
          setError("Couldn't find any exams in the syllabus to build a study plan. Please try another file.");
          setStep('upload');
          return;
      }
      setStudyPlan(results);
      setStep('results');
    } catch (err) {
      console.error('Analysis failed:', err);
      setError('An error occurred while analyzing the syllabus. Please try again.');
      setStep('upload');
    }
  }, [preferredTime, preferredDuration]);

  const handleContinueFromResults = useCallback(() => {
    setStep('success');
  }, []);

  const handleReset = useCallback(() => {
    setStep('upload');
    setStudyPlan([]);
    setError(null);
    setAdjustmentResult(null);
  }, []);

  const handleOpenFeedbackModal = useCallback((session: StudySession) => {
    setSessionForFeedback(session);
    setIsFeedbackModalOpen(true);
    setAdjustmentResult(null);
  }, []);

  const handleCloseFeedbackModal = useCallback(() => {
    setIsFeedbackModalOpen(false);
    setSessionForFeedback(null);
  }, []);
  

  const handleSubmitFeedback = useCallback(async (feedback: FeedbackInput) => {
    if (!sessionForFeedback) return;

    setIsAdjusting(true);
    setError(null);
    handleCloseFeedbackModal();

    try {
      const upcomingSessions = studyPlan.filter(s => {
        // Robust filtering even if sessionTime format varies
        const d = new Date(`${s.sessionDate} 12:00`); 
        // Note: simplified comparison, good enough for 'upcoming' check on date level
        return s.examName === sessionForFeedback.examName && d >= new Date(new Date().setHours(0,0,0,0));
      });

      const result = await adjustStudyPlan(feedback, sessionForFeedback.examName, upcomingSessions);
      
          const newAdjustedSessions: StudySession[] = result.updatedSessions.map((adjSess, index) => ({
      ...adjSess,
      examName: sessionForFeedback.examName,
      examDate: sessionForFeedback.examDate,
      sessionId: `${sessionForFeedback.examName.replace(/\s+/g, '_')}_adj_${Date.now()}_${index}`,
    }));
    
    // ✅ NEW: make it clear when calendar will not be updated
    if (!isSignedIn || !accessToken) {
      console.warn('Skipping calendar update because user is not signed in or missing accessToken.');
    }

      
      if (isSignedIn && accessToken) {
        try {
          const examNameQueryParam = sessionForFeedback.examName.replace(/\s+/g, '_');
          
                  const timeMin = new Date().toISOString();

        const listResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?privateExtendedProperty=${encodeURIComponent(
            `examName=${examNameQueryParam}`
          )}&timeMin=${encodeURIComponent(timeMin)}`,
          {
            headers: { 'Authorization': `Bearer ${accessToken}` },
          }
        );

        if (!listResponse.ok) {
          const errText = await listResponse.text();
          console.error('Failed to list existing events for exam', {
            status: listResponse.status,
            errText,
          });
           // We do not throw here to allow the UI to update the plan even if calendar fails
           console.warn('Skipping calendar deletion due to list error');
        } else {
             const { items: eventsToDelete } = await listResponse.json();
              if (eventsToDelete && eventsToDelete.length > 0) {
                await Promise.all(eventsToDelete.map(event =>
                  fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${event.id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                  })
                ));
              }
        }


                  await Promise.all(
          newAdjustedSessions.map(async (session) => {
            const eventData = createSessionEvent(session);
            const resp = await fetch(
              'https://www.googleapis.com/calendar/v3/calendars/primary/events',
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(eventData),
              }
            );

            if (!resp.ok) {
              const errText = await resp.text();
              console.error('Failed to create adjusted event', {
                status: resp.status,
                errText,
                eventData,
              });
              // We log but don't stop others
            }
          })
        );


        } catch (syncError) {
          console.error('Calendar sync failed:', syncError);
          setError('Your plan was adjusted, but we failed to update your Google Calendar completely. Please check your calendar.');
        }
      }

      const pastSessionsForExam = studyPlan.filter(s => {
         const sessionDateTime = new Date(`${s.sessionDate}T${s.sessionTime.replace(/( AM| PM)/, ':00').replace(' ', '')}`);
         return s.examName === sessionForFeedback.examName && sessionDateTime < new Date();
      });
      
      const otherExamsSessions = studyPlan.filter(s => s.examName !== sessionForFeedback.examName);

      setStudyPlan([...otherExamsSessions, ...pastSessionsForExam, ...newAdjustedSessions]);
      setAdjustmentResult({ summary: result.summaryOfChanges, encouragement: result.encouragement });

    } catch (err) {
      console.error('Adjustment failed:', err);
      setError('An error occurred while adjusting the study plan. Please try again.');
    } finally {
      setIsAdjusting(false);
    }
  }, [studyPlan, sessionForFeedback, handleCloseFeedbackModal, isSignedIn, accessToken, handleSignOut]);

  const renderStep = () => {
    switch (step) {
      case 'upload':
        return (
          <FileUpload
            onFileUpload={handleFileAnalyze}
            error={error}
            preferredTime={preferredTime}
            setPreferredTime={setPreferredTime}
            preferredDuration={preferredDuration}
            setPreferredDuration={setPreferredDuration}
          />
        );
      case 'processing':
        return <ProcessingView />;
      case 'results':
        return <ResultsDisplay 
                  plan={studyPlan} 
                  onContinue={handleContinueFromResults} 
                  onFeedback={handleOpenFeedbackModal}
                  adjustmentResult={adjustmentResult}
                  isAdjusting={isAdjusting}
                  isSignedIn={isSignedIn}
                  accessToken={accessToken}
                  onAuthError={handleSignOut}
                  error={error}
                />;
      case 'success':
        return <SuccessMessage onReset={handleReset} />;
    }
  };

  return (
    <div className="min-h-screen text-gray-200 flex flex-col items-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-4xl mx-auto">
        <Header 
            isSignedIn={isSignedIn}
            userProfile={userProfile}
            onSignIn={handleSignIn}
            onSignOut={handleSignOut}
        />
        <main className="mt-8">
          {renderStep()}
        </main>
        {isFeedbackModalOpen && sessionForFeedback && (
          <FeedbackModal 
            session={sessionForFeedback}
            onClose={handleCloseFeedbackModal}
            onSubmit={handleSubmitFeedback}
          />
        )}
      </div>
    </div>
  );
};

export default App;
