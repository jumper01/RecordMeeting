import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storageService';
import { Meeting } from '../types/types';
import { formatDate, formatDuration, formatLongDuration, truncateText } from '../utils/formatters';

interface DashboardProps {
  onMeetingSelect: (meetingId: string) => void;
  onStartRecording: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onMeetingSelect, onStartRecording }) => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'duration' | 'title'>('newest');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'processing' | 'recording'>('all');
  const [stats, setStats] = useState<{
    totalMeetings: number;
    totalRecordingTime: number;
    meetingsThisWeek: number;
    totalActionItems: number;
  }>({ totalMeetings: 0, totalRecordingTime: 0, meetingsThisWeek: 0, totalActionItems: 0 });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Reload data when filters change
    loadMeetings();
  }, [sortBy, filterStatus, searchQuery]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const userId = 'default-user';
      
      // Load meetings and stats
      const [userMeetings, userStats] = await Promise.all([
        StorageService.getMeetingsByUser(userId),
        StorageService.getUserStats(userId),
      ]);
      
      setMeetings(userMeetings);
      setStats(userStats);
      
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadMeetings = async () => {
    try {
      setLoading(true);
      
      const userId = 'default-user';
      let userMeetings = await StorageService.getMeetingsByUser(userId);
      
      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        userMeetings = userMeetings.filter(meeting => 
          meeting.title.toLowerCase().includes(query) ||
          meeting.participants.some(p => p.toLowerCase().includes(query)) ||
          meeting.tags.some(tag => tag.toLowerCase().includes(query))
        );
      }
      
      // Filter by status
      if (filterStatus !== 'all') {
        // In a real implementation, you'd filter by meeting status
        // For now, we'll just filter by whether the meeting has ended
        userMeetings = userMeetings.filter(meeting => {
          if (filterStatus === 'recording') {
            // This would be determined by current recording state
            return false; // Placeholder
          }
          return true;
        });
      }
      
      // Sort meetings
      userMeetings.sort((a, b) => {
        switch (sortBy) {
          case 'newest':
            return b.startTime - a.startTime;
          case 'oldest':
            return a.startTime - b.startTime;
          case 'duration':
            return (b.duration || 0) - (a.duration || 0);
          case 'title':
            return a.title.localeCompare(b.title);
          default:
            return b.startTime - a.startTime;
        }
      });
      
      setMeetings(userMeetings);
      
    } catch (err) {
      console.error('Error loading meetings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (window.confirm('Are you sure you want to delete this meeting? This cannot be undone.')) {
      try {
        await StorageService.deleteMeeting(meetingId);
        loadData();
      } catch (err) {
        console.error('Error deleting meeting:', err);
        setError(err instanceof Error ? err.message : 'Failed to delete meeting');
      }
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadMeetings();
  };

  const filteredMeetings = meetings;

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard">
        <div className="error">{error}</div>
        <button onClick={loadData}>Retry</button>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="dashboard-welcome">
          <h1>Welcome back!</h1>
          <p>Here's your meeting overview</p>
        </div>
        <div className="dashboard-actions">
          <button className="btn btn-primary" onClick={onStartRecording}>
            + Start Recording
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalMeetings}</div>
            <div className="stat-label">Total Meetings</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <div className="stat-value">{stats.meetingsThisWeek}</div>
            <div className="stat-label">This Week</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏱️</div>
          <div className="stat-content">
            <div className="stat-value">{formatLongDuration(stats.totalRecordingTime)}</div>
            <div className="stat-label">Total Recording Time</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalActionItems}</div>
            <div className="stat-label">Action Items</div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="dashboard-filters">
        <form className="search-form" onSubmit={handleSearch}>
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search meetings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button 
                type="button" 
                className="search-clear"
                onClick={() => setSearchQuery('')}
              >
                ×
              </button>
            )}
          </div>
        </form>

        <div className="filter-controls">
          <div className="filter-group">
            <label className="filter-label">Sort by:</label>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as any)}
              className="filter-select"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="duration">Duration</option>
              <option value="title">Title</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label className="filter-label">Status:</label>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="filter-select"
            >
              <option value="all">All Meetings</option>
              <option value="completed">Completed</option>
              <option value="processing">Processing</option>
              <option value="recording">Recording</option>
            </select>
          </div>
        </div>
      </div>

      {/* Meetings List */}
      <div className="meetings-section">
        <div className="section-header">
          <h2>Recent Meetings</h2>
          <span className="meeting-count">{filteredMeetings.length} meetings</span>
        </div>

        {filteredMeetings.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📅</div>
            <div className="empty-title">No meetings yet</div>
            <div className="empty-text">
              Start recording to save your first meeting. 
              Your meetings will appear here automatically.
            </div>
            <button className="btn btn-primary" onClick={onStartRecording}>
              Start Recording Now
            </button>
          </div>
        ) : (
          <div className="meetings-grid">
            {filteredMeetings.map((meeting) => (
              <div 
                key={meeting.id} 
                className="meeting-card"
                onClick={() => onMeetingSelect(meeting.id)}
              >
                <div className="meeting-card-header">
                  <div className="meeting-title">
                    {truncateText(meeting.title, 50)}
                  </div>
                  <div className="meeting-id">
                    {meeting.id}
                  </div>
                </div>
                
                <div className="meeting-card-body">
                  <div className="meeting-meta">
                    <span className="meeting-date">
                      📅 {formatDate(meeting.startTime)}
                    </span>
                    {meeting.endTime && (
                      <span className="meeting-end-date">
                        to {formatDate(meeting.endTime)}
                      </span>
                    )}
                  </div>
                  
                  {meeting.duration && (
                    <div className="meeting-duration">
                      ⏱️ {formatDuration(meeting.duration)}
                    </div>
                  )}
                  
                  {meeting.participants.length > 0 && (
                    <div className="meeting-participants">
                      👥 {meeting.participants.length} participants
                    </div>
                  )}
                  
                  {meeting.tags.length > 0 && (
                    <div className="meeting-tags">
                      {meeting.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="tag">{tag}</span>
                      ))}
                      {meeting.tags.length > 3 && (
                        <span className="tag">+{meeting.tags.length - 3} more</span>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="meeting-card-footer">
                  <div className="meeting-status">
                    <span className="status-badge completed">✓ Completed</span>
                  </div>
                  <div className="meeting-actions">
                    <button 
                      className="meeting-btn view"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMeetingSelect(meeting.id);
                      }}
                    >
                      View
                    </button>
                    <button 
                      className="meeting-btn delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteMeeting(meeting.id);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
