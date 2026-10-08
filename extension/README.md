# RecordMeeting - Chrome Extension

A production-ready Chrome extension for recording, transcribing, and summarizing Google Meet meetings using local storage (IndexedDB) and DeepSeek AI.

## Features

- **Recording**: Record audio from Google Meet meetings
- **Transcription**: Generate transcripts using Web Speech API
- **AI Summaries**: Generate meeting summaries with DeepSeek AI
- **Action Items**: Automatically extract action items from meetings
- **Search**: Search through meeting transcripts and summaries
- **Local Storage**: All data stored locally in IndexedDB (no backend required)
- **Dashboard**: View and manage all your meetings
- **Settings**: Configure recording, transcription, and AI settings

## Architecture

This extension uses a **fully client-side architecture** with:

- **Manifest V3** Chrome extension
- **TypeScript** for type safety
- **React** for UI components
- **IndexedDB** (via Dexie) for local storage
- **MediaRecorder API** for audio recording
- **Web Speech API** for transcription
- **DeepSeek AI API** for summaries and action items

## Project Structure

```
extension/
├── src/
│   ├── background/           # Background service worker
│   │   └── background.ts    # Recording state, message handling
│   ├── content/             # Content scripts
│   │   ├── content.ts       # Main content script logic
│   │   ├── content.css      # Content script styles
│   │   └── googleMeetAdapter.ts # Google Meet detection logic
│   ├── popup/               # Extension popup
│   │   ├── popup.tsx        # Main popup component
│   │   └── popup.html       # Popup HTML
│   ├── pages/               # Dashboard pages
│   │   ├── Dashboard.tsx     # Meeting dashboard
│   │   └── MeetingDetails.tsx # Meeting details page
│   ├── services/            # Business logic services
│   │   ├── database.ts      # IndexedDB database
│   │   ├── storageService.ts # Storage operations
│   │   ├── transcriptionService.ts # Transcription
│   │   └── deepSeekService.ts # DeepSeek AI integration
│   ├── styles/              # CSS styles
│   │   ├── popup.css        # Popup styles
│   │   ├── dashboard.css     # Dashboard styles
│   │   └── meetingDetails.css # Meeting details styles
│   ├── types/               # TypeScript types
│   │   └── types.ts         # Type definitions
│   ├── utils/               # Utility functions
│   │   ├── constants.ts      # Application constants
│   │   └── formatters.ts     # Date/time formatters
│   └── manifest.json        # Extension manifest
├── public/
│   └── icons/               # Extension icons
└── package.json            # Project dependencies
```

## Setup

### Prerequisites

- Node.js 18+ (recommended: 20+)
- npm or yarn
- Chrome browser
- DeepSeek API key (optional, for AI features)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/jumper01/RecordMeeting.git
   cd RecordMeeting/extension
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right corner)
   - Click "Load unpacked"
   - Select the `extension/dist` folder

### Configuration

To enable DeepSeek AI features, you need to configure the API key:

