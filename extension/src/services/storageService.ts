import { v4 as uuidv4 } from 'uuid';
import {
  Meeting,
  Recording,
  Transcript,
  TranscriptSegment,
  Summary,
  ActionItem,
  Tag,
  User,
  AppSettings,
  RecordingStatus,
  TranscriptStatus,
  SummaryStatus,
} from '../types/types';
import { db } from './database';

export class StorageService {
  // Meeting operations
  static async createMeeting(
    userId: string,
    googleMeetId: string,
    title: string,
    participants: string[] = [],
    startTime: number = Date.now()
  ): Promise<Meeting> {
    const meeting: Meeting = {
      id: `RM-${new Date().toISOString().split('T')[0]}-${uuidv4().split('-')[0]}`,
      userId,
      googleMeetId,
      title,
      participants,
      startTime,
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    await db.addMeeting(meeting);
    return meeting;
  }

  static async getMeeting(id: string): Promise<Meeting | null> {
    const meeting = await db.getMeeting(id);
    return meeting || null;
  }

  static async getMeetingsByUser(userId: string): Promise<Meeting[]> {
    return db.getMeetingsByUser(userId);
  }

  static async getMeetingByGoogleMeetId(googleMeetId: string): Promise<Meeting | null> {
    const meeting = await db.getMeetingsByGoogleMeetId(googleMeetId);
    return meeting || null;
  }

  static async updateMeeting(meeting: Meeting): Promise<Meeting> {
    meeting.updatedAt = Date.now();
    await db.updateMeeting(meeting);
    return meeting;
  }

  static async deleteMeeting(id: string): Promise<void> {
    await db.deleteMeeting(id);
  }

  static async searchMeetings(userId: string, query: string): Promise<Meeting[]> {
    return db.searchMeetings(userId, query);
  }

  // Recording operations
  static async createRecording(
    meetingId: string,
    audioBlob: Blob,
    duration: number,
    fileSize: number,
    format: string = 'audio/webm'
  ): Promise<Recording> {
    const recording: Recording = {
      id: uuidv4(),
      meetingId,
      audioBlob,
      audioUrl: URL.createObjectURL(audioBlob),
      duration,
      fileSize,
      format,
      status: 'completed',
      createdAt: Date.now(),
    };
    
    await db.addRecording(recording);
    return recording;
  }

  static async getRecording(id: string): Promise<Recording | null> {
    const recording = await db.getRecording(id);
    return recording || null;
  }

  static async getRecordingsByMeeting(meetingId: string): Promise<Recording[]> {
    return db.getRecordingsByMeeting(meetingId);
  }

  static async updateRecording(recording: Recording): Promise<Recording> {
    await db.updateRecording(recording);
    return recording;
  }

  static async deleteRecording(id: string): Promise<void> {
    await db.deleteRecording(id);
  }

  // Transcript operations
  static async createTranscript(
    meetingId: string,
    language: string = 'en-US',
    text: string = '',
    segments: TranscriptSegment[] = []
  ): Promise<Transcript> {
    const transcript: Transcript = {
      id: uuidv4(),
      meetingId,
      language,
      text,
      segments,
      status: 'idle',
      createdAt: Date.now(),
    };
    
    await db.addTranscript(transcript);
    return transcript;
  }

  static async getTranscript(id: string): Promise<Transcript | null> {
    const transcript = await db.getTranscript(id);
    return transcript || null;
  }

  static async getTranscriptByMeeting(meetingId: string): Promise<Transcript | null> {
    const transcript = await db.getTranscriptByMeeting(meetingId);
    return transcript || null;
  }

  static async updateTranscript(transcript: Transcript): Promise<Transcript> {
    await db.updateTranscript(transcript);
    return transcript;
  }

  static async updateTranscriptStatus(
    meetingId: string,
    status: TranscriptStatus,
    text?: string,
    segments?: TranscriptSegment[]
  ): Promise<Transcript | null> {
    const transcript = await this.getTranscriptByMeeting(meetingId);
    if (!transcript) return null;
    
    transcript.status = status;
    if (text) transcript.text = text;
    if (segments) transcript.segments = segments;
    
    await db.updateTranscript(transcript);
    return transcript;
  }

  static async addTranscriptSegment(
    transcriptId: string,
    segment: Omit<TranscriptSegment, 'id'>
  ): Promise<TranscriptSegment> {
    const newSegment: TranscriptSegment = {
      id: uuidv4(),
      ...segment,
    };
    
    await db.addTranscriptSegment(newSegment);
    return newSegment;
  }

  static async getTranscriptSegments(transcriptId: string): Promise<TranscriptSegment[]> {
    return db.getTranscriptSegments(transcriptId);
  }

  // Summary operations
  static async createSummary(meetingId: string): Promise<Summary> {
    const summary: Summary = {
      id: uuidv4(),
      meetingId,
      executiveSummary: '',
      keyPoints: [],
      decisions: [],
      actionItems: [],
      openQuestions: [],
      importantTopics: [],
      status: 'idle',
      createdAt: Date.now(),
    };
    
    await db.addSummary(summary);
    return summary;
  }

  static async getSummary(id: string): Promise<Summary | null> {
    const summary = await db.getSummary(id);
    return summary || null;
  }

  static async getSummaryByMeeting(meetingId: string): Promise<Summary | null> {
    const summary = await db.getSummaryByMeeting(meetingId);
    return summary || null;
  }

  static async updateSummary(summary: Summary): Promise<Summary> {
    await db.updateSummary(summary);
    return summary;
  }

  static async updateSummaryStatus(
    meetingId: string,
    status: SummaryStatus,
    data?: Partial<Omit<Summary, 'id' | 'meetingId' | 'status' | 'createdAt'>>
  ): Promise<Summary | null> {
    const summary = await this.getSummaryByMeeting(meetingId);
    if (!summary) return null;
    
    summary.status = status;
    if (data) {
      Object.assign(summary, data);
    }
    
    await db.updateSummary(summary);
    return summary;
  }

  // Action item operations
  static async createActionItem(
    meetingId: string,
    task: string,
    owner: string = 'Not specified',
    dueDate?: string,
    status: 'open' | 'completed' | 'in_progress' = 'open'
  ): Promise<ActionItem> {
    const actionItem: ActionItem = {
      id: uuidv4(),
      meetingId,
      task,
      owner,
      dueDate,
      status,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    await db.addActionItem(actionItem);
    return actionItem;
  }

  static async getActionItem(id: string): Promise<ActionItem | null> {
    const actionItem = await db.getActionItem(id);
    return actionItem || null;
  }

  static async getActionItemsByMeeting(meetingId: string): Promise<ActionItem[]> {
    return db.getActionItemsByMeeting(meetingId);
  }

  static async updateActionItem(actionItem: ActionItem): Promise<ActionItem> {
    actionItem.updatedAt = Date.now();
    await db.updateActionItem(actionItem);
    return actionItem;
  }

  static async deleteActionItem(id: string): Promise<void> {
    await db.deleteActionItem(id);
  }

  // Tag operations
  static async createTag(userId: string, name: string): Promise<Tag> {
    const existing = await db.getTagByName(userId, name);
    if (existing) {
      return existing;
    }
    
    const tag: Tag = {
      id: uuidv4(),
      userId,
      name,
    };
    
    await db.addTag(tag);
    return tag;
  }

  static async getTag(id: string): Promise<Tag | null> {
    const tag = await db.getTag(id);
    return tag || null;
  }

  static async getTagsByUser(userId: string): Promise<Tag[]> {
    return db.getTagsByUser(userId);
  }

  static async deleteTag(id: string): Promise<void> {
    await db.deleteTag(id);
  }

  // User operations
  static async createUser(
    googleId?: string,
    email?: string,
    name?: string,
    avatarUrl?: string
  ): Promise<User> {
    const user: User = {
      id: uuidv4(),
      googleId,
      email,
      name,
      avatarUrl,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    await db.addUser(user);
    return user;
  }

  static async getUser(id: string): Promise<User | null> {
    const user = await db.getUser(id);
    return user || null;
  }

  static async getUserByGoogleId(googleId: string): Promise<User | null> {
    const user = await db.getUserByGoogleId(googleId);
    return user || null;
  }

  static async updateUser(user: User): Promise<User> {
    user.updatedAt = Date.now();
    await db.updateUser(user);
    return user;
  }

  static async deleteUser(id: string): Promise<void> {
    await db.deleteUser(id);
  }

  // Settings operations
  static async getSettings(userId: string): Promise<AppSettings | null> {
    const settings = await db.getSettings(userId);
    return settings || null;
  }

  static async saveSettings(userId: string, settings: Partial<AppSettings>): Promise<AppSettings> {
    const existing = await this.getSettings(userId);
    const defaultSettings: AppSettings = {
      id: uuidv4(),
      userId,
      recording: {
        defaultBehavior: 'manual',
        audioQuality: 'medium',
        autoStart: false,
        notifications: true,
      },
      transcription: {
        language: 'en-US',
        speakerDetection: true,
        autoGenerate: true,
      },
      ai: {
        autoSummarize: true,
        generateActionItems: true,
        generateDecisions: true,
      },
      storage: {
        retentionDays: 30,
        autoDelete: false,
      },
      privacy: {
        dataControls: true,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    const mergedSettings = { ...defaultSettings, ...existing, ...settings, id: existing?.id || defaultSettings.id };
    mergedSettings.updatedAt = Date.now();
    
    await db.saveSettings(mergedSettings);
    return mergedSettings;
  }

  // Statistics
  static async getUserStats(userId: string) {
    return db.getUserStats(userId);
  }

  // Export operations
  static async exportMeeting(meetingId: string): Promise<{
    meeting: Meeting | null;
    recording: Recording | null;
    transcript: Transcript | null;
    summary: Summary | null;
    actionItems: ActionItem[];
  }> {
    const meeting = await this.getMeeting(meetingId);
    const recording = meeting ? await this.getRecordingsByMeeting(meetingId).then(r => r[0] || null) : null;
    const transcript = meeting ? await this.getTranscriptByMeeting(meetingId) : null;
    const summary = meeting ? await this.getSummaryByMeeting(meetingId) : null;
    const actionItems = meeting ? await this.getActionItemsByMeeting(meetingId) : [];
    
    return {
      meeting,
      recording,
      transcript,
      summary,
      actionItems,
    };
  }
}
