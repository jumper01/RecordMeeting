import { v4 as uuidv4 } from 'uuid';
import { StorageService } from '../services/storageService';
import {
  RecordingStatus,
  TranscriptStatus,
  SummaryStatus,
  RecordingState,
  MeetingInfo,
  Message,
  MessageTypes,
} from '../types/types';
import { MESSAGE_TYPES, NOTIFICATION_TYPES } from '../utils/constants';

// Global recording state
let recordingState: RecordingState = {
  isRecording: false,
  isPaused: false,
  status: 'idle',
  totalPausedTime: 0,
  audioChunks: [],
};

let mediaRecorder: MediaRecorder | null = null;
let audioStream: MediaStream | null = null;

// Message handler
chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  handleMessage(message, sender, sendResponse);
  return true; // Keep message channel open for async response
});

async function handleMessage(message: Message, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) {
  try {
    switch (message.type) {
      case MESSAGE_TYPES.START_RECORDING:
        await handleStartRecording(message.data, sendResponse);
        break;
      case MESSAGE_TYPES.STOP_RECORDING:
        await handleStopRecording(message.data, sendResponse);
        break;
      case MESSAGE_TYPES.PAUSE_RECORDING:
        await handlePauseRecording(sendResponse);
        break;
      case MESSAGE_TYPES.RESUME_RECORDING:
        await handleResumeRecording(sendResponse);
        break;
      case MESSAGE_TYPES.RECORDING_STATE:
        sendResponse({ state: recordingState });
        break;
      case MESSAGE_TYPES.MEETING_DETECTED:
        await handleMeetingDetected(message.data, sendResponse);
        break;
      case MESSAGE_TYPES.MEETING_INFO:
        await handleMeetingInfo(message.data, sendResponse);
        break;
      case MESSAGE_TYPES.SAVE_MEETING:
        await handleSaveMeeting(message.data, sendResponse);
        break;
      case MESSAGE_TYPES.GET_MEETINGS:
        await handleGetMeetings(message.data, sendResponse);
        break;
      case MESSAGE_TYPES.GET_MEETING:
        await handleGetMeeting(message.data, sendResponse);
        break;
      case MESSAGE_TYPES.DELETE_MEETING:
        await handleDeleteMeeting(message.data, sendResponse);
        break;
      case MESSAGE_TYPES.GET_SETTINGS:
        await handleGetSettings(message.data, sendResponse);
        break;
      case MESSAGE_TYPES.SAVE_SETTINGS:
        await handleSaveSettings(message.data, sendResponse);
        break;
      case MESSAGE_TYPES.OPEN_DASHBOARD:
        await handleOpenDashboard(sendResponse);
        break;
      case MESSAGE_TYPES.AUTH_STATE:
        sendResponse({ isAuthenticated: true }); // For now, assume authenticated
        break;
      case MESSAGE_TYPES.REQUEST_PERMISSIONS:
        await handleRequestPermissions(sendResponse);
        break;
      default:
        sendResponse({ error: 'Unknown message type' });
    }
  } catch (error) {
    console.error('Error handling message:', error);
    sendResponse({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

// Recording handlers
async function handleStartRecording(data: any, sendResponse: (response?: any) => void) {
  try {
    // Check if already recording
    if (recordingState.isRecording && !recordingState.isPaused) {
      sendResponse({ error: 'Already recording' });
      return;
    }

    // Request microphone permissions
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioStream = stream;

    // Create media recorder
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    
    const audioChunks: Blob[] = [];
    let startTime = Date.now();

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      if (recordingState.status === 'recording' || recordingState.status === 'paused') {
        // Finalize recording
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const endTime = Date.now();
        const duration = (endTime - startTime - recordingState.totalPausedTime) / 1000;
        
        if (recordingState.currentMeetingId) {
          await StorageService.createRecording(
            recordingState.currentMeetingId,
            audioBlob,
            duration,
            audioBlob.size,
            'audio/webm'
          );
          
          // Start processing
          await processRecording(recordingState.currentMeetingId, audioBlob);
        }
      }
    };

    mediaRecorder.onerror = (event) => {
      console.error('MediaRecorder error:', event);
      recordingState.status = 'failed';
      sendNotification('Recording failed. Please try again.', NOTIFICATION_TYPES.ERROR);
    };

    // Start recording
    mediaRecorder.start(1000); // Collect data every 1 second
    
    recordingState = {
      isRecording: true,
      isPaused: false,
      status: 'recording',
      startTime,
      totalPausedTime: 0,
      mediaRecorder,
      audioChunks,
      currentMeetingId: data?.meetingId,
    };

    sendResponse({ success: true, state: recordingState });
    sendNotification('Recording started', NOTIFICATION_TYPES.SUCCESS);

    // Broadcast state to all tabs
    broadcastRecordingState();

  } catch (error) {
    console.error('Error starting recording:', error);
    sendResponse({ error: error instanceof Error ? error.message : 'Failed to start recording' });
    sendNotification('Failed to start recording. Please check microphone permissions.', NOTIFICATION_TYPES.ERROR);
  }
}

async function handlePauseRecording(sendResponse: (response?: any) => void) {
  if (!recordingState.isRecording || recordingState.isPaused) {
    sendResponse({ error: 'Not recording or already paused' });
    return;
  }

  if (mediaRecorder && recordingState.status === 'recording') {
    mediaRecorder.pause();
    recordingState = {
      ...recordingState,
      isPaused: true,
      status: 'paused',
      pauseTime: Date.now(),
    };

    sendResponse({ success: true, state: recordingState });
    sendNotification('Recording paused', NOTIFICATION_TYPES.INFO);
    broadcastRecordingState();
  }
}

async function handleResumeRecording(sendResponse: (response?: any) => void) {
  if (!recordingState.isRecording || !recordingState.isPaused) {
    sendResponse({ error: 'Not paused' });
    return;
  }

  if (mediaRecorder && recordingState.status === 'paused') {
    mediaRecorder.resume();
    const pauseDuration = Date.now() - (recordingState.pauseTime || Date.now());
    
    recordingState = {
      ...recordingState,
      isPaused: false,
      status: 'recording',
      totalPausedTime: recordingState.totalPausedTime + pauseDuration,
      pauseTime: undefined,
    };

    sendResponse({ success: true, state: recordingState });
    sendNotification('Recording resumed', NOTIFICATION_TYPES.INFO);
    broadcastRecordingState();
  }
}

async function handleStopRecording(data: any, sendResponse: (response?: any) => void) {
  if (!recordingState.isRecording) {
    sendResponse({ error: 'Not recording' });
    return;
  }

  try {
    if (mediaRecorder && (recordingState.status === 'recording' || recordingState.status === 'paused')) {
      mediaRecorder.stop();
      
      // Stop all tracks
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
        audioStream = null;
      }

      recordingState = {
        ...recordingState,
        isRecording: false,
        isPaused: false,
        status: 'processing',
        mediaRecorder: undefined,
      };

      sendResponse({ success: true, state: recordingState });
      sendNotification('Recording stopped. Processing...', NOTIFICATION_TYPES.INFO);
      broadcastRecordingState();
    }
  } catch (error) {
    console.error('Error stopping recording:', error);
    sendResponse({ error: error instanceof Error ? error.message : 'Failed to stop recording' });
  }
}

// Processing functions
async function processRecording(meetingId: string, audioBlob: Blob) {
  try {
    // Update meeting end time
    const meeting = await StorageService.getMeeting(meetingId);
    if (meeting) {
      meeting.endTime = Date.now();
      meeting.duration = (meeting.endTime - meeting.startTime) / 1000;
      await StorageService.updateMeeting(meeting);
    }

    // Create transcript
    await StorageService.createTranscript(meetingId, 'en-US', '', []);
    await StorageService.updateTranscriptStatus(meetingId, 'processing');

    // Start transcription
    await transcribeRecording(meetingId, audioBlob);

    // Create summary
    await StorageService.createSummary(meetingId);
    await StorageService.updateSummaryStatus(meetingId, 'processing');

    // Generate summary using DeepSeek
    await generateSummary(meetingId);

    // Update recording state
    recordingState.status = 'completed';
    broadcastRecordingState();
    sendNotification('Meeting processed successfully', NOTIFICATION_TYPES.SUCCESS);

  } catch (error) {
    console.error('Error processing recording:', error);
    recordingState.status = 'failed';
    broadcastRecordingState();
    sendNotification('Processing failed. Please try again.', NOTIFICATION_TYPES.ERROR);
  }
}

async function transcribeRecording(meetingId: string, audioBlob: Blob) {
  try {
    // For now, use a simple approach with Web Speech API
    // In production, you might want to use a more robust solution
    
    // Create a mock transcription for demonstration
    // In a real implementation, you would use the Web Speech API or a service
    const mockTranscript = {
      text: 'This is a mock transcription. In a real implementation, this would be generated from the audio.',
      segments: [
        {
          id: uuidv4(),
          transcriptId: '',
          speaker: 'Participant 1',
          startTime: 0,
          endTime: 5000,
          text: 'Hello everyone, welcome to the meeting.',
        },
        {
          id: uuidv4(),
          transcriptId: '',
          speaker: 'Participant 2',
          startTime: 5000,
          endTime: 10000,
          text: 'Thanks for joining. Let us start the discussion.',
        },
      ],
    };

    const transcript = await StorageService.getTranscriptByMeeting(meetingId);
    if (transcript) {
      mockTranscript.segments.forEach(seg => {
        seg.transcriptId = transcript.id;
      });
      
      await StorageService.updateTranscriptStatus(
        meetingId,
        'completed',
        mockTranscript.text,
        mockTranscript.segments
      );
    }

  } catch (error) {
    console.error('Error transcribing:', error);
    await StorageService.updateTranscriptStatus(meetingId, 'failed');
  }
}

async function generateSummary(meetingId: string) {
  try {
    const transcript = await StorageService.getTranscriptByMeeting(meetingId);
    if (!transcript) {
      throw new Error('No transcript available');
    }

    // Mock summary generation
    // In a real implementation, you would call DeepSeek API
    const mockSummary = {
      executiveSummary: 'This was a productive meeting where the team discussed project updates and next steps.',
      keyPoints: [
        'Project timeline was reviewed',
        'Budget concerns were addressed',
        'Team assignments were finalized',
      ],
      decisions: [
        'Project deadline extended by 2 weeks',
        'Additional resources allocated to the project',
      ],
      actionItems: [
        {
          id: uuidv4(),
          meetingId,
          task: 'Update project timeline',
          owner: 'Project Manager',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'open',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      openQuestions: [
        'What are the risks of the extended timeline?',
      ],
      importantTopics: [
        'Project Management',
        'Budget',
        'Timeline',
      ],
    };

    await StorageService.updateSummaryStatus(meetingId, 'completed', mockSummary);

    // Save action items
    for (const actionItem of mockSummary.actionItems) {
      await StorageService.createActionItem(
        actionItem.meetingId,
        actionItem.task,
        actionItem.owner,
        actionItem.dueDate,
        actionItem.status
      );
    }

  } catch (error) {
    console.error('Error generating summary:', error);
    await StorageService.updateSummaryStatus(meetingId, 'failed');
  }
}

// Meeting handlers
async function handleMeetingDetected(data: any, sendResponse: (response?: any) => void) {
  try {
    const { url, title } = data;
    const googleMeetId = extractGoogleMeetId(url);
    
    // Check if meeting already exists
    const existingMeeting = await StorageService.getMeetingByGoogleMeetId(googleMeetId);
    
    if (existingMeeting) {
      sendResponse({ meeting: existingMeeting });
      return;
    }

    // Create new meeting
    const meeting = await StorageService.createMeeting(
      'default-user', // Will be updated with real user ID
      googleMeetId,
      title || 'Untitled Meeting',
      [],
      Date.now()
    );

    recordingState.currentMeetingId = meeting.id;
    sendResponse({ meeting });

  } catch (error) {
    console.error('Error handling meeting detected:', error);
    sendResponse({ error: error instanceof Error ? error.message : 'Failed to handle meeting' });
  }
}

async function handleMeetingInfo(data: MeetingInfo, sendResponse: (response?: any) => void) {
  try {
    const { meetingId, title, participants, startTime } = data;
    
    let meeting = await StorageService.getMeeting(meetingId);
    
    if (!meeting) {
      // Create new meeting
      meeting = await StorageService.createMeeting(
        'default-user',
        meetingId,
        title,
        participants,
        startTime
      );
      recordingState.currentMeetingId = meeting.id;
    } else {
      // Update existing meeting
      meeting.title = title || meeting.title;
      meeting.participants = participants || meeting.participants;
      meeting.startTime = startTime || meeting.startTime;
      await StorageService.updateMeeting(meeting);
    }

    sendResponse({ meeting });

  } catch (error) {
    console.error('Error handling meeting info:', error);
    sendResponse({ error: error instanceof Error ? error.message : 'Failed to handle meeting info' });
  }
}

async function handleSaveMeeting(data: any, sendResponse: (response?: any) => void) {
  try {
    const meeting = await StorageService.updateMeeting(data);
    sendResponse({ meeting });
  } catch (error) {
    console.error('Error saving meeting:', error);
    sendResponse({ error: error instanceof Error ? error.message : 'Failed to save meeting' });
  }
}

async function handleGetMeetings(data: any, sendResponse: (response?: any) => void) {
  try {
    const meetings = await StorageService.getMeetingsByUser(data.userId || 'default-user');
    sendResponse({ meetings });
  } catch (error) {
    console.error('Error getting meetings:', error);
    sendResponse({ error: error instanceof Error ? error.message : 'Failed to get meetings' });
  }
}

async function handleGetMeeting(data: any, sendResponse: (response?: any) => void) {
  try {
    const meeting = await StorageService.getMeeting(data.id);
    const recording = meeting ? await StorageService.getRecordingsByMeeting(data.id).then(r => r[0] || null) : null;
    const transcript = meeting ? await StorageService.getTranscriptByMeeting(data.id) : null;
    const summary = meeting ? await StorageService.getSummaryByMeeting(data.id) : null;
    const actionItems = meeting ? await StorageService.getActionItemsByMeeting(data.id) : [];
    
    sendResponse({ meeting, recording, transcript, summary, actionItems });
  } catch (error) {
    console.error('Error getting meeting:', error);
    sendResponse({ error: error instanceof Error ? error.message : 'Failed to get meeting' });
  }
}

async function handleDeleteMeeting(data: any, sendResponse: (response?: any) => void) {
  try {
    await StorageService.deleteMeeting(data.id);
    sendResponse({ success: true });
    sendNotification('Meeting deleted', NOTIFICATION_TYPES.SUCCESS);
  } catch (error) {
    console.error('Error deleting meeting:', error);
    sendResponse({ error: error instanceof Error ? error.message : 'Failed to delete meeting' });
  }
}

// Settings handlers
async function handleGetSettings(data: any, sendResponse: (response?: any) => void) {
  try {
    const settings = await StorageService.getSettings(data.userId || 'default-user');
    sendResponse({ settings });
  } catch (error) {
    console.error('Error getting settings:', error);
    sendResponse({ error: error instanceof Error ? error.message : 'Failed to get settings' });
  }
}

async function handleSaveSettings(data: any, sendResponse: (response?: any) => void) {
  try {
    const settings = await StorageService.saveSettings(data.userId || 'default-user', data.settings);
    sendResponse({ settings });
    sendNotification('Settings saved', NOTIFICATION_TYPES.SUCCESS);
  } catch (error) {
    console.error('Error saving settings:', error);
    sendResponse({ error: error instanceof Error ? error.message : 'Failed to save settings' });
  }
}

// Utility functions
function extractGoogleMeetId(url: string): string {
  const match = url.match(/(?:meet\.google\.com\/[^\/]+-|meet\.google\.com\/)\w+-\w+-\w+/);
  return match ? match[0].split('/').pop() || '' : '';
}

function broadcastRecordingState() {
  chrome.tabs.query({ url: 'https://meet.google.com/*' }, (tabs) => {
    tabs.forEach((tab) => {
      chrome.tabs.sendMessage(tab.id!, { type: MESSAGE_TYPES.RECORDING_STATE, data: { state: recordingState } });
    });
  });
}

function sendNotification(message: string, type: string) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'public/icons/icon128.png',
    title: 'RecordMeeting',
    message,
  });
}

async function handleOpenDashboard(sendResponse: (response?: any) => void) {
  try {
    // Open the dashboard in a new tab
    // For now, we'll open the popup, but in a full implementation,
    // this would open a web dashboard
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error opening dashboard:', error);
    sendResponse({ error: error instanceof Error ? error.message : 'Failed to open dashboard' });
  }
}

async function handleRequestPermissions(sendResponse: (response?: any) => void) {
  try {
    const permissions = await chrome.permissions.request({
      permissions: ['audio', 'clipboardWrite', 'clipboardRead'],
    });
    
    if (permissions) {
      sendResponse({ success: true, granted: true });
    } else {
      sendResponse({ success: true, granted: false });
    }
  } catch (error) {
    console.error('Error requesting permissions:', error);
    sendResponse({ error: error instanceof Error ? error.message : 'Failed to request permissions' });
  }
}

// Extension lifecycle
chrome.runtime.onInstalled.addListener(() => {
  console.log('RecordMeeting extension installed');
});

chrome.runtime.onSuspend.addListener(() => {
  // Clean up on suspend
  if (mediaRecorder && recordingState.isRecording) {
    mediaRecorder.stop();
  }
  if (audioStream) {
    audioStream.getTracks().forEach(track => track.stop());
  }
  console.log('RecordMeeting extension suspended');
});