1. Get a DeepSeek API key from [https://deepseek.com](https://deepseek.com)
2. In the extension, go to Settings
3. Add your API key in the AI settings section

Alternatively, you can set it programmatically:
```typescript
import { DeepSeekService } from './services/deepSeekService';
DeepSeekService.initialize('your-api-key-here');
```

## Usage

### Recording a Meeting

1. Open Google Meet and join a meeting
2. The RecordMeeting UI will appear in the bottom-right corner
3. Click "Start Recording" to begin
4. The recording will automatically:
   - Save to local storage
   - Generate a transcript (when recording stops)
   - Generate an AI summary (if DeepSeek is configured)
   - Extract action items

### Viewing Meetings

1. Click the RecordMeeting extension icon
2. The dashboard shows all your recorded meetings
3. Click on a meeting to view:
   - Transcript with timestamps
   - AI-generated summary
   - Extracted action items
   - Meeting metadata

### Search

Use the search bar to find specific content across:
- Meeting titles
- Transcripts
- Summaries
- Action items
- Participants

### Settings

Configure:
- **Recording**: Auto-start, audio quality, notifications
- **Transcription**: Language, speaker detection
- **AI**: Auto-summarize, generate action items, generate decisions
- **Storage**: Retention policies, auto-delete

## API Reference

### StorageService

```typescript
// Meetings
StorageService.createMeeting(userId, googleMeetId, title, participants, startTime)
StorageService.getMeeting(id)
StorageService.getMeetingsByUser(userId)
StorageService.updateMeeting(meeting)
StorageService.deleteMeeting(id)
StorageService.searchMeetings(userId, query)

// Recordings
StorageService.createRecording(meetingId, audioBlob, duration, fileSize, format)
StorageService.getRecording(id)
StorageService.getRecordingsByMeeting(meetingId)
StorageService.updateRecording(recording)
StorageService.deleteRecording(id)

// Transcripts
StorageService.createTranscript(meetingId, language, text, segments)
StorageService.getTranscript(id)
StorageService.getTranscriptByMeeting(meetingId)
StorageService.updateTranscript(transcript)
StorageService.updateTranscriptStatus(meetingId, status, text?, segments?)

// Summaries
StorageService.createSummary(meetingId)
StorageService.getSummary(id)
StorageService.getSummaryByMeeting(meetingId)
StorageService.updateSummary(summary)
StorageService.updateSummaryStatus(meetingId, status, data?)

// Action Items
StorageService.createActionItem(meetingId, task, owner, dueDate?, status)
StorageService.getActionItem(id)
StorageService.getActionItemsByMeeting(meetingId)
StorageService.updateActionItem(actionItem)
StorageService.deleteActionItem(id)
```

### TranscriptionService

```typescript
// Check support
TranscriptionService.isSupported()

// Initialize
TranscriptionService.initialize({ language: 'en-US', continuous: true })

// Start/Stop
TranscriptionService.start()
TranscriptionService.stop()
TranscriptionService.pause()
TranscriptionService.resume()

// Callbacks
TranscriptionService.onResult(callback)
TranscriptionService.onError(callback)
TranscriptionService.onEnd(callback)

// Get state
TranscriptionService.getState()
TranscriptionService.getTranscript()
TranscriptionService.getSegments()

// Clear
TranscriptionService.clear()
```

### DeepSeekService

```typescript
// Initialize with API key
DeepSeekService.initialize('your-api-key')

// Check if configured
DeepSeekService.isConfigured()

// Generate summary
DeepSeekService.generateSummary({ transcript, segments, meetingTitle, participants, language })

// Extract action items
DeepSeekService.extractActionItems({ transcript, segments, meetingTitle, language })

// Extract decisions
DeepSeekService.extractDecisions(transcript, segments)

// Answer questions
DeepSeekService.answerQuestion(question, transcript, segments)
```

## Message Types

The extension uses Chrome's message passing for communication between components:

```typescript
// Recording
START_RECORDING
STOP_RECORDING
PAUSE_RECORDING
RESUME_RECORDING
RECORDING_STATE

// Meetings
MEETING_DETECTED
MEETING_INFO
SAVE_MEETING
GET_MEETINGS
GET_MEETING
DELETE_MEETING

// Settings
GET_SETTINGS
SAVE_SETTINGS

// Navigation
OPEN_DASHBOARD
OPEN_SETTINGS

// Authentication
AUTH_STATE

// Permissions
REQUEST_PERMISSIONS
PERMISSIONS_GRANTED
PERMISSIONS_DENIED
```

## Database Schema

The extension uses IndexedDB with the following tables:

### User
- `id` (primary key)
- `googleId`
- `email`
- `name`
- `avatarUrl`
- `createdAt`
- `updatedAt`

### Meeting
- `id` (primary key)
- `userId` (index)
- `googleMeetId` (index)
- `title`
- `startTime`
- `endTime`
- `duration`
- `participants` (array)
- `tags` (array)
- `createdAt`
- `updatedAt`

### Recording
- `id` (primary key)
- `meetingId` (index)
- `audioBlob`
- `audioUrl`
- `duration`
- `fileSize`
- `format`
- `status`
- `createdAt`

### Transcript
- `id` (primary key)
- `meetingId` (index)
- `language`
- `text`
- `segments` (array)
- `status`
- `createdAt`

### TranscriptSegment
- `id` (primary key)
- `transcriptId` (index)
- `speaker`
- `startTime`
- `endTime`
- `text`

### Summary
- `id` (primary key)
- `meetingId` (index)
- `executiveSummary`
- `keyPoints` (array)
- `decisions` (array)
- `actionItems` (array)
- `openQuestions` (array)
- `importantTopics` (array)
- `status`
- `createdAt`

### ActionItem
- `id` (primary key)
- `meetingId` (index)
- `task`
- `owner`
- `dueDate`
- `status`
- `createdAt`
- `updatedAt`

### Tag
- `id` (primary key)
- `userId` (index)
- `name`

### Settings
- `id` (primary key)
- `userId` (index)
- `recording` (object)
- `transcription` (object)
- `ai` (object)
- `storage` (object)
- `privacy` (object)
- `createdAt`
- `updatedAt`

## Limitations

### Browser Limitations

1. **Audio Capture**: The MediaRecorder API can only capture audio from the user's microphone, not from other meeting participants.

2. **Transcription**: The Web Speech API has limitations:
   - May not work in all browsers
   - Accuracy varies by language and audio quality
   - Typically only captures the user's speech

3. **Storage**: All data is stored locally in IndexedDB:
   - Limited by browser storage quotas
   - Data is only available on the current device/browser
   - No cloud sync without additional implementation

### Google Meet Limitations

1. **DOM Changes**: Google Meet's interface may change, requiring updates to the adapter.

2. **Permissions**: The extension requires microphone permissions to record.

3. **Detection**: Meeting detection relies on DOM patterns that may change.

## Security & Privacy

### Data Storage
- All recordings, transcripts, and summaries are stored locally in IndexedDB
- No data is sent to external servers unless DeepSeek AI is enabled
- Users can delete their data at any time

### Permissions
The extension requests the following permissions:
- `storage`: For storing settings and preferences
- `activeTab`: For interacting with the current tab
- `scripting`: For injecting content scripts
- `audio`: For microphone access (required for recording)
- `clipboardWrite`: For copying text to clipboard
- `clipboardRead`: For reading from clipboard (if needed)

### Host Permissions
- `https://meet.google.com/*`: Required to detect and interact with Google Meet

## Troubleshooting

### Recording Not Starting
- Check microphone permissions in Chrome settings
- Ensure you're in a Google Meet meeting
- Try refreshing the page

### Transcription Not Working
- Check if your browser supports the Web Speech API
- Try a different language
- Ensure microphone is working

### DeepSeek AI Not Working
- Verify your API key is configured
- Check your internet connection
- Ensure you have sufficient API credits

### Extension Not Loading
- Check Chrome's developer mode is enabled
- Verify the extension is properly loaded
- Check the console for errors

## Development

### Running in Development Mode

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build in watch mode:
   ```bash
   npm run watch
   ```

3. Load the extension from the `dist` folder in Chrome

### Testing

Run tests with:
```bash
npm test
```

### Building for Production

```bash
npm run build
```

This will compile TypeScript and copy all necessary files to the `dist` folder.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and ensure they pass
5. Submit a pull request

## License

MIT License - See LICENSE file for details.

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

## Acknowledgments

- Built with TypeScript and React
- Uses Dexie for IndexedDB operations
- DeepSeek AI for intelligent meeting processing
- Inspired by products like Otter.ai, Fireflies.ai, and Read AI
