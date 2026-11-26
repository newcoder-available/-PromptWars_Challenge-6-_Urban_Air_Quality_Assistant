import { Sparkles } from 'lucide-react';
import type { ChatResponse } from '../../shared/types.js';

export interface RichChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  keyTakeaways?: string[];
  impactHighlight?: string;
  engine?: ChatResponse['engine'];
}

interface ChatMessageBubbleProps {
  message: RichChatMessage;
}

/**
 * Renders a single user or assistant chat message with optional takeaways and impact badge.
 */
export function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  return (
    <div className={`chat-bubble ${message.role}`}>
      <div className="chat-text-pre">{message.content}</div>

      {message.keyTakeaways && message.keyTakeaways.length > 0 && (
        <ul className="chat-takeaways">
          {message.keyTakeaways.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      )}

      {message.impactHighlight && (
        <div className="chat-impact-badge">
          <Sparkles size={13} aria-hidden="true" className="inline-icon-mid" /> Direct Impact:{' '}
          {message.impactHighlight}
        </div>
      )}
    </div>
  );
}
