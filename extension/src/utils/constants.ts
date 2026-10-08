export const RECORDING_STATUS_COLORS = {
  idle: '#666666',
  preparing: '#FFA500',
  recording: '#FF4444',
  paused: '#FFA500',
  processing: '#007BFF',
  completed: '#28A745',
  failed: '#DC3545',
};

export const TRANSCRIPT_STATUS_COLORS = {
  idle: '#666666',
  processing: '#007BFF',
  completed: '#28A745',
  failed: '#DC3545',
};

export const SUMMARY_STATUS_COLORS = {
  idle: '#666666',
  processing: '#007BFF',
  completed: '#28A745',
  failed: '#DC3545',
};

export const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export const DEFAULT_LANGUAGE = 'en-US';

export const SUPPORTED_LANGUAGES = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'en-GB', name: 'English (UK)' },
  { code: 'es-ES', name: 'Spanish' },
  { code: 'fr-FR', name: 'French' },
  { code: 'de-DE', name: 'German' },
  { code: 'it-IT', name: 'Italian' },
  { code: 'pt-PT', name: 'Portuguese' },
  { code: 'ru-RU', name: 'Russian' },
  { code: 'zh-CN', name: 'Chinese (Mandarin)' },
  { code: 'ja-JP', name: 'Japanese' },
];

export const AUDIO_FORMATS = {
  DEFAULT: 'audio/webm',
  MP3: 'audio/mp3',
  WAV: 'audio/wav',
  OGG: 'audio/ogg',
};

export const STORAGE_KEYS = {
  USER: 'recordmeeting_user',
  MEETINGS: 'recordmeeting_meetings',
  RECORDINGS: 'recordmeeting_recordings',
  TRANSCRIPTS: 'recordmeeting_transcripts',
  SUMMARIES: 'recordmeeting_summaries',
  ACTION_ITEMS: 'recordmeeting_action_items',
  TAGS: 'recordmeeting_tags',
  SETTINGS: 'recordmeeting_settings',
  RECORDING_STATE: 'recordmeeting_recording_state',
};

export const MESSAGE_TYPES = {
  START_RECORDING: 'START_RECORDING',
  STOP_RECORDING: 'STOP_RECORDING',
  PAUSE_RECORDING: 'PAUSE_RECORDING',
  RESUME_RECORDING: 'RESUME_RECORDING',
  RECORDING_STATE: 'RECORDING_STATE',
  MEETING_DETECTED: 'MEETING_DETECTED',
  MEETING_INFO: 'MEETING_INFO',
  TRANSCRIPT_UPDATE: 'TRANSCRIPT_UPDATE',
  SUMMARY_UPDATE: 'SUMMARY_UPDATE',
  SAVE_MEETING: 'SAVE_MEETING',
  GET_MEETINGS: 'GET_MEETINGS',
  GET_MEETING: 'GET_MEETING',
  DELETE_MEETING: 'DELETE_MEETING',
  GET_SETTINGS: 'GET_SETTINGS',
  SAVE_SETTINGS: 'SAVE_SETTINGS',
  NOTIFICATION: 'NOTIFICATION',
  ERROR: 'ERROR',
  OPEN_DASHBOARD: 'OPEN_DASHBOARD',
  AUTH_STATE: 'AUTH_STATE',
  REQUEST_PERMISSIONS: 'REQUEST_PERMISSIONS',
  PERMISSIONS_GRANTED: 'PERMISSIONS_GRANTED',
  PERMISSIONS_DENIED: 'PERMISSIONS_DENIED',
};

export const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
};

export const DEEPSEEK_API_URL = 'https://api.deepseek.com';

export const DEEPSEEK_MODELS = {
  SUMMARY: 'deepseek-chat',
  TRANSCRIPTION: 'whisper-1',
};
