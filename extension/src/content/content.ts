import { GoogleMeetAdapter } from './googleMeetAdapter';
import { MESSAGE_TYPES } from '../utils/constants';
import { RecordingStatus } from '../types/types';

// Initialize the adapter
const adapter = GoogleMeetAdapter.getInstance();

// Track if we've already initialized
let isInitialized = false;
let observer: MutationObserver | null = null;

/**
 * Initialize the RecordMeeting content script
 */
function init() {
  if (isInitialized) return;
  isInitialized = true;

  console.log('RecordMeeting content script initialized');

  // Check if this is a Google Meet page
  if (!adapter.isGoogleMeetPage()) {
    return;
  }

  console.log('Google Meet page detected');

  // Setup DOM observer to detect meeting state changes
  setupObserver();

  // Check initial state
  checkMeetingState();
}

/**
 * Setup DOM observer to detect when meeting starts/ends
 */
function setupObserver() {
  observer = adapter.setupObserver(() => {
    checkMeetingState();
  });
}

/**
 * Check the current meeting state and act accordingly
 */
async function checkMeetingState() {
  const info = adapter.getMeetingInfo();

  console.log('Meeting state check:', {
    isInMeeting: info.isInMeeting,
    isRecordingSupported: info.isRecordingSupported,
    meetingId: info.meetingId,
    meetingTitle: info.meetingTitle,
  });

  if (info.isInMeeting) {
    // Meeting is active
    await handleMeetingActive(info);
  } else {
    // Not in a meeting or meeting ended
    handleMeetingInactive();
  }
}

/**
 * Handle when a meeting becomes active
 */
async function handleMeetingActive(info: any) {
  // Remove any existing UI
  adapter.removeUI();

  // Send meeting detected message to background
  chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.MEETING_DETECTED,
    data: {
      url: window.location.href,
      title: info.meetingTitle,
      meetingId: info.meetingId,
    },
  }, (response) => {
    console.log('Meeting detected response:', response);
    
    // Inject UI with meeting info
    injectUI(info, response?.meeting);
  });

  // Also send meeting info
  chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.MEETING_INFO,
    data: {
      meetingId: info.meetingId || `RM-${Date.now()}`,
      title: info.meetingTitle,
      participants: info.participants,
      startTime: Date.now(),
    },
  }, (response) => {
    console.log('Meeting info response:', response);
  });

  // Request recording state
  chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.RECORDING_STATE,
  }, (response) => {
    console.log('Recording state:', response?.state);
    
    // Update UI with recording state
    if (response?.state) {
      updateRecordingUI(response.state);
    }
  });
}

/**
 * Handle when a meeting becomes inactive
 */
function handleMeetingInactive() {
  console.log('Meeting ended or not in meeting');
  
  // Remove UI
  adapter.removeUI();

  // Send message to background
  chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.MEETING_DETECTED,
    data: {
      url: window.location.href,
      isInMeeting: false,
    },
  });
}

/**
 * Inject the RecordMeeting UI into the page
 */
function injectUI(meetingInfo: any, meeting?: any) {
  // Don't inject if already there
  if (adapter.isUIInjected()) {
    return;
  }

  // Find injection point
  const injectionPoint = adapter.findInjectionPoint();
  if (!injectionPoint) {
    console.error('Could not find injection point');
    return;
  }

  // Create container
  const container = document.createElement('div');
  container.id = 'recordmeeting-container';
  container.className = 'recordmeeting-container';

  // Create the UI
  const ui = createRecordingUI(meetingInfo, meeting);
  container.appendChild(ui);

  // Position the container
  container.style.position = 'fixed';
  container.style.bottom = '20px';
  container.style.right = '20px';
  container.style.zIndex = '9999';
  container.style.maxWidth = '300px';

  // Add to DOM
  injectionPoint.appendChild(container);

  console.log('RecordMeeting UI injected');
}

/**
 * Create the recording UI component
 */
