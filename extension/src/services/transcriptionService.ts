/**
 * Transcription Service
 * 
 * This service handles all transcription-related functionality.
 * It uses the Web Speech API for browser-based speech recognition.
 * 
 * Note: The Web Speech API has limitations:
 * - It may not work in all browsers
 * - It may not capture all participants in a Google Meet
 * - It typically only captures the user's microphone
 * - Accuracy may vary based on audio quality and language
 */

import { TranscriptSegment } from '../types/types';
import { v4 as uuidv4 } from 'uuid';

export interface TranscriptionOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

export interface TranscriptionResult {
  transcript: string;
  segments: TranscriptSegment[];
  isFinal: boolean;
  confidence?: number;
}

export class TranscriptionService {
  private static recognition: any = null;
  private static isRecognizing = false;
  private static finalTranscript = '';
  private static interimTranscript = '';
  private static segments: TranscriptSegment[] = [];
  private static currentSegment: Partial<TranscriptSegment> | null = null;
  private static startTime: number | null = null;
  private static language: string = 'en-US';
  private static onResultCallback: ((result: TranscriptionResult) => void) | null = null;
  private static onErrorCallback: ((error: Error) => void) | null = null;
  private static onEndCallback: (() => void) | null = null;

  /**
   * Check if speech recognition is supported in the browser
   */
  static isSupported(): boolean {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  }

  /**
   * Initialize the speech recognition
   */
  static initialize(options: TranscriptionOptions = {}): void {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      throw new Error('Speech recognition not supported in this browser');
    }

    this.recognition = new SpeechRecognition();
    this.language = options.language || 'en-US';

    // Configure recognition
    this.recognition.continuous = options.continuous !== false;
    this.recognition.interimResults = options.interimResults !== false;
    this.recognition.maxAlternatives = options.maxAlternatives || 1;
    this.recognition.lang = this.language;

    // Event handlers
    this.recognition.onstart = () => {
      this.isRecognizing = true;
      this.startTime = Date.now();
      console.log('Speech recognition started');
    };

    this.recognition.onend = () => {
      this.isRecognizing = false;
      console.log('Speech recognition ended');
      if (this.onEndCallback) {
        this.onEndCallback();
      }
    };

