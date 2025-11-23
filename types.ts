export interface StudySession {
  sessionId: string;
  examName: string;
  examDate: string; // YYYY-MM-DD
  sessionTitle: string;
  sessionDate: string; // YYYY-MM-DD
  sessionTime: string; // HH:MM AM/PM
  duration: number; // in minutes
  topics: string;
  extraTask: string;
}

export interface FeedbackInput {
  difficulty_level: number;
  focus_level: number;
  progress_pct: number;
  preparedness_level: number;
  notes: string;
}

export interface AdjustedSession {
  sessionTitle: string;
  sessionDate: string; // YYYY-MM-DD
  sessionTime: string; // e.g., '5:00 PM'
  duration: number;
  topics: string; // Renamed from 'focus' for consistency
  extraTask: string;
}

export interface AdjustmentResponse {
    updatedSessions: AdjustedSession[];
    summaryOfChanges: string[];
    encouragement: string;
}

export interface UserProfile {
  name: string;
  email: string;
  picture: string;
}

export type AppStep = 'upload' | 'processing' | 'results' | 'success';