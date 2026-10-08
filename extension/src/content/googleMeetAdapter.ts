/**
 * Google Meet Adapter
 * 
 * This module contains all Google Meet-specific logic for detecting
 * meeting information and injecting the RecordMeeting UI.
 * 
 * Isolating this logic makes it easier to update when Google Meet
 * changes its interface.
 */

export interface GoogleMeetInfo {
  meetingId: string;
  meetingTitle: string;
  participants: string[];
  isInMeeting: boolean;
  isRecordingSupported: boolean;
}

export class GoogleMeetAdapter {
  private static instance: GoogleMeetAdapter;
  
  private constructor() {}
  
  public static getInstance(): GoogleMeetAdapter {
    if (!GoogleMeetAdapter.instance) {
      GoogleMeetAdapter.instance = new GoogleMeetAdapter();
    }
    return GoogleMeetAdapter.instance;
  }

  /**
   * Detect if the current page is a Google Meet page
   */
  public isGoogleMeetPage(): boolean {
    return window.location.hostname.includes('meet.google.com');
  }

  /**
   * Detect if the user is currently in a meeting
   */
  public isInMeeting(): boolean {
    // Check for meeting-specific elements
    const inMeetingIndicators = [
      // Check for the meeting title element
      document.querySelector('div[aria-label*="meeting"]'),
      document.querySelector('h1[aria-label*="meeting"]'),
      // Check for participant list
      document.querySelector('div[aria-label*="participant"]'),
      // Check for meeting controls
      document.querySelector('div[aria-label*="microphone"]'),
      document.querySelector('div[aria-label*="camera"]'),
      // Check for URL pattern
      window.location.pathname.includes('/') && !window.location.pathname.includes('/join'),
    ];

    return inMeetingIndicators.some(indicator => indicator !== null);
  }

  /**
   * Extract meeting ID from URL
   */
  public extractMeetingId(): string | null {
    const path = window.location.pathname;
    
    // Pattern: /xxx-yyyy-zzz or /join/xxx-yyyy-zzz
    const match = path.match(/(?:\/|\/join\/)[a-zA-Z0-9\-]{10,}/);
    
    if (match && match[0]) {
      // Extract the ID part
      const idPart = match[0].replace(/\/join\/|\//g, '');
      return idPart;
    }
    
    return null;
  }

  /**
   * Extract meeting title from the page
   */
  public extractMeetingTitle(): string | null {
    // Try different selectors for the meeting title
    const selectors = [
      // Modern Google Meet
      'div[aria-label*="Meeting details"]',
      'h1[aria-label*="meeting"]',
      'span[aria-label*="meeting title"]',
      // Older versions
      'div.meeting-title',
      'span.meeting-name',
      // Fallback: check the document title
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent?.trim();
        if (text && text !== '') {
          return text;
        }
      }
    }

    // Try document title as fallback
    const docTitle = document.title;
    if (docTitle && docTitle.includes('Google Meet')) {
      // Extract the meeting name from the title
      return docTitle.replace(' - Google Meet', '').replace('Google Meet: ', '').trim();
    }

    return null;
  }

  /**
   * Extract participant list from the page
   */
  public extractParticipants(): string[] {
    const participants: Set<string> = new Set();

    // Try to find participant elements
    const participantSelectors = [
      // Participant list panel
      'div[aria-label*="participant"]',
      'div[aria-label*="Participants"]',
      // Individual participant items
      'div[aria-label*="person"]',
      'span[aria-label*="name"]',
      // Participant names
      'div.participant-name',
      'span.participant-name',
    ];

    for (const selector of participantSelectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        const text = element.textContent?.trim();
        if (text && text !== '' && !text.includes('You')) {
          participants.add(text);
        }
      });
    }

    // Also check for participant count
    const countElement = document.querySelector('span[aria-label*="participants"]');
    if (countElement) {
      const countText = countElement.textContent?.trim();
      if (countText) {
        // Extract number from text like "3 participants"
        const match = countText.match(/\d+/);
        if (match) {
          const count = parseInt(match[0], 10);
          // If we have fewer participants than the count, there might be more
          if (participants.size < count) {
            // We can't get all names, so just note the count
            participants.add(`+${count - participants.size} others`);
          }
        }
      }
    }

    return Array.from(participants);
  }

  /**
   * Check if recording is supported in the current meeting
   */
  public isRecordingSupported(): boolean {
    // Check if we're in a meeting
    if (!this.isInMeeting()) {
      return false;
    }

    // Check if the meeting has started
    const startedIndicators = [
      document.querySelector('div[aria-label*="connected"]'),
      document.querySelector('div[aria-label*="in meeting"]'),
    ];

    return startedIndicators.some(indicator => indicator !== null);
  }

  /**
   * Get complete meeting information
   */
  public getMeetingInfo(): GoogleMeetInfo {
    const meetingId = this.extractMeetingId() || '';
    const meetingTitle = this.extractMeetingTitle() || 'Untitled Meeting';
    const participants = this.extractParticipants();
    const isInMeeting = this.isInMeeting();
    const isRecordingSupported = this.isRecordingSupported();

    return {
      meetingId,
      meetingTitle,
      participants,
      isInMeeting,
      isRecordingSupported,
    };
  }

  /**
   * Find a suitable location to inject the RecordMeeting UI
   */
  public findInjectionPoint(): HTMLElement | null {
    // Try to find a good location for the UI
    const possibleLocations = [
      // Top-right corner (near Google Meet controls)
      'div[aria-label*="controls"]',
      'div.meeting-controls',
      // Bottom bar
      'div.bottom-bar',
      'div[aria-label*="toolbar"]',
      // Main content area
      'div.meeting-content',
      'main',
      // Fallback: body
      'body',
    ];

    for (const selector of possibleLocations) {
      const element = document.querySelector(selector);
      if (element) {
        return element as HTMLElement;
      }
    }

    return document.body;
  }

  /**
   * Check if the RecordMeeting UI is already injected
   */
  public isUIInjected(): boolean {
    return document.getElementById('recordmeeting-container') !== null;
  }

  /**
   * Remove the RecordMeeting UI if it exists
   */
  public removeUI(): void {
    const container = document.getElementById('recordmeeting-container');
    if (container) {
      container.remove();
    }
  }

  /**
   * Observe DOM changes to detect when meeting starts/ends
   */
  public setupObserver(callback: () => void): MutationObserver {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList' || mutation.type === 'attributes' || mutation.type === 'characterData') {
          const wasInMeeting = this.isInMeeting();
          const nowInMeeting = this.isInMeeting();
          
          if (wasInMeeting !== nowInMeeting) {
            callback();
            break;
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });

    return observer;
  }
}