    this.recognition.onresult = (event: any) => {
      this.interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          this.finalTranscript += transcript + ' ';
          
          // Create a new segment
          const endTime = Date.now();
          const startTime = this.startTime || endTime;
          
          this.segments.push({
            id: uuidv4(),
            transcriptId: '', // Will be set later
            speaker: 'Unknown', // Web Speech API doesn't provide speaker info
            startTime: (startTime - (this.startTime || startTime)) / 1000,
            endTime: (endTime - (this.startTime || endTime)) / 1000,
            text: transcript,
          });
          
          this.startTime = endTime;
          
          // Notify callback
          if (this.onResultCallback) {
            this.onResultCallback({
              transcript: this.finalTranscript,
              segments: this.segments,
              isFinal: true,
            });
          }
        } else {
          this.interimTranscript += transcript + ' ';
          
          // Notify callback with interim results
          if (this.onResultCallback) {
            this.onResultCallback({
              transcript: this.finalTranscript + this.interimTranscript,
              segments: this.segments,
              isFinal: false,
            });
          }
        }
      }
    };

    this.recognition.onerror = (event: any) => {
      this.isRecognizing = false;
      console.error('Speech recognition error:', event.error);
      
      if (this.onErrorCallback) {
        this.onErrorCallback(new Error(event.error || 'Speech recognition error'));
      }
    };
  }

  /**
   * Start transcription
   */
  static start(options: TranscriptionOptions = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (!this.isSupported()) {
          throw new Error('Speech recognition not supported');
        }

        if (!this.recognition) {
          this.initialize(options);
        }

        if (this.language !== (options.language || 'en-US')) {
          this.language = options.language || 'en-US';
          this.recognition.lang = this.language;
        }

        // Clear previous state
        this.finalTranscript = '';
        this.interimTranscript = '';
        this.segments = [];
        this.startTime = Date.now();

        this.onEndCallback = resolve;
        this.onErrorCallback = reject;

        this.recognition.start();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop transcription
   */
  static stop(): Promise<TranscriptionResult> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Speech recognition not initialized'));
        return;
      }

      if (!this.isRecognizing) {
        resolve({
          transcript: this.finalTranscript,
          segments: this.segments,
          isFinal: true,
        });
        return;
      }

      this.onEndCallback = () => {
        resolve({
          transcript: this.finalTranscript,
          segments: this.segments,
          isFinal: true,
        });
      };

      this.onErrorCallback = reject;

      try {
        this.recognition.stop();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Pause transcription
   */
  static pause(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Speech recognition not initialized'));
        return;
      }

      if (!this.isRecognizing) {
        resolve();
        return;
      }

      try {
        this.recognition.stop();
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Resume transcription
   */
  static resume(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Speech recognition not initialized'));
        return;
      }

      try {
        this.recognition.start();
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Set callback for transcription results
   */
  static onResult(callback: (result: TranscriptionResult) => void): void {
    this.onResultCallback = callback;
  }

  /**
   * Set callback for errors
   */
  static onError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback;
  }

  /**
   * Set callback for when transcription ends
   */
  static onEnd(callback: () => void): void {
    this.onEndCallback = callback;
  }

  /**
   * Get the current transcription state
   */
  static getState(): {
    isRecognizing: boolean;
    isSupported: boolean;
    finalTranscript: string;
    interimTranscript: string;
    segments: TranscriptSegment[];
    language: string;
  } {
    return {
      isRecognizing: this.isRecognizing,
      isSupported: this.isSupported(),
      finalTranscript: this.finalTranscript,
      interimTranscript: this.interimTranscript,
      segments: this.segments,
      language: this.language,
    };
  }

  /**
   * Get the current transcript
   */
  static getTranscript(): string {
    return this.finalTranscript + this.interimTranscript;
  }

  /**
   * Get the current segments
   */
  static getSegments(): TranscriptSegment[] {
    return this.segments;
  }

  /**
   * Clear the current transcription
   */
  static clear(): void {
    this.finalTranscript = '';
    this.interimTranscript = '';
    this.segments = [];
    this.currentSegment = null;
    this.startTime = null;
  }

  /**
   * Set the language for transcription
   */
  static setLanguage(language: string): void {
    this.language = language;
    if (this.recognition) {
      this.recognition.lang = language;
    }
  }

  /**
   * Get supported languages
   */
  static getSupportedLanguages(): string[] {
    return [
      'en-US', // English (US)
      'en-GB', // English (UK)
      'es-ES', // Spanish (Spain)
      'es-MX', // Spanish (Mexico)
      'fr-FR', // French (France)
      'fr-CA', // French (Canada)
      'de-DE', // German (Germany)
      'it-IT', // Italian (Italy)
      'pt-PT', // Portuguese (Portugal)
      'pt-BR', // Portuguese (Brazil)
      'ru-RU', // Russian (Russia)
      'zh-CN', // Chinese (Mandarin, Simplified)
      'ja-JP', // Japanese (Japan)
      'ko-KR', // Korean (Korea)
    ];
  }

  /**
   * Transcribe audio from a blob
   * Note: This is a placeholder. Browser-based speech recognition
   * typically doesn't support transcribing audio files directly.
   * For audio file transcription, you would need a server-side solution
   * or a third-party API that supports audio file uploads.
   */
  static async transcribeAudio(audioBlob: Blob): Promise<TranscriptionResult> {
    console.warn('Audio file transcription is not supported in the browser. This is a placeholder.');
    
    // For now, return a mock result
    return {
      transcript: 'This is a placeholder transcription. For real audio transcription, you would need a server-side solution.',
      segments: [
        {
          id: uuidv4(),
          transcriptId: '',
          speaker: 'System',
          startTime: 0,
          endTime: 5,
          text: 'This is a placeholder transcription.',
        },
      ],
      isFinal: true,
    };
  }

  /**
   * Clean up resources
   */
  static cleanup(): void {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
      }
      this.recognition = null;
    }
    
    this.isRecognizing = false;
    this.finalTranscript = '';
    this.interimTranscript = '';
    this.segments = [];
    this.currentSegment = null;
    this.startTime = null;
    this.onResultCallback = null;
    this.onErrorCallback = null;
    this.onEndCallback = null;
  }
}

export default TranscriptionService;
