import Dexie, { Table } from 'dexie';
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
} from '../types/types';

export class RecordMeetingDatabase extends Dexie {
  meetings!: Table<Meeting, string>;
  recordings!: Table<Recording, string>;
  transcripts!: Table<Transcript, string>;
  transcriptSegments!: Table<TranscriptSegment, string>;
  summaries!: Table<Summary, string>;
  actionItems!: Table<ActionItem, string>;
  tags!: Table<Tag, string>;
  users!: Table<User, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super('RecordMeetingDB');
    
    this.version(1).stores({
      meetings: 'id, userId, googleMeetId, title, startTime, endTime, duration, createdAt, *participants, *tags',
      recordings: 'id, meetingId, duration, fileSize, format, status, createdAt',
      transcripts: 'id, meetingId, language, status, createdAt',
      transcriptSegments: 'id, transcriptId, speaker, startTime, endTime',
      summaries: 'id, meetingId, status, createdAt',
      actionItems: 'id, meetingId, task, owner, dueDate, status, createdAt, updatedAt',
      tags: 'id, userId, name',
      users: 'id, googleId, email, name',
      settings: 'id, userId',
    });
  }

  // Meeting operations
  async addMeeting(meeting: Meeting): Promise<string> {
    await this.meetings.add(meeting);
    return meeting.id;
  }

  async getMeeting(id: string): Promise<Meeting | undefined> {
    return this.meetings.get(id);
  }

  async getMeetingsByUser(userId: string): Promise<Meeting[]> {
    return this.meetings.where('userId').equals(userId).toArray();
  }

  async getMeetingsByGoogleMeetId(googleMeetId: string): Promise<Meeting | undefined> {
    return this.meetings.where('googleMeetId').equals(googleMeetId).first();
  }

  async updateMeeting(meeting: Meeting): Promise<number> {
    return this.meetings.update(meeting.id, meeting);
  }

  async deleteMeeting(id: string): Promise<void> {
    // Delete related data first
    const meeting = await this.getMeeting(id);
    if (meeting) {
      // Delete recordings
      await this.recordings.where('meetingId').equals(id).delete();
      
      // Delete transcripts
      const transcripts = await this.transcripts.where('meetingId').equals(id).toArray();
      for (const transcript of transcripts) {
        await this.transcriptSegments.where('transcriptId').equals(transcript.id).delete();
      }
      await this.transcripts.where('meetingId').equals(id).delete();
      
      // Delete summaries
      await this.summaries.where('meetingId').equals(id).delete();
      
      // Delete action items
      await this.actionItems.where('meetingId').equals(id).delete();
      
      // Delete meeting tags
      // Note: We don't have a separate MeetingTag table, tags are stored in meeting.tags
    }
    
    await this.meetings.delete(id);
  }

  async searchMeetings(userId: string, query: string): Promise<Meeting[]> {
    const meetings = await this.getMeetingsByUser(userId);
    const lowerQuery = query.toLowerCase();
    
    return meetings.filter(meeting => {
      const titleMatch = meeting.title.toLowerCase().includes(lowerQuery);
      const participantsMatch = meeting.participants.some(p => 
        p.toLowerCase().includes(lowerQuery)
      );
      const tagsMatch = meeting.tags.some(tag => 
        tag.toLowerCase().includes(lowerQuery)
      );
      return titleMatch || participantsMatch || tagsMatch;
    });
  }

  // Recording operations
  async addRecording(recording: Recording): Promise<string> {
    await this.recordings.add(recording);
    return recording.id;
  }

  async getRecording(id: string): Promise<Recording | undefined> {
    return this.recordings.get(id);
  }

  async getRecordingsByMeeting(meetingId: string): Promise<Recording[]> {
    return this.recordings.where('meetingId').equals(meetingId).toArray();
  }

  async updateRecording(recording: Recording): Promise<number> {
    return this.recordings.update(recording.id, recording);
  }

  async deleteRecording(id: string): Promise<void> {
    await this.recordings.delete(id);
  }

  // Transcript operations
  async addTranscript(transcript: Transcript): Promise<string> {
    await this.transcripts.add(transcript);
    return transcript.id;
  }

  async getTranscript(id: string): Promise<Transcript | undefined> {
    return this.transcripts.get(id);
  }

  async getTranscriptByMeeting(meetingId: string): Promise<Transcript | undefined> {
    return this.transcripts.where('meetingId').equals(meetingId).first();
  }

  async getTranscriptsByMeeting(meetingId: string): Promise<Transcript[]> {
    return this.transcripts.where('meetingId').equals(meetingId).toArray();
  }

  async updateTranscript(transcript: Transcript): Promise<number> {
    return this.transcripts.update(transcript.id, transcript);
  }

  async deleteTranscript(id: string): Promise<void> {
    // Delete related segments
    const transcript = await this.getTranscript(id);
    if (transcript) {
      await this.transcriptSegments.where('transcriptId').equals(id).delete();
    }
    await this.transcripts.delete(id);
  }

  // Transcript segment operations
  async addTranscriptSegment(segment: TranscriptSegment): Promise<string> {
    await this.transcriptSegments.add(segment);
    return segment.id;
  }

  async getTranscriptSegments(transcriptId: string): Promise<TranscriptSegment[]> {
    return this.transcriptSegments.where('transcriptId').equals(transcriptId).toArray();
  }

  async deleteTranscriptSegments(transcriptId: string): Promise<number> {
    return this.transcriptSegments.where('transcriptId').equals(transcriptId).delete();
  }

  // Summary operations
  async addSummary(summary: Summary): Promise<string> {
    await this.summaries.add(summary);
    return summary.id;
  }

  async getSummary(id: string): Promise<Summary | undefined> {
    return this.summaries.get(id);
  }

  async getSummaryByMeeting(meetingId: string): Promise<Summary | undefined> {
    return this.summaries.where('meetingId').equals(meetingId).first();
  }

  async updateSummary(summary: Summary): Promise<number> {
    return this.summaries.update(summary.id, summary);
  }

  async deleteSummary(id: string): Promise<void> {
    await this.summaries.delete(id);
  }

  // Action item operations
  async addActionItem(actionItem: ActionItem): Promise<string> {
    await this.actionItems.add(actionItem);
    return actionItem.id;
  }

  async getActionItem(id: string): Promise<ActionItem | undefined> {
    return this.actionItems.get(id);
  }

  async getActionItemsByMeeting(meetingId: string): Promise<ActionItem[]> {
    return this.actionItems.where('meetingId').equals(meetingId).toArray();
  }

  async updateActionItem(actionItem: ActionItem): Promise<number> {
    return this.actionItems.update(actionItem.id, actionItem);
  }

  async deleteActionItem(id: string): Promise<void> {
    await this.actionItems.delete(id);
  }

  // Tag operations
  async addTag(tag: Tag): Promise<string> {
    await this.tags.add(tag);
    return tag.id;
  }

  async getTag(id: string): Promise<Tag | undefined> {
    return this.tags.get(id);
  }

  async getTagsByUser(userId: string): Promise<Tag[]> {
    return this.tags.where('userId').equals(userId).toArray();
  }

  async getTagByName(userId: string, name: string): Promise<Tag | undefined> {
    return this.tags.where('[userId+name]').equals([userId, name]).first();
  }

  async deleteTag(id: string): Promise<void> {
    await this.tags.delete(id);
  }

  // User operations
  async addUser(user: User): Promise<string> {
    await this.users.add(user);
    return user.id;
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    return this.users.where('googleId').equals(googleId).first();
  }

  async updateUser(user: User): Promise<number> {
    return this.users.update(user.id, user);
  }

  async deleteUser(id: string): Promise<void> {
    // Delete user's data
    const user = await this.getUser(id);
    if (user) {
      // Delete meetings
      const meetings = await this.getMeetingsByUser(id);
      for (const meeting of meetings) {
        await this.deleteMeeting(meeting.id);
      }
      
      // Delete tags
      await this.tags.where('userId').equals(id).delete();
      
      // Delete settings
      await this.settings.where('userId').equals(id).delete();
    }
    
    await this.users.delete(id);
  }

  // Settings operations
  async getSettings(userId: string): Promise<AppSettings | undefined> {
    return this.settings.where('userId').equals(userId).first();
  }

  async saveSettings(settings: AppSettings): Promise<string> {
    const existing = await this.getSettings(settings.userId);
    if (existing) {
      await this.settings.update(existing.id, settings);
      return existing.id;
    } else {
      await this.settings.add(settings);
      return settings.id;
    }
  }

  // Statistics
  async getUserStats(userId: string): Promise<{
    totalMeetings: number;
    totalRecordingTime: number;
    meetingsThisWeek: number;
    totalActionItems: number;
  }> {
    const meetings = await this.getMeetingsByUser(userId);
    const now = new Date();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    
    const meetingsThisWeek = meetings.filter(m => 
      m.startTime >= weekStart.getTime()
    ).length;
    
    const totalRecordingTime = meetings.reduce((sum, m) => 
      sum + (m.duration || 0), 0
    );
    
    const actionItems = await this.actionItems.where('meetingId').anyOf(
      meetings.map(m => m.id)
    ).toArray();
    
    return {
      totalMeetings: meetings.length,
      totalRecordingTime,
      meetingsThisWeek,
      totalActionItems: actionItems.length,
    };
  }
}

export const db = new RecordMeetingDatabase();
