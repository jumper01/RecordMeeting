export type RecordingStatus = 
  | 'idle'
  | 'preparing'
  | 'recording'
  | 'paused'
  | 'processing'
  | 'completed'
  | 'failed';

export type TranscriptStatus = 
  | 'idle'
  | 'processing'
  | 'completed'
  | 'failed';

export type SummaryStatus = 
  | 'idle'
  | 'processing'
  | 'completed'
  | 'failed';

export interface Meeting {
  id: string;
  userId: string;
  googleMeetId: string;
  title: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  participants: string[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Recording {
  id: string;
  meetingId: string;
  audioBlob: Blob;
  audioUrl: string;
  duration: number;
  fileSize: number;
  format: string;
  status: RecordingStatus;
  createdAt: number;
}

export interface TranscriptSegment {
  id: string;
  transcriptId: string;
  speaker: string;
  startTime: number;
  endTime: number;
  text: string;
}

export interface Transcript {
  id: string;
  meetingId: string;
  language: string;
  text: string;
  segments: TranscriptSegment[];
  status: TranscriptStatus;
  createdAt: number;
}

export interface Summary {
  id: string;
  meetingId: string;
  executiveSummary: string;
  keyPoints: string[];
  decisions: string[];
  actionItems: ActionItem[];
  openQuestions: string[];
  importantTopics: string[];
  status: SummaryStatus;
  createdAt: number;
}

export interface ActionItem {
  id: string;
  meetingId: string;
  task: string;
  owner: string;
  dueDate?: string;
  status: 'open' | 'completed' | 'in_progress';
  createdAt: number;
  updatedAt: number;
}

export interface Tag {
  id: string;
  userId: string;
  name: string;
}

export interface User {
  id: string;
  googleId?: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
  createdAt: number;
  updatedAt: number;
}

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  status: RecordingStatus;
  startTime?: number;
  pauseTime?: number;
  totalPausedTime: number;
  mediaRecorder?: MediaRecorder;
  audioChunks: Blob[];
  currentMeetingId?: string;
}

export interface MeetingInfo {
  meetingId: string;
  title: string;
  participants: string[];
  startTime: number;
}

export interface AppSettings {
  id: string;
  userId: string;
  recording: {
    defaultBehavior: 'manual' | 'auto';
    audioQuality: 'low' | 'medium' | 'high';
    autoStart: boolean;
    notifications: boolean;
  };
  transcription: {
    language: string;
    speakerDetection: boolean;
    autoGenerate: boolean;
  };
  ai: {
    autoSummarize: boolean;
    generateActionItems: boolean;
    generateDecisions: boolean;
  };
  storage: {
    retentionDays: number;
    autoDelete: boolean;
  };
  privacy: {
    dataControls: boolean;
  };
  createdAt: number;
  updatedAt: number;
}

export interface Message {
  type: string;
  data?: any;
  from?: string;
  to?: string;
}

export interface MessageTypes {
  START_RECORDING: 'START_RECORDING';
  STOP_RECORDING: 'STOP_RECORDING';
  PAUSE_RECORDING: 'PAUSE_RECORDING';
  RESUME_RECORDING: 'RESUME_RECORDING';
  RECORDING_STATE: 'RECORDING_STATE';
  MEETING_DETECTED: 'MEETING_DETECTED';
  MEETING_INFO: 'MEETING_INFO';
  TRANSCRIPT_UPDATE: 'TRANSCRIPT_UPDATE';
  SUMMARY_UPDATE: 'SUMMARY_UPDATE';
  SAVE_MEETING: 'SAVE_MEETING';
  GET_MEETINGS: 'GET_MEETINGS';
  GET_MEETING: 'GET_MEETING';
  DELETE_MEETING: 'DELETE_MEETING';
  GET_SETTINGS: 'GET_SETTINGS';
  SAVE_SETTINGS: 'SAVE_SETTINGS';
  NOTIFICATION: 'NOTIFICATION';
  ERROR: 'ERROR';
  OPEN_DASHBOARD: 'OPEN_DASHBOARD';
  AUTH_STATE: 'AUTH_STATE';
}