function createRecordingUI(meetingInfo: any, meeting?: any): HTMLElement {
  const ui = document.createElement('div');
  ui.className = 'recordmeeting-ui';
  
  // Use meeting data or defaults
  const meetingId = meeting?.id || meetingInfo.meetingId || `RM-${Date.now()}`;
  const title = meeting?.title || meetingInfo.meetingTitle || 'Untitled Meeting';

  ui.innerHTML = `
    <div class="recordmeeting-header">
      <div class="recordmeeting-logo">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="#FF4444" stroke-width="2"/>
          <circle cx="12" cy="12" r="5" fill="#FF4444"/>
        </svg>
        <span class="recordmeeting-title">RecordMeeting</span>
      </div>
    </div>
    <div class="recordmeeting-body">
      <div class="recordmeeting-meeting-info">
        <span class="recordmeeting-meeting-title">${escapeHtml(title)}</span>
        <span class="recordmeeting-meeting-id">${escapeHtml(meetingId)}</span>
      </div>
      <div class="recordmeeting-controls" id="recordmeeting-controls">
        <button class="recordmeeting-btn recordmeeting-btn-start" id="recordmeeting-start">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10" fill="#FF4444"/>
          </svg>
          <span>Start Recording</span>
        </button>
        <button class="recordmeeting-btn recordmeeting-btn-pause" id="recordmeeting-pause" disabled>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" fill="currentColor"/>
            <rect x="14" y="4" width="4" height="16" fill="currentColor"/>
          </svg>
          <span>Pause</span>
        </button>
        <button class="recordmeeting-btn recordmeeting-btn-stop" id="recordmeeting-stop" disabled>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" fill="currentColor"/>
          </svg>
          <span>Stop</span>
        </button>
      </div>
      <div class="recordmeeting-status" id="recordmeeting-status">
        <span class="recordmeeting-status-icon" id="recordmeeting-status-icon">⚪</span>
        <span class="recordmeeting-status-text" id="recordmeeting-status-text">Not recording</span>
        <span class="recordmeeting-timer" id="recordmeeting-timer">00:00:00</span>
      </div>
      <div class="recordmeeting-progress" id="recordmeeting-progress">
        <div class="recordmeeting-progress-bar" id="recordmeeting-progress-bar"></div>
      </div>
    </div>
    <div class="recordmeeting-footer">
      <button class="recordmeeting-btn recordmeeting-btn-secondary" id="recordmeeting-dashboard">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <rect x="3" y="3" width="7" height="7" stroke="currentColor" stroke-width="2"/>
          <rect x="14" y="3" width="7" height="7" stroke="currentColor" stroke-width="2"/>
          <rect x="14" y="14" width="7" height="7" stroke="currentColor" stroke-width="2"/>
          <rect x="3" y="14" width="7" height="7" stroke="currentColor" stroke-width="2"/>
        </svg>
        <span>Dashboard</span>
      </button>
      <button class="recordmeeting-btn recordmeeting-btn-secondary" id="recordmeeting-settings">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="3" fill="currentColor"/>
          <path d="M12 1v6m0 10v6m11-7h-6m-10 0H1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <span>Settings</span>
      </button>
    </div>
  `;

  // Add event listeners
  setupEventListeners(ui, meetingId);

  return ui;
}

/**
 * Setup event listeners for the UI
 */
function setupEventListeners(ui: HTMLElement, meetingId: string) {
  const startBtn = ui.querySelector('#recordmeeting-start') as HTMLButtonElement;
  const pauseBtn = ui.querySelector('#recordmeeting-pause') as HTMLButtonElement;
  const stopBtn = ui.querySelector('#recordmeeting-stop') as HTMLButtonElement;
  const statusIcon = ui.querySelector('#recordmeeting-status-icon') as HTMLElement;
  const statusText = ui.querySelector('#recordmeeting-status-text') as HTMLElement;
  const timer = ui.querySelector('#recordmeeting-timer') as HTMLElement;
  const dashboardBtn = ui.querySelector('#recordmeeting-dashboard') as HTMLButtonElement;
  const settingsBtn = ui.querySelector('#recordmeeting-settings') as HTMLButtonElement;

  // Start recording
  startBtn?.addEventListener('click', async () => {
    try {
      // Request permissions first
      chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.REQUEST_PERMISSIONS,
      }, async (response) => {
        if (response?.granted) {
          // Start recording
          chrome.runtime.sendMessage({
            type: MESSAGE_TYPES.START_RECORDING,
            data: { meetingId },
          }, (response) => {
            console.log('Start recording response:', response);
            
            if (response?.error) {
              showError(response.error);
              return;
            }

            // Update UI
            updateRecordingUI(response?.state || { status: 'recording' });
          });
        } else {
          showError('Microphone permissions required. Please allow microphone access.');
        }
      });
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to start recording');
    }
  });

  // Pause recording
  pauseBtn?.addEventListener('click', () => {
    chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.PAUSE_RECORDING,
    }, (response) => {
      console.log('Pause recording response:', response);
      
      if (response?.error) {
        showError(response.error);
        return;
      }

      updateRecordingUI(response?.state);
    });
  });

  // Stop recording
  stopBtn?.addEventListener('click', () => {
    chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.STOP_RECORDING,
      data: { meetingId },
    }, (response) => {
      console.log('Stop recording response:', response);
      
      if (response?.error) {
        showError(response.error);
        return;
      }

      updateRecordingUI(response?.state);
    });
  });

  // Open dashboard
  dashboardBtn?.addEventListener('click', () => {
    chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.OPEN_DASHBOARD,
    });
    
    // For now, open the popup
    chrome.runtime.sendMessage({
      type: 'OPEN_POPUP',
    });
  });

  // Open settings
  settingsBtn?.addEventListener('click', () => {
    // Open settings in popup
    chrome.runtime.sendMessage({
      type: 'OPEN_SETTINGS',
    });
  });

  // Start timer
  startTimer(timer);
}

