import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { DeepSeekService } from '../services/deepSeekService';
import { Meeting, Recording, Transcript, Summary, ActionItem, TranscriptSegment } from '../types/types';
import { formatDate, formatDuration, formatTime } from '../utils/formatters';

interface MeetingDetailsProps {
  meetingId: string;
  onBack: () => void;
}

const MeetingDetails: React.FC<MeetingDetailsProps> = ({ meetingId, onBack }) => {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [recording, setRecording] = useState<Recording | null>(null);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSegment, setSelectedSegment] = useState<TranscriptSegment | null>(null);
  const [newActionItem, setNewActionItem] = useState<Omit<ActionItem, 'id' | 'createdAt' | 'updatedAt'>>({
    meetingId: '',
    task: '',
    owner: '',
    dueDate: '',
    status: 'open',
  });
  const [question, setQuestion] = useState<string>('');
  const [answer, setAnswer] = useState<string>('');
  const [isAsking, setIsAsking] = useState<boolean>(false);

  useEffect(() => {
    loadMeetingDetails();
  }, [meetingId]);

  const loadMeetingDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [m, r, t, s, ai] = await Promise.all([
        StorageService.getMeeting(meetingId),
        StorageService.getRecordingsByMeeting(meetingId).then(recs => recs[0] || null),
        StorageService.getTranscriptByMeeting(meetingId),
        StorageService.getSummaryByMeeting(meetingId),
        StorageService.getActionItemsByMeeting(meetingId),
      ]);

      setMeeting(m || null);
      setRecording(r);
      setTranscript(t || null);
      setSummary(s || null);
      setActionItems(ai || []);

      if (t) {
        const segs = await StorageService.getTranscriptSegments(t.id);
        setSegments(segs);
      }

    } catch (err) {
      console.error('Error loading meeting details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load meeting details');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMeeting = async () => {
    if (window.confirm('Are you sure you want to delete this meeting? This cannot be undone.')) {
      try {
        await StorageService.deleteMeeting(meetingId);
        onBack();
      } catch (err) {
        console.error('Error deleting meeting:', err);
        setError(err instanceof Error ? err.message : 'Failed to delete meeting');
      }
    }
  };

  const handlePlayRecording = () => {
    if (!recording) return;
    
    // Create an audio element and play the recording
    const audioUrl = recording.audioUrl;
    const audio = new Audio(audioUrl);
    audio.play();
  };

  const handleDownloadRecording = () => {
    if (!recording) return;
    
    // Create a download link
    const url = URL.createObjectURL(recording.audioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recording-${meetingId}.webm`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadTranscript = () => {
    if (!transcript) return;
    
    const blob = new Blob([transcript.text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${meetingId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadSummary = () => {
    if (!summary) return;
    
    const content = `
Meeting Summary: ${summary.executiveSummary}

Key Points:
${summary.keyPoints.map((point, i) => `${i + 1}. ${point}`).join('\n')}

Decisions:
${summary.decisions.map((decision, i) => `${i + 1}. ${decision}`).join('\n')}

Action Items:
${summary.actionItems.map((item, i) => `${i + 1}. ${item.task} (Owner: ${item.owner}, Due: ${item.dueDate || 'Not specified'})`).join('\n')}

Open Questions:
${summary.openQuestions.map((question, i) => `${i + 1}. ${question}`).join('\n')}

Important Topics:
${summary.importantTopics.map((topic, i) => `${i + 1}. ${topic}`).join('\n')}
    `;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `summary-${meetingId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAddActionItem = async () => {
    if (!newActionItem.task.trim()) return;
    
    try {
      const actionItem: ActionItem = {
        ...newActionItem,
        id: `ai-${Date.now()}`,
        meetingId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      await StorageService.createActionItem(
        actionItem.meetingId,
        actionItem.task,
        actionItem.owner,
        actionItem.dueDate,
        actionItem.status
      );
      
      setNewActionItem({ meetingId: '', task: '', owner: '', dueDate: '', status: 'open' });
      loadMeetingDetails();
    } catch (err) {
      console.error('Error adding action item:', err);
      setError(err instanceof Error ? err.message : 'Failed to add action item');
    }
  };

  const handleUpdateActionItem = async (item: ActionItem) => {
    try {
      await StorageService.updateActionItem(item);
      loadMeetingDetails();
    } catch (err) {
      console.error('Error updating action item:', err);
      setError(err instanceof Error ? err.message : 'Failed to update action item');
    }
  };

  const handleDeleteActionItem = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this action item?')) {
      try {
        await StorageService.deleteActionItem(id);
        loadMeetingDetails();
      } catch (err) {
        console.error('Error deleting action item:', err);
        setError(err instanceof Error ? err.message : 'Failed to delete action item');
      }
    }
  };

  const handleAskQuestion = async () => {
    if (!question.trim() || !transcript) return;
    
    try {
      setIsAsking(true);
      setAnswer('');
      
      const response = await DeepSeekService.answerQuestion(question, transcript.text, segments);
      setAnswer(response);
    } catch (err) {
      console.error('Error answering question:', err);
      setError(err instanceof Error ? err.message : 'Failed to answer question');
      setAnswer("I couldn't find that information in this meeting.");
    } finally {
      setIsAsking(false);
    }
  };

  const handleRegenerateSummary = async () => {
    if (!transcript) return;
    
    try {
      setLoading(true);
      
      const summaryData = await DeepSeekService.generateSummary({
        transcript: transcript.text,
        segments,
        meetingTitle: meeting?.title,
        participants: meeting?.participants,
        language: transcript.language,
      });

      if (summary) {
        await StorageService.updateSummary({
          ...summary,
          ...summaryData,
          status: 'completed',
        });
      } else {
        const newSummary: Summary = {
          id: `sum-${Date.now()}`,
          meetingId,
          executiveSummary: summaryData.executiveSummary || '',
          keyPoints: summaryData.keyPoints || [],
          decisions: summaryData.decisions || [],
          actionItems: summaryData.actionItems || [],
          openQuestions: summaryData.openQuestions || [],
          importantTopics: summaryData.importantTopics || [],
          status: 'completed',
          createdAt: Date.now(),
        };
        await StorageService.createSummary(meetingId);
        await StorageService.updateSummary(newSummary);
      }

      loadMeetingDetails();
    } catch (err) {
      console.error('Error regenerating summary:', err);
      setError(err instanceof Error ? err.message : 'Failed to regenerate summary');
    } finally {
      setLoading(false);
    }
  };

  const filteredSegments = segments.filter(segment => 
    segment.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredActionItems = actionItems.filter(item => 
    item.task.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.owner.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="meeting-details">
        <div className="loading">Loading meeting details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="meeting-details">
        <div className="error">{error}</div>
        <button onClick={loadMeetingDetails}>Retry</button>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="meeting-details">
        <div className="error">Meeting not found</div>
        <button onClick={onBack}>Back to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="meeting-details">
      {/* Header */}
      <div className="meeting-header">
        <div className="meeting-info">
          <h2 className="meeting-title">{meeting.title}</h2>
          <div className="meeting-meta">
            <span className="meeting-date">📅 {formatDate(meeting.startTime)}</span>
            {meeting.endTime && (
              <span className="meeting-end-date">to {formatDate(meeting.endTime)}</span>
            )}
            {meeting.duration && (
              <span className="meeting-duration">⏱️ {formatDuration(meeting.duration)}</span>
            )}
          </div>
          {meeting.participants.length > 0 && (
            <div className="meeting-participants">
              👥 {meeting.participants.join(', ')}
            </div>
          )}
        </div>
        <div className="meeting-actions">
          <button className="btn btn-secondary" onClick={onBack}>
            ← Back
          </button>
          <button className="btn btn-danger" onClick={handleDeleteMeeting}>
            Delete Meeting
          </button>
        </div>
      </div>

      {/* Media Player */}
      {recording && (
        <div className="media-player">
          <div className="player-controls">
            <button className="player-btn" onClick={handlePlayRecording} title="Play">
              ▶️
            </button>
            <button className="player-btn" onClick={handleDownloadRecording} title="Download">
              📥
            </button>
            <span className="player-duration">
              {formatDuration(recording.duration)}
            </span>
            <span className="player-size">
              {(recording.fileSize / (1024 * 1024)).toFixed(2)} MB
            </span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="meeting-nav">
        <button 
          className={`nav-btn ${!searchQuery ? 'active' : ''}`}
          onClick={() => setSearchQuery('')}
        >
          Overview
        </button>
        <button 
          className={`nav-btn ${searchQuery ? 'active' : ''}`}
          onClick={() => {}}
        >
          Search
        </button>
      </div>

      {/* Search */}
      <div className="meeting-search">
        <input
          type="text"
          placeholder="Search transcript, summary, and action items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        {searchQuery && (
          <button className="search-clear" onClick={() => setSearchQuery('')}>
            ×
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="meeting-content">
        {/* Left: Meeting Info */}
        <div className="meeting-sidebar">
          <div className="sidebar-section">
            <h3>Meeting Info</h3>
            <div className="info-item">
              <span className="info-label">ID:</span>
              <span className="info-value">{meeting.id}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Google Meet ID:</span>
              <span className="info-value">{meeting.googleMeetId}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Created:</span>
              <span className="info-value">{formatDate(meeting.createdAt)}</span>
            </div>
            {meeting.tags.length > 0 && (
              <div className="info-item">
                <span className="info-label">Tags:</span>
                <div className="tags">
                  {meeting.tags.map(tag => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Download Section */}
          <div className="sidebar-section">
            <h3>Downloads</h3>
            <div className="download-buttons">
              {recording && (
                <button className="download-btn" onClick={handleDownloadRecording}>
                  📥 Recording
                </button>
              )}
              {transcript && (
                <button className="download-btn" onClick={handleDownloadTranscript}>
                  📄 Transcript
                </button>
              )}
              {summary && (
                <button className="download-btn" onClick={handleDownloadSummary}>
                  📋 Summary
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Center: Transcript */}
        <div className="meeting-main">
          {searchQuery ? (
            <div className="search-results">
              <h3>Search Results</h3>
              
              {filteredSegments.length > 0 && (
                <div className="search-section">
                  <h4>Transcript Matches ({filteredSegments.length})</h4>
                  <div className="transcript-segments">
                    {filteredSegments.map((segment) => (
                      <div 
                        key={segment.id} 
                        className={`transcript-segment ${selectedSegment?.id === segment.id ? 'selected' : ''}`}
                        onClick={() => setSelectedSegment(segment)}
                      >
                        <span className="segment-time">
                          {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                        </span>
                        <span className="segment-speaker">{segment.speaker}:</span>
                        <span className="segment-text">{segment.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {filteredActionItems.length > 0 && (
                <div className="search-section">
                  <h4>Action Items ({filteredActionItems.length})</h4>
                  <div className="action-items">
                    {filteredActionItems.map((item) => (
                      <div key={item.id} className="action-item">
                        <div className="action-item-header">
                          <input
                            type="checkbox"
                            checked={item.status === 'completed'}
                            onChange={() => handleUpdateActionItem({
                              ...item,
                              status: item.status === 'completed' ? 'open' : 'completed',
                              updatedAt: Date.now(),
                            })}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className="action-task">{item.task}</span>
                        </div>
                        <div className="action-item-meta">
                          <span className="action-owner">Owner: {item.owner}</span>
                          {item.dueDate && (
                            <span className="action-due">Due: {item.dueDate}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {filteredSegments.length === 0 && filteredActionItems.length === 0 && (
                <div className="no-results">No results found for "{searchQuery}"</div>
              )}
            </div>
          ) : (
            <>
              {/* Transcript */}
              {transcript && (
                <div className="transcript-section">
                  <div className="section-header">
                    <h3>Transcript</h3>
                    <span className="status-badge">
                      {transcript.status === 'completed' ? '✓ Complete' : 
                       transcript.status === 'processing' ? '⏳ Processing' : 
                       '⚠ Failed'}
                    </span>
                  </div>
                  <div className="transcript-content">
                    {segments.length > 0 ? (
                      segments.map((segment) => (
                        <div 
                          key={segment.id} 
                          className="transcript-segment"
                          onClick={() => setSelectedSegment(segment)}
                        >
                          <span className="segment-time">
                            {formatTime(segment.startTime)}
                          </span>
                          <span className="segment-speaker">{segment.speaker}:</span>
                          <span className="segment-text">{segment.text}</span>
                        </div>
                      ))
                    ) : (
                      <div className="transcript-empty">
                        {transcript.status === 'processing' ? 
                          'Transcript is being generated...' : 
                          'No transcript available'}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Summary */}
              {summary && (
                <div className="summary-section">
                  <div className="section-header">
                    <h3>AI Summary</h3>
                    <button className="btn btn-small" onClick={handleRegenerateSummary}>
                      🔄 Regenerate
                    </button>
                  </div>
                  
                  <div className="summary-content">
                    <div className="summary-item">
                      <h4>Executive Summary</h4>
                      <p>{summary.executiveSummary}</p>
                    </div>

                    {summary.keyPoints.length > 0 && (
                      <div className="summary-item">
                        <h4>Key Discussion Points</h4>
                        <ul>
                          {summary.keyPoints.map((point, i) => (
                            <li key={i}>{point}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {summary.decisions.length > 0 && (
                      <div className="summary-item">
                        <h4>Decisions</h4>
                        <ul>
                          {summary.decisions.map((decision, i) => (
                            <li key={i} className="decision-item">
                              ✓ {decision}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {summary.openQuestions.length > 0 && (
                      <div className="summary-item">
                        <h4>Open Questions</h4>
                        <ul>
                          {summary.openQuestions.map((question, i) => (
                            <li key={i} className="question-item">
                              ❓ {question}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {summary.importantTopics.length > 0 && (
                      <div className="summary-item">
                        <h4>Important Topics</h4>
                        <div className="topics">
                          {summary.importantTopics.map((topic, i) => (
                            <span key={i} className="topic-tag">{topic}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Items */}
              <div className="action-items-section">
                <div className="section-header">
                  <h3>Action Items</h3>
                  <span className="action-count">{actionItems.length}</span>
                </div>
                
                {actionItems.length > 0 ? (
                  <div className="action-items-list">
                    {actionItems.map((item) => (
                      <div key={item.id} className="action-item-card">
                        <div className="action-item-header">
                          <input
                            type="checkbox"
                            checked={item.status === 'completed'}
                            onChange={() => handleUpdateActionItem({
                              ...item,
                              status: item.status === 'completed' ? 'open' : 'completed',
                              updatedAt: Date.now(),
                            })}
                          />
                          <span className="action-task">{item.task}</span>
                        </div>
                        <div className="action-item-body">
                          <div className="action-meta">
                            <span className="action-owner">Owner: {item.owner}</span>
                            {item.dueDate && (
                              <span className="action-due">Due: {item.dueDate}</span>
                            )}
                            <span className={`action-status ${item.status}`}>
                              {item.status}
                            </span>
                          </div>
                          <div className="action-actions">
                            <button 
                              className="action-btn edit"
                              onClick={() => setNewActionItem({
                                meetingId: item.meetingId,
                                task: item.task,
                                owner: item.owner,
                                dueDate: item.dueDate || '',
                                status: item.status,
                              })}
                            >
                              Edit
                            </button>
                            <button 
                              className="action-btn delete"
                              onClick={() => handleDeleteActionItem(item.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="action-items-empty">
                    No action items yet
                  </div>
                )}

                {/* Add Action Item */}
                {newActionItem.meetingId && (
                  <div className="add-action-item">
                    <h4>Add Action Item</h4>
                    <div className="form-group">
                      <input
                        type="text"
                        placeholder="Task..."
                        value={newActionItem.task}
                        onChange={(e) => setNewActionItem({ ...newActionItem, task: e.target.value })}
                        className="form-input"
                      />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <input
                          type="text"
                          placeholder="Owner..."
                          value={newActionItem.owner}
                          onChange={(e) => setNewActionItem({ ...newActionItem, owner: e.target.value })}
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <input
                          type="date"
                          placeholder="Due date..."
                          value={newActionItem.dueDate}
                          onChange={(e) => setNewActionItem({ ...newActionItem, dueDate: e.target.value })}
                          className="form-input"
                        />
                      </div>
                    </div>
                    <div className="form-actions">
                      <button className="btn btn-secondary" onClick={() => setNewActionItem({ meetingId: '', task: '', owner: '', dueDate: '', status: 'open' })}>
                        Cancel
                      </button>
                      <button className="btn btn-primary" onClick={handleAddActionItem} disabled={!newActionItem.task.trim()}>
                        Add
                      </button>
                    </div>
                  </div>
                )}
                
                {!newActionItem.meetingId && (
                  <button className="btn btn-primary" onClick={() => setNewActionItem({ meetingId, task: '', owner: '', dueDate: '', status: 'open' })}>
                    + Add Action Item
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right: AI Assistant */}
        <div className="meeting-sidebar right">
          <div className="ai-assistant">
            <h3>🤖 AI Assistant</h3>
            <p className="ai-description">
              Ask questions about this meeting and get answers based on the transcript.
            </p>
            
            <div className="ai-input">
              <input
                type="text"
                placeholder="Ask about the meeting..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAskQuestion()}
                disabled={isAsking || !transcript}
                className="ai-question"
              />
              <button 
                className="ai-send"
                onClick={handleAskQuestion}
                disabled={isAsking || !question.trim() || !transcript}
              >
                Send
              </button>
            </div>

            {isAsking && (
              <div className="ai-loading">
                <div className="spinner"></div>
                <span>Thinking...</span>
              </div>
            )}

            {answer && (
              <div className="ai-answer">
                <div className="answer-header">
                  <span className="answer-label">Answer:</span>
                </div>
                <p>{answer}</p>
              </div>
            )}

            {!transcript && !isAsking && (
              <div className="ai-warning">
                ⚠️ Transcript not available. Generate a transcript first to enable AI questions.
              </div>
            )}

            <div className="ai-suggestions">
              <h4>Suggested Questions:</h4>
              <ul>
                <li onClick={() => setQuestion('What did we decide about the launch?')}>
                  What did we decide about the launch?
                </li>
                <li onClick={() => setQuestion('Who is responsible for the marketing campaign?')}>
                  Who is responsible for the marketing campaign?
                </li>
                <li onClick={() => setQuestion('What were the main concerns?')}>
                  What were the main concerns?
                </li>
                <li onClick={() => setQuestion('Summarize the discussion about pricing.')}>
                  Summarize the discussion about pricing.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingDetails;
