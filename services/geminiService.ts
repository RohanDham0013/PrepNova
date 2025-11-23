import { GoogleGenAI, Type } from '@google/genai';
import { StudySession, FeedbackInput, AdjustmentResponse } from '../types';

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result.split(',')[1]);
      } else {
        resolve(''); // Should not happen with readAsDataURL
      }
    };
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

export const analyzeSyllabus = async (file: File, preferredTime: string, preferredDuration: number): Promise<StudySession[]> => {
  if (!process.env.API_KEY) {
    throw new Error('API_KEY environment variable not set');
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const filePart = await fileToGenerativePart(file);

  const prompt = `You are Prep Nova's Study Planner. Your role is to analyze the provided syllabus, identify all exams (including midterms, finals, tests, quizzes), and generate a personalized study plan using a scientifically-based spaced repetition schedule.

**User Preferences:**
- Preferred Study Time: ${preferredTime}
- Preferred Session Duration: ${preferredDuration} minutes

**Input Analysis:**
From the syllabus, extract each exam's name, date, and the topics it covers.

**Study Plan Generation Rules:**
For each exam identified, create a series of study sessions leading up to it.

1.  **Spaced Repetition Intervals:** Schedule sessions at decreasing intervals as the exam approaches. From the exam date, schedule sessions backwards at approximately: 1 day before, 3 days before, 7 days before, 14 days before, and 28 days before, as time permits between today and the exam. If the time is short, adjust the schedule to be more frequent.
2.  **Topic Distribution:** Distribute the exam topics across the study sessions. The earliest sessions should cover new topics. Subsequent sessions should review previously studied topics and introduce new ones. The session 1 day before the exam should be a final review of all topics.
3.  **Session Details:**
    *   **sessionTitle**: Create a clear title, like "Review for Midterm 1: Key Concepts" or "Final Exam Prep: Practice Problems".
    *   **sessionDate**: The date of the study session in YYYY-MM-DD format.
    *   **sessionTime**: Use the user's preferred study time. **IMPORTANT: Format this time in a 12-hour AM/PM format (e.g., '7:00 PM'). Do not use 24-hour military time.**
    *   **duration**: Use the user's preferred session duration in minutes.
    *   **topics**: List the specific topics or chapters to focus on for that session.
    *   **extraTask**: Suggest a small, optional extra task for proactive students, like "Create flashcards for key terms" or "Find and complete one practice quiz online".
4.  **Date Assumption:** Assume today's date is the start date for planning. For syllabus dates without a year, infer it. Assume the current academic year is 2025-2026. Dates in Fall (Sep-Dec) are 2025, dates in Winter/Spring (Jan-May) are 2026.

**Output Constraints:**
- You must only return a JSON array of study session objects.
- Do not include any introductory text, explanations, or summaries. Your entire response must be the JSON data.
- If no exams are found in the syllabus, return an empty array.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [filePart, { text: prompt }],
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            examName: { type: Type.STRING },
            examDate: { type: Type.STRING },
            sessionTitle: { type: Type.STRING },
            sessionDate: { type: Type.STRING },
            sessionTime: { type: Type.STRING },
            duration: { type: Type.NUMBER },
            topics: { type: Type.STRING },
            extraTask: { type: Type.STRING },
          },
          required: ["examName", "examDate", "sessionTitle", "sessionDate", "sessionTime", "duration", "topics", "extraTask"],
        },
      },
    },
  });

  try {
    const jsonString = response.text.trim();
    const parsedJson = JSON.parse(jsonString);
    if (Array.isArray(parsedJson)) {
      return parsedJson.map((session, index) => ({
        ...session,
        sessionId: `${session.examName.replace(/\s+/g, '_')}_${Date.now()}_${index}`
      })) as StudySession[];
    }
    return [];
  } catch (e) {
    console.error("Failed to parse JSON response:", response.text);
    throw new Error("The AI returned an invalid format. Please try again.");
  }
};

export const adjustStudyPlan = async (feedback: FeedbackInput, examName: string, upcomingSessions: StudySession[]): Promise<AdjustmentResponse> => {
    if (!process.env.API_KEY) {
        throw new Error('API_KEY environment variable not set');
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `You are Prep Nova's adaptive study planner. Your task is to update a student's study plan based on their feedback.

**Instructions:**
- Modify the length, frequency, or topics of upcoming sessions based on the feedback and adjustment rules.
- Add or remove sessions when appropriate.
- Ensure all sessions occur before the exam date and do not overlap.
- Always maintain balanced pacing — don’t cluster sessions too close together.
- Rewrite at least the next 3 upcoming sessions to show the applied adjustments.

**Adjustment Rules (🧠):**
- If difficulty_level ≥ 4 or focus_level ≤ 2 → shorten sessions by 15–25 minutes, increase total frequency, and add one catch-up or review session.
- If progress_pct < 70 or preparedness_level ≤ 2 → add a new review session focused on the weakest topics mentioned in the notes.
- If difficulty_level ≤ 2 and preparedness_level ≥ 4 → lengthen future sessions slightly or reduce total session count.

**Context:**
- Exam: ${examName}
- Upcoming Sessions: ${JSON.stringify(upcomingSessions, null, 2)}
- Student Feedback: ${JSON.stringify(feedback, null, 2)}

**Your Task:**
Generate an updated study schedule based on all the information and rules provided.

**Output Format:**
Return your results in the exact JSON structure specified in the schema. Do not include any explanations or extra text.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: prompt }] },
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    updatedSessions: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                sessionTitle: { type: Type.STRING },
                                sessionDate: { type: Type.STRING, description: "Format: YYYY-MM-DD" },
                                sessionTime: { type: Type.STRING, description: "Format: 'h:mm AM/PM', e.g., '5:30 PM'" },
                                duration: { type: Type.NUMBER, description: "In minutes" },
                                topics: { type: Type.STRING },
                                extraTask: { type: Type.STRING },
                            },
                            required: ["sessionTitle", "sessionDate", "sessionTime", "duration", "topics", "extraTask"],
                        }
                    },
                    summaryOfChanges: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    },
                    encouragement: {
                        type: Type.STRING
                    }
                },
                required: ["updatedSessions", "summaryOfChanges", "encouragement"],
            }
        }
    });

    try {
        const jsonString = response.text.trim();
        return JSON.parse(jsonString) as AdjustmentResponse;
    } catch (e) {
        console.error("Failed to parse adjustment JSON response:", response.text);
        throw new Error("The AI returned an invalid format for the adjustment. Please try again.");
    }
};
