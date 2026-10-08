import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { StorageService } from '../services/storageService';
import { Meeting, Recording, Transcript, Summary, ActionItem, AppSettings } from '../types/types';
import { MESSAGE_TYPES } from '../utils/constants';

type Page = 'dashboard' | 'recording' | 'settings' | 'login';

const PopupApp: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [recording, setRecording] = useState<Recording | null>(null);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [recordingState, setRecordingState] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState<{
    totalMeetings: number;
    totalRecordingTime: number;
    meetingsThisWeek: number;
    totalActionItems: number;
  }>({ totalMeetings: 0, totalRecordingTime: 0, meetingsThisWeek: 0, totalActionItems: 0 });

  useEffect(() => {
    loadData();
    
    // Listen for messages from background
    chrome.runtime.onMessage.addListener(handleMessage);
    
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  useEffect(() => {
    if (currentPage === 'dashboard') {
      loadMeetings();
    }
  }, [currentPage]);

  const handleMessage = (message: any) => {
    switch (message.type) {
      case MESSAGE_TYPES.RECORDING_STATE:
        setRecordingState(message.data?.state);
        break;
      case MESSAGE_TYPES.MEETING_DETECTED:
        if (message.data?.meeting) {
          setSelectedMeeting(message.data.meeting);
        }
        break;
      case 'OPEN_POPUP':
        // Focus on the popup
        break;
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      // For now, use a default user ID
      const userId = 'default-user';
      
      // Load settings
      const userSettings = await StorageService.getSettings(userId);
      setSettings(userSettings);
      
      // Load meetings
      const userMeetings = await StorageService.getMeetingsByUser(userId);
      setMeetings(userMeetings);
      
      // Load stats
      const userStats = await StorageService.getUserStats(userId);
      setStats(userStats);
      
      // Check recording state
      chrome.runtime.sendMessage({ type: MESSAGE_TYPES.RECORDING_STATE }, (response) => {
        if (response?.state) {
          setRecordingState(response.state);
        }
      });
      
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMeetings = async () => {
    try {
      const userId = 'default-user';
      const userMeetings = await StorageService.getMeetingsByUser(userId);
      setMeetings(userMeetings);
      
      const userStats = await StorageService.getUserStats(userId);
      setStats(userStats);
    } catch (error) {
      console.error('Error loading meetings:', error);
    }
  };

  const loadMeetingDetails = async (meetingId: string) => {
    try {
      const meeting = await StorageService.getMeeting(meetingId);
      const recording = meeting ? await StorageService.getRecordingsByMeeting(meetingId).then(r => r[0] || null) : null;
      const transcript = meeting ? await StorageService.getTranscriptByMeeting(meetingId) : null;
      const summary = meeting ? await StorageService.getSummaryByMeeting(meetingId) : null;
      const actionItems = meeting ? await StorageService.getActionItemsByMeeting(meetingId) : [];
      
      setSelectedMeeting(meeting || null);
      setRecording(recording);
      setTranscript(transcript);
      setSummary(summary);
      setActionItems(actionItems);
      setCurrentPage('recording');
    } catch (error) {
      console.error('Error loading meeting details:', error);
    }
  };

  const handleStartRecording = async () => {
    try {
      const userId = 'default-user';
      
      // Create a new meeting if not already in one
      let meeting = selectedMeeting;
      if (!meeting) {
        meeting = await StorageService.createMeeting(
          userId,
          `RM-${Date.now()}`,
          'New Meeting',
          [],
          Date.now()
        );
        setSelectedMeeting(meeting);
      }
      
      chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.START_RECORDING,
        data: { meetingId: meeting.id },
      }, (response) => {
        if (response?.error) {
          alert(response.error);
        } else {
          setRecordingState(response?.state);
          loadMeetings();
        }
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      alert(error instanceof Error ? error.message : 'Failed to start recording');
    }
  };

  const handleStopRecording = async () => {
    try {
      chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.STOP_RECORDING,
        data: { meetingId: selectedMeeting?.id },
      }, (response) => {
        if (response?.error) {
          alert(response.error);
        } else {
          setRecordingState(response?.state);
          loadMeetings();
        }
      });
    } catch (error) {
      console.error('Error stopping recording:', error);
      alert(error instanceof Error ? error.message : 'Failed to stop recording');
    }
  };

  const handlePauseRecording = async () => {
    try {
      chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.PAUSE_RECORDING,
      }, (response) => {
        if (response?.error) {
          alert(response.error);
        } else {
          setRecordingState(response?.state);
        }
      });
    } catch (error) {
      console.error('Error pausing recording:', error);
      alert(error instanceof Error ? error.message : 'Failed to pause recording');
    }
  };

  const handleResumeRecording = async () => {
    try {
      chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.RESUME_RECORDING,
      }, (response) => {
        if (response?.error) {
          alert(response.error);
        } else {
          setRecordingState(response?.state);
        }
      });
    } catch (error) {
      console.error('Error resuming recording:', error);
      alert(error instanceof Error ? error.message : 'Failed to resume recording');
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (window.confirm('Are you sure you want to delete this meeting? This cannot be undone.')) {
      try {
        await StorageService.deleteMeeting(meetingId);
        loadMeetings();
        if (selectedMeeting?.id === meetingId) {
          setSelectedMeeting(null);
          setCurrentPage('dashboard');
        }
      } catch (error) {
        console.error('Error deleting meeting:', error);
        alert(error instanceof Error ? error.message : 'Failed to delete meeting');
      }
    }
  };

  const handleSaveSettings = async (newSettings: Partial<AppSettings>) => {
    try {
      const userId = 'default-user';
      const updatedSettings = await StorageService.saveSettings(userId, newSettings);
      setSettings(updatedSettings);
      alert('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert(error instanceof Error ? error.message : 'Failed to save settings');
    }
  };

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return [hrs.toString().padStart(2, '0'), mins.toString().padStart(2, '0'), secs.toString().padStart(2, '0')].join(':');
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.floor(seconds)}s`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)}m`;
    } else {
      return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    }
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      idle: '#666666',
      preparing: '#FFA500',
      recording: '#FF4444',
      paused: '#FFA500',
      processing: '#007BFF',
      completed: '#28A745',
      failed: '#DC3545',
    };
    return colors[status] || '#666666';
  };

  const renderDashboard = () => (
    <div className="popup-dashboard">
      {/* Stats */}
      <div className="popup-stats">
        <div className="popup-stat-card">
          <div className="popup-stat-label">Meetings</div>
          <div className="popup-stat-value">{stats.totalMeetings}</div>
        </div>
        <div className="popup-stat-card">
          <div className="popup-stat-label">This Week</div>
          <div className="popup-stat-value">{stats.meetingsThisWeek}</div>
        </div>
        <div className="popup-stat-card">
          <div className="popup-stat-label">Total Time</div>
          <div className="popup-stat-value">{formatDuration(stats.totalRecordingTime)}</div>
        </div>
        <div className="popup-stat-card">
          <div className="popup-stat-label">Action Items</div>
          <div className="popup-stat-value">{stats.totalActionItems}</div>
        </div>
      </div>

      {/* Recent Meetings */}
      <div className="popup-section-header">
        <span className="popup-section-title">Recent Meetings</span>
        <span className="popup-section-link" onClick={() => setCurrentPage('settings')}>
          Settings
        </span>
      </div>

      {meetings.length === 0 ? (
        <div className="popup-empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span className="popup-empty-state-title">No meetings yet</span>
          <span className="popup-empty-state-text">Start recording to save your first meeting</span>
          <button className="popup-empty-state-btn" onClick={handleStartRecording}>
            Start Recording
          </button>
        </div>
      ) : (
        <div className="popup-meeting-list">
          {meetings.slice(0, 5).map((meeting) => (
            <div key={meeting.id} className="popup-meeting-card" onClick={() => loadMeetingDetails(meeting.id)}>
              <div className="popup-meeting-title">{meeting.title}</div>
              <div className="popup-meeting-meta">
                <span>📅 {formatDate(meeting.startTime)}</span>
                <span>⏱️ {formatDuration(meeting.duration || 0)}</span>
              </div>
              <div className="popup-meeting-status">
                {recordingState?.currentMeetingId === meeting.id && recordingState?.isRecording ? (
                  <span className="popup-status-badge recording">🔴 Recording</span>
                ) : (
                  <span className="popup-status-badge completed">✓ Completed</span>
                )}
              </div>
              <div className="popup-meeting-actions">
                <button 
                  className="popup-meeting-btn delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteMeeting(meeting.id);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderRecording = () => {
    if (!selectedMeeting) {
      return (
        <div className="popup-empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="12" r="5"/>
          </svg>
          <span className="popup-empty-state-title">No meeting selected</span>
          <button className="popup-empty-state-btn" onClick={() => setCurrentPage('dashboard')}>
            Back to Dashboard
          </button>
        </div>
      );
    }

    const isRecording = recordingState?.isRecording && recordingState?.currentMeetingId === selectedMeeting.id;
    const isPaused = recordingState?.isPaused;
    const status = recordingState?.status || (recording ? 'completed' : 'idle');

    return (
      <div className="popup-recording">
        {/* Recording Status */}
        <div className="popup-recording-status">
          <div 
            className={`popup-recording-status-icon ${status}`}
            style={{ background: getStatusColor(status) }}
          >
            {status === 'recording' ? '🔴' : status === 'paused' ? '🟡' : '⚪'}
          </div>
          <div className="popup-recording-status-title">
            {isRecording ? 'Recording' : isPaused ? 'Paused' : status === 'processing' ? 'Processing' : 'Meeting Details'}
          </div>
          <div className="popup-recording-status-text">
            {selectedMeeting.title}
          </div>
          {isRecording && (
            <div className="popup-recording-timer">
              {formatTime((Date.now() - (recordingState?.startTime || Date.now())) / 1000)}
            </div>
          )}
        </div>

        {/* Recording Controls */}
        {isRecording || isPaused ? (
          <div className="popup-recording-controls">
            {!isRecording && (
              <button 
                className="popup-recording-btn start"
                onClick={handleStartRecording}
              >
                Start
              </button>
            )}
            {isRecording && (
              <button 
                className="popup-recording-btn pause"
                onClick={handlePauseRecording}
                disabled={isPaused}
              >
                Pause
              </button>
            )}
            {isPaused && (
              <button 
                className="popup-recording-btn start"
                onClick={handleResumeRecording}
              >
                Resume
              </button>
            )}
            <button 
              className="popup-recording-btn stop"
              onClick={handleStopRecording}
              disabled={!isRecording && !isPaused}
            >
              Stop
            </button>
          </div>
        ) : null}

        {/* Meeting Info */}
        <div className="popup-recording-info">
          <div className="popup-recording-info-item">
            <span className="popup-recording-info-label">Meeting ID</span>
            <span className="popup-recording-info-value">{selectedMeeting.id}</span>
          </div>
          <div className="popup-recording-info-item">
            <span className="popup-recording-info-label">Date</span>
            <span className="popup-recording-info-value">{formatDate(selectedMeeting.startTime)}</span>
          </div>
          {selectedMeeting.duration && (
            <div className="popup-recording-info-item">
              <span className="popup-recording-info-label">Duration</span>
              <span className="popup-recording-info-value">{formatDuration(selectedMeeting.duration)}</span>
            </div>
          )}
          {selectedMeeting.participants.length > 0 && (
            <div className="popup-recording-info-item">
              <span className="popup-recording-info-label">Participants</span>
              <span className="popup-recording-info-value">{selectedMeeting.participants.join(', ')}</span>
            </div>
          )}
        </div>

        {/* Back button */}
        <button 
          className="popup-meeting-btn"
          onClick={() => setCurrentPage('dashboard')}
          style={{ marginTop: 'auto' }}
        >
          Back to Dashboard
        </button>
      </div>
    );
  };

  const renderSettings = () => (
    <div className="popup-settings">
      <div className="popup-settings-section">
        <div className="popup-settings-section-title">Recording</div>
        
        <div className="popup-settings-item">
          <div>
            <div className="popup-settings-label">Auto-start Recording</div>
            <div className="popup-settings-description">Start recording automatically when meeting begins</div>
          </div>
          <div 
            className={`popup-settings-toggle ${settings?.recording.autoStart ? 'active' : ''}`}
            onClick={() => handleSaveSettings({ recording: { 
              defaultBehavior: settings?.recording.defaultBehavior || 'manual',
              audioQuality: settings?.recording.audioQuality || 'medium',
              autoStart: !settings?.recording.autoStart, 
              notifications: settings?.recording.notifications || false 
            } })}
          >
            <div className="popup-settings-toggle-thumb"></div>
          </div>
        </div>

        <div className="popup-settings-item">
          <div>
            <div className="popup-settings-label">Audio Quality</div>
            <div className="popup-settings-description">Higher quality uses more storage</div>
          </div>
          <select 
            className="popup-settings-select"
            value={settings?.recording.audioQuality || 'medium'}
            onChange={(e) => handleSaveSettings({ recording: { 
              defaultBehavior: settings?.recording.defaultBehavior || 'manual',
              audioQuality: e.target.value as 'low' | 'medium' | 'high',
              autoStart: settings?.recording.autoStart || false,
              notifications: settings?.recording.notifications || false
            } })}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div className="popup-settings-item">
          <div>
            <div className="popup-settings-label">Notifications</div>
            <div className="popup-settings-description">Show notifications for recording events</div>
          </div>
          <div 
            className={`popup-settings-toggle ${settings?.recording.notifications ? 'active' : ''}`}
            onClick={() => handleSaveSettings({ recording: { 
              defaultBehavior: settings?.recording.defaultBehavior || 'manual',
              audioQuality: settings?.recording.audioQuality || 'medium',
              autoStart: settings?.recording.autoStart || false,
              notifications: !settings?.recording.notifications 
            } })}
          >
            <div className="popup-settings-toggle-thumb"></div>
          </div>
        </div>
      </div>

      <div className="popup-settings-section">
        <div className="popup-settings-section-title">Transcription</div>
        
        <div className="popup-settings-item">
          <div>
            <div className="popup-settings-label">Language</div>
            <div className="popup-settings-description">Language for speech recognition</div>
          </div>
          <select 
            className="popup-settings-select"
            value={settings?.transcription.language || 'en-US'}
            onChange={(e) => handleSaveSettings({ transcription: { 
              language: e.target.value,
              speakerDetection: settings?.transcription.speakerDetection || true,
              autoGenerate: settings?.transcription.autoGenerate || true
            } })}
          >
            <option value="en-US">English (US)</option>
            <option value="en-GB">English (UK)</option>
            <option value="es-ES">Spanish</option>
            <option value="fr-FR">French</option>
            <option value="de-DE">German</option>
          </select>
        </div>

        <div className="popup-settings-item">
          <div>
            <div className="popup-settings-label">Speaker Detection</div>
            <div className="popup-settings-description">Attempt to identify different speakers</div>
          </div>
          <div 
            className={`popup-settings-toggle ${settings?.transcription.speakerDetection ? 'active' : ''}`}
            onClick={() => handleSaveSettings({ transcription: { 
              language: settings?.transcription.language || 'en-US',
              speakerDetection: !settings?.transcription.speakerDetection,
              autoGenerate: settings?.transcription.autoGenerate || true
            } })}
          >
            <div className="popup-settings-toggle-thumb"></div>
          </div>
        </div>

        <div className="popup-settings-item">
          <div>
            <div className="popup-settings-label">Auto-generate Transcript</div>
            <div className="popup-settings-description">Generate transcript automatically after recording</div>
          </div>
          <div 
            className={`popup-settings-toggle ${settings?.transcription.autoGenerate ? 'active' : ''}`}
            onClick={() => handleSaveSettings({ transcription: { 
              language: settings?.transcription.language || 'en-US',
              speakerDetection: settings?.transcription.speakerDetection || true,
              autoGenerate: !settings?.transcription.autoGenerate
            } })}
          >
            <div className="popup-settings-toggle-thumb"></div>
          </div>
        </div>
      </div>

      <div className="popup-settings-section">
        <div className="popup-settings-section-title">AI Processing</div>
        
        <div className="popup-settings-item">
          <div>
            <div className="popup-settings-label">Auto-summarize Meetings</div>
            <div className="popup-settings-description">Generate AI summary automatically</div>
          </div>
          <div 
            className={`popup-settings-toggle ${settings?.ai.autoSummarize ? 'active' : ''}`}
            onClick={() => handleSaveSettings({ ai: { 
              autoSummarize: !settings?.ai.autoSummarize,
              generateActionItems: settings?.ai.generateActionItems || true,
              generateDecisions: settings?.ai.generateDecisions || true
            } })}
          >
            <div className="popup-settings-toggle-thumb"></div>
          </div>
        </div>

        <div className="popup-settings-item">
          <div>
            <div className="popup-settings-label">Generate Action Items</div>
            <div className="popup-settings-description">Extract action items from meeting</div>
          </div>
          <div 
            className={`popup-settings-toggle ${settings?.ai.generateActionItems ? 'active' : ''}`}
            onClick={() => handleSaveSettings({ ai: { 
              autoSummarize: settings?.ai.autoSummarize || true,
              generateActionItems: !settings?.ai.generateActionItems,
              generateDecisions: settings?.ai.generateDecisions || true
            } })}
          >
            <div className="popup-settings-toggle-thumb"></div>
          </div>
        </div>

        <div className="popup-settings-item">
          <div>
            <div className="popup-settings-label">Generate Decisions</div>
            <div className="popup-settings-description">Extract decisions from meeting</div>
          </div>
          <div 
            className={`popup-settings-toggle ${settings?.ai.generateDecisions ? 'active' : ''}`}
            onClick={() => handleSaveSettings({ ai: { 
              autoSummarize: settings?.ai.autoSummarize || true,
              generateActionItems: settings?.ai.generateActionItems || true,
              generateDecisions: !settings?.ai.generateDecisions
            } })}
          >
            <div className="popup-settings-toggle-thumb"></div>
          </div>
        </div>
      </div>

      <div className="popup-settings-section">
        <div className="popup-settings-section-title">Storage</div>
        
        <div className="popup-settings-item">
          <div>
            <div className="popup-settings-label">Retention Days</div>
            <div className="popup-settings-description">Auto-delete recordings after X days (0 = never)</div>
          </div>
          <input
            type="number"
            className="popup-settings-input"
            value={settings?.storage.retentionDays || 30}
            onChange={(e) => handleSaveSettings({ storage: { 
              retentionDays: parseInt(e.target.value) || 0,
              autoDelete: settings?.storage.autoDelete || false
            } })}
            min="0"
          />
        </div>

        <div className="popup-settings-item">
          <div>
            <div className="popup-settings-label">Auto-delete Recordings</div>
            <div className="popup-settings-description">Enable automatic deletion of old recordings</div>
          </div>
          <div 
            className={`popup-settings-toggle ${settings?.storage.autoDelete ? 'active' : ''}`}
            onClick={() => handleSaveSettings({ storage: { 
              retentionDays: settings?.storage.retentionDays || 30,
              autoDelete: !settings?.storage.autoDelete
            } })}
          >
            <div className="popup-settings-toggle-thumb"></div>
          </div>
        </div>
      </div>

      <button 
        className="popup-meeting-btn"
        onClick={() => setCurrentPage('dashboard')}
        style={{ marginTop: 'auto' }}
      >
        Back to Dashboard
      </button>
    </div>
  );

  const renderLogin = () => (
    <div className="popup-login">
      <div className="popup-login-logo">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="#FF4444" strokeWidth="2"/>
          <circle cx="12" cy="12" r="5" fill="#FF4444"/>
        </svg>
      </div>
      <div className="popup-login-title">RecordMeeting</div>
      <div className="popup-login-text">Sign in to start recording and save your meetings</div>
      <button className="popup-login-btn" onClick={() => setIsAuthenticated(true)}>
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        <span>Sign in with Google</span>
      </button>
      <div className="popup-login-divider">
        <span>or</span>
      </div>
      <div className="popup-login-footer">
        By signing in, you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="popup-loading">
        <div className="popup-spinner"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return renderLogin();
  }

  return (
    <div className="popup-app">
      {/* Header */}
      <div className="popup-header">
        <div className="popup-logo">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="#FF4444" strokeWidth="2"/>
            <circle cx="12" cy="12" r="5" fill="#FF4444"/>
          </svg>
          <span className="popup-title">RecordMeeting</span>
        </div>
        <div className="popup-header-actions">
          <button 
            className="popup-btn-icon"
            onClick={() => loadData()}
            title="Refresh"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
          </button>
          <button 
            className="popup-btn-icon"
            onClick={() => setCurrentPage('settings')}
            title="Settings"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="popup-nav">
        <button 
          className={`popup-nav-item ${currentPage === 'dashboard' ? 'active' : ''}`}
          onClick={() => setCurrentPage('dashboard')}
        >
          Dashboard
        </button>
        <button 
          className={`popup-nav-item ${currentPage === 'recording' ? 'active' : ''}`}
          onClick={() => setCurrentPage('recording')}
        >
          Recording
        </button>
        <button 
          className={`popup-nav-item ${currentPage === 'settings' ? 'active' : ''}`}
          onClick={() => setCurrentPage('settings')}
        >
          Settings
        </button>
      </div>

      {/* Main Content */}
      <div className="popup-main">
        <div className={`popup-page ${currentPage === 'dashboard' ? 'active' : ''}`}>
          {renderDashboard()}
        </div>
        <div className={`popup-page ${currentPage === 'recording' ? 'active' : ''}`}>
          {renderRecording()}
        </div>
        <div className={`popup-page ${currentPage === 'settings' ? 'active' : ''}`}>
          {renderSettings()}
        </div>
      </div>
    </div>
  );
};

// Render the app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<PopupApp />);
}