/**
 * Update the recording UI based on state
 */
function updateRecordingUI(state?: any) {
  const container = document.getElementById('recordmeeting-container');
  if (!container) return;

  const startBtn = container.querySelector('#recordmeeting-start') as HTMLButtonElement;
  const pauseBtn = container.querySelector('#recordmeeting-pause') as HTMLButtonElement;
  const stopBtn = container.querySelector('#recordmeeting-stop') as HTMLButtonElement;
  const statusIcon = container.querySelector('#recordmeeting-status-icon') as HTMLElement;
  const statusText = container.querySelector('#recordmeeting-status-text') as HTMLElement;
  const timer = container.querySelector('#recordmeeting-timer') as HTMLElement;

  if (!startBtn || !pauseBtn || !stopBtn || !statusIcon || !statusText || !timer) {
    return;
  }

  const status = state?.status || 'idle';
  const isRecording = state?.isRecording || false;
  const isPaused = state?.isPaused || false;

  // Update button states
  startBtn.disabled = isRecording;
  pauseBtn.disabled = !isRecording || isPaused;
  stopBtn.disabled = !isRecording;

  // Update status display
  let icon = '⚪';
  let text = 'Not recording';

  switch (status) {
    case 'recording':
      icon = '🔴';
      text = 'Recording';
      break;
    case 'paused':
      icon = '🟡';
      text = 'Paused';
      break;
    case 'processing':
      icon = '🔵';
      text = 'Processing';
      break;
    case 'completed':
      icon = '🟢';
      text = 'Completed';
      break;
    case 'failed':
      icon = '❌';
      text = 'Failed';
      break;
    case 'preparing':
      icon = '🟠';
      text = 'Preparing';
      break;
    default:
      icon = '⚪';
      text = 'Not recording';
  }

  statusIcon.textContent = icon;
  statusIcon.style.color = getStatusColor(status);
  statusText.textContent = text;

  // Update button styles
  if (isRecording) {
    startBtn.classList.add('recordmeeting-btn-active');
    stopBtn.classList.add('recordmeeting-btn-danger');
  } else {
    startBtn.classList.remove('recordmeeting-btn-active');
    stopBtn.classList.remove('recordmeeting-btn-danger');
  }

  if (isPaused) {
    pauseBtn.classList.add('recordmeeting-btn-active');
  } else {
    pauseBtn.classList.remove('recordmeeting-btn-active');
  }
}

/**
 * Get color for status
 */
function getStatusColor(status: string): string {
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
}

/**
 * Start the recording timer
 */
function startTimer(timerElement: HTMLElement) {
  let startTime: number | null = null;
  let elapsed = 0;
  let interval: ReturnType<typeof setInterval> | null = null;

  // Listen for recording state changes
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === MESSAGE_TYPES.RECORDING_STATE) {
      const state = message.data?.state;
      
      if (state?.status === 'recording' && state?.startTime && !startTime) {
        // Start timer
        startTime = Date.now() - (state.totalPausedTime || 0);
        startTimerInterval();
      } else if (state?.status !== 'recording' && state?.status !== 'paused') {
        // Stop timer
        stopTimerInterval();
        startTime = null;
      }
    }
  });

  function startTimerInterval() {
    if (interval) return;
    
    startTime = startTime || Date.now();
    
    interval = setInterval(() => {
      const now = Date.now();
      elapsed = (now - (startTime || now)) / 1000;
      timerElement.textContent = formatTime(elapsed);
    }, 1000);
  }

  function stopTimerInterval() {
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
  }

  function formatTime(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return [
      hrs.toString().padStart(2, '0'),
      mins.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0'),
    ].join(':');
  }
}

/**
 * Show an error message in the UI
 */
function showError(message: string) {
  // For now, just log to console
  console.error('RecordMeeting Error:', message);
  
  // In a real implementation, you'd show a toast or notification
  const container = document.getElementById('recordmeeting-container');
  if (container) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'recordmeeting-error';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
      position: fixed;
      bottom: 80px;
      right: 20px;
      background: #DC3545;
      color: white;
      padding: 10px 15px;
      border-radius: 4px;
      font-size: 14px;
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(errorDiv);
    
    // Remove after 5 seconds
    setTimeout(() => {
      errorDiv.remove();
    }, 5000);
  }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Clean up on page navigation
window.addEventListener('beforeunload', () => {
  if (observer) {
    observer.disconnect();
  }
  adapter.removeUI();
});
