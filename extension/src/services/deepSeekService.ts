/**
 * DeepSeek AI Service
 * 
 * This service handles all interactions with the DeepSeek AI API
 * for generating meeting summaries, action items, and decisions.
 */

import { Summary, ActionItem, TranscriptSegment } from '../types/types';
import { DEEPSEEK_API_URL, DEEPSEEK_MODELS } from '../utils/constants';

export interface DeepSeekRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
}

export interface DeepSeekResponse {
  id: string;
  model: string;
  created: number;
  content: string;
  finish_reason: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface MeetingSummaryRequest {
  transcript: string;
  segments?: TranscriptSegment[];
  meetingTitle?: string;
  participants?: string[];
  language?: string;
}

export interface ActionItemRequest {
  transcript: string;
  segments?: TranscriptSegment[];
  meetingTitle?: string;
  language?: string;
}

export class DeepSeekService {
  private static apiKey: string | null = null;
  private static apiUrl: string = DEEPSEEK_API_URL;

  /**
   * Initialize the service with an API key
   */
  static initialize(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * Check if the service is configured
   */
  static isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Generate a meeting summary using DeepSeek
   */
  static async generateSummary(request: MeetingSummaryRequest): Promise<Partial<Summary>> {
    try {
      // For now, return a mock summary
      // In a real implementation, you would call the DeepSeek API
      return this.generateMockSummary(request);
    } catch (error) {
      console.error('Error generating summary:', error);
      throw error;
    }
  }

  /**
   * Extract action items from transcript
   */
  static async extractActionItems(request: ActionItemRequest): Promise<ActionItem[]> {
    try {
      // For now, return mock action items
      // In a real implementation, you would call the DeepSeek API
      return this.extractMockActionItems(request);
    } catch (error) {
      console.error('Error extracting action items:', error);
      throw error;
    }
  }

  /**
   * Extract decisions from transcript
   */
  static async extractDecisions(transcript: string, segments?: TranscriptSegment[]): Promise<string[]> {
    try {
      // For now, return mock decisions
      // In a real implementation, you would call the DeepSeek API
      return this.extractMockDecisions(transcript, segments);
    } catch (error) {
      console.error('Error extracting decisions:', error);
      throw error;
    }
  }

  /**
   * Answer a question about the meeting
   */
  static async answerQuestion(question: string, transcript: string, segments?: TranscriptSegment[]): Promise<string> {
    try {
      // For now, return a mock answer
      // In a real implementation, you would call the DeepSeek API
      return this.generateMockAnswer(question, transcript, segments);
    } catch (error) {
      console.error('Error answering question:', error);
      throw error;
    }
  }

  /**
   * Call the DeepSeek API
   * This is a generic method for calling the API
   */
  private static async callAPI(request: DeepSeekRequest): Promise<DeepSeekResponse> {
    if (!this.apiKey) {
      throw new Error('DeepSeek API key not configured');
    }

    try {
      const response = await fetch(`${this.apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('DeepSeek API error:', error);
      throw error;
    }
  }

  /**
   * Generate a mock summary for demonstration purposes
   */
  private static generateMockSummary(request: MeetingSummaryRequest): Partial<Summary> {
    const { transcript, meetingTitle, participants } = request;
    
    // Simple keyword-based analysis
    const text = transcript.toLowerCase();
    
    const keyPoints: string[] = [];
    const decisions: string[] = [];
    const openQuestions: string[] = [];
    const importantTopics: string[] = [];
    
    // Extract key points based on common patterns
    if (text.includes('discuss') || text.includes('talk about') || text.includes('review')) {
      keyPoints.push('Reviewed project status and next steps');
    }
    
    if (text.includes('decide') || text.includes('agree') || text.includes('finalize')) {
      decisions.push('Finalized project timeline and deliverables');
    }
    
    if (text.includes('question') || text.includes('concern') || text.includes('issue')) {
      openQuestions.push('Addressed concerns about budget allocation');
    }
    
    if (text.includes('launch') || text.includes('release') || text.includes('deploy')) {
      importantTopics.push('Product Launch');
    }
    
    if (text.includes('budget') || text.includes('cost') || text.includes('price')) {
      importantTopics.push('Budget Planning');
    }
    
    if (text.includes('timeline') || text.includes('schedule') || text.includes('deadline')) {
      importantTopics.push('Project Timeline');
    }
    
    // Generate executive summary
    const meetingDescription = meetingTitle || 'the meeting';
    const participantText = participants?.length ? ` with ${participants.join(', ')}` : '';
    
    const executiveSummary = `
      This meeting${participantText} discussed ${keyPoints.join(', ') || 'various topics'}.
      ${decisions.length > 0 ? `Key decisions included ${decisions.join(', ')}.` : ''}
      ${openQuestions.length > 0 ? `Open questions include ${openQuestions.join(', ')}.` : ''}
    `.trim();

    return {
      executiveSummary,
      keyPoints: keyPoints.length > 0 ? keyPoints : ['Meeting discussion points were captured'],
      decisions: decisions.length > 0 ? decisions : ['No specific decisions were recorded'],
      openQuestions: openQuestions.length > 0 ? openQuestions : ['No open questions were identified'],
      importantTopics: importantTopics.length > 0 ? importantTopics : ['General Discussion'],
    };
  }

  /**
   * Extract mock action items for demonstration purposes
   */
  private static extractMockActionItems(request: ActionItemRequest): ActionItem[] {
    const { transcript, meetingTitle } = request;
    const text = transcript.toLowerCase();
    
    const actionItems: ActionItem[] = [];
    
    // Pattern: "[Person] will [action]"
    const personActionPattern = /(\w+)\s+will\s+([a-z\s]+)/gi;
    const matches = text.matchAll(personActionPattern);
    
    for (const match of matches) {
      const owner = match[1];
      const task = match[2].trim();
      
      actionItems.push({
        id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        meetingId: '', // Will be set later
        task: task.charAt(0).toUpperCase() + task.slice(1),
        owner: owner.charAt(0).toUpperCase() + owner.slice(1),
        status: 'open',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    
    // Pattern: "need to [action]"
    const needPattern = /need\s+to\s+([a-z\s]+)/gi;
    const needMatches = text.matchAll(needPattern);
    
    for (const match of needMatches) {
      const task = match[1].trim();
      
      actionItems.push({
        id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        meetingId: '',
        task: task.charAt(0).toUpperCase() + task.slice(1),
        owner: 'Not specified',
        status: 'open',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    
    // If no action items found, add a placeholder
    if (actionItems.length === 0) {
      actionItems.push({
        id: `ai-${Date.now()}`,
        meetingId: '',
        task: 'Follow up on meeting discussion',
        owner: 'Not specified',
        status: 'open',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    
    return actionItems;
  }

  /**
   * Extract mock decisions for demonstration purposes
   */
  private static extractMockDecisions(transcript: string, segments?: TranscriptSegment[]): string[] {
    const text = transcript.toLowerCase();
    const decisions: string[] = [];
    
    // Pattern: "we decided to [action]"
    const decidedPattern = /we\s+decided\s+to\s+([a-z\s]+)/gi;
    const matches = text.matchAll(decidedPattern);
    
    for (const match of matches) {
      decisions.push(`Decided to ${match[1].trim()}`);
    }
    
    // Pattern: "agreed that [statement]"
    const agreedPattern = /agreed\s+that\s+([a-z\s]+)/gi;
    const agreedMatches = text.matchAll(agreedPattern);
    
    for (const match of agreedMatches) {
      decisions.push(`Agreed that ${match[1].trim()}`);
    }
    
    // Pattern: "finalized [something]"
    const finalizedPattern = /finalized\s+([a-z\s]+)/gi;
    const finalizedMatches = text.matchAll(finalizedPattern);
    
    for (const match of finalizedMatches) {
      decisions.push(`Finalized ${match[1].trim()}`);
    }
    
    if (decisions.length === 0) {
      decisions.push('No specific decisions were recorded');
    }
    
    return decisions;
  }

  /**
   * Generate a mock answer for demonstration purposes
   */
  private static generateMockAnswer(question: string, transcript: string, segments?: TranscriptSegment[]): string {
    const text = transcript.toLowerCase();
    const q = question.toLowerCase();
    
    // Simple question answering based on keywords
    if (q.includes('decide') || q.includes('decision')) {
      if (text.includes('decide') || text.includes('agree') || text.includes('finalize')) {
        return 'The team made several decisions during the meeting, including finalizing the project timeline and approving the budget.';
      }
      return 'No specific decisions were mentioned in this meeting.';
    }
    
    if (q.includes('action') || q.includes('task') || q.includes('todo')) {
      if (text.includes('need to') || text.includes('will') || text.includes('should')) {
        return 'Action items include preparing the launch plan, completing testing, and reviewing the budget.';
      }
      return 'No specific action items were identified in this meeting.';
    }
    
    if (q.includes('who') || q.includes('responsible') || q.includes('owner')) {
      if (text.includes('john') || text.includes('sarah') || text.includes('james')) {
        return 'John is responsible for the marketing campaign, Sarah is handling the launch plan, and James is managing the testing.';
      }
      return 'No specific owners were mentioned in this meeting.';
    }
    
    if (q.includes('when') || q.includes('deadline') || q.includes('date')) {
      if (text.includes('november') || text.includes('december') || text.includes('2026')) {
        return 'The next deadline is November 18, 2026.';
      }
      return 'No specific deadlines were mentioned in this meeting.';
    }
    
    if (q.includes('summary') || q.includes('overall') || q.includes('what happened')) {
      return 'This meeting covered project updates, budget review, and timeline adjustments. The team made progress on key deliverables and identified next steps.';
    }
    
    if (q.includes('pricing') || q.includes('cost') || q.includes('budget')) {
      if (text.includes('pricing') || text.includes('budget') || text.includes('cost')) {
        return 'The meeting discussed budget allocation and pricing strategy for the upcoming product launch.';
      }
      return 'Pricing was not discussed in this meeting.';
    }
    
    // Default response
    return "I couldn't find that information in this meeting.";
  }
}

export default DeepSeekService;
