import { useRef, useState } from 'react';
import { MessageSquare, Send, ShieldAlert, Sparkles } from 'lucide-react';
import type {
  ChatResponse,
  ChatTurn,
  CityLocation,
  HouseholdProfile,
} from '../../shared/types.js';
import { sendAdvisorChatApi } from '../lib/apiClient.js';

interface AdvisorChatProps {
  location: CityLocation;
  profile: HouseholdProfile;
  currentAqi?: number;
}

interface RichMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  keyTakeaways?: string[];
  impactHighlight?: string;
  engine?: ChatResponse['engine'];
}

const QUICK_PROMPTS = [
  'Is it safe for my kids to play outside today, and when is the cleanest window?',
  'How do I build an affordable DIY air purifier for a winter bedroom?',
  'When should I open windows and how do I reduce gas stove indoor pollution?',
  'Draft a short winter smog alert & carpool message for my apartment WhatsApp group.',
];

export function AdvisorChat({ location, profile, currentAqi }: AdvisorChatProps) {
  const [messages, setMessages] = useState<RichMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hi! I'm AirShield AI. Ask me anything about navigating winter smog in ${location.name}, indoor air hacks, mask fit, cooking ventilation, or organizing low-emission community habits. Every answer is grounded in your live AQI and household profile.`,
    },
  ]);
  const nextIdRef = useRef(1);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitQuestion(rawText: string): Promise<void> {
    const trimmed = rawText.trim();
    if (trimmed.length < 2 || sending) return;

    nextIdRef.current += 1;
    const userMsg: RichMessage = {
      id: `user-${nextIdRef.current}`,
      role: 'user',
      content: trimmed,
    };

    const history: ChatTurn[] = messages
      .filter((m) => m.id !== 'welcome')
      .slice(-6)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setError(null);
    setSending(true);

    try {
      const response = await sendAdvisorChatApi({
        location,
        profile,
        message: trimmed,
        history,
      });

      nextIdRef.current += 1;
      const assistantMsg: RichMessage = {
        id: `ai-${nextIdRef.current}`,
        role: 'assistant',
        content: response.reply,
        keyTakeaways: response.keyTakeaways,
        impactHighlight: response.impactHighlight,
        engine: response.engine,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get response');
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="card" aria-labelledby="advisor-chat-heading">
      <div className="card-header">
        <div>
          <h2 id="advisor-chat-heading" className="card-title">
            <MessageSquare size={20} aria-hidden="true" />
            Ask AirShield AI Advisor
          </h2>
          <p className="card-subtitle">
            Context-aware Q&amp;A grounded in {location.name}
            {currentAqi !== undefined ? ` (US AQI ${currentAqi})` : ''} and your{' '}
            {profile.householdSize}-person household profile.
          </p>
        </div>
      </div>

      <div
        className="chip-row"
        role="group"
        aria-label="Suggested air quality questions"
        style={{ marginBottom: '0.9rem' }}
      >
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            className="chip"
            disabled={sending}
            onClick={() => submitQuestion(prompt)}
          >
            {prompt}
          </button>
        ))}
      </div>

      <div
        className="chat-log"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Conversation with AirShield AI"
      >
        {messages.map((msg) => (
          <div key={msg.id} className={`chat-bubble ${msg.role}`}>
            <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>

            {msg.keyTakeaways && msg.keyTakeaways.length > 0 && (
              <ul
                style={{
                  margin: '0.6rem 0 0',
                  paddingLeft: '1.15rem',
                  fontSize: '0.84rem',
                  color: 'var(--text-secondary)',
                }}
              >
                {msg.keyTakeaways.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            )}

            {msg.impactHighlight && (
              <div
                style={{
                  marginTop: '0.6rem',
                  padding: '0.5rem 0.65rem',
                  borderRadius: '6px',
                  background: 'var(--brand-soft)',
                  color: 'var(--brand)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                }}
              >
                <Sparkles size={13} aria-hidden="true" style={{ verticalAlign: 'middle' }} />{' '}
                Direct Impact: {msg.impactHighlight}
              </div>
            )}
          </div>
        ))}

        {sending && (
          <div className="chat-bubble assistant" aria-busy="true">
            Analyzing live air quality &amp; household profile...
          </div>
        )}
      </div>

      {error && (
        <div className="error-box" role="alert" style={{ marginTop: '0.75rem' }}>
          {error}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitQuestion(input);
        }}
        style={{ display: 'flex', gap: '0.6rem', marginTop: '0.85rem' }}
      >
        <label htmlFor="advisor-chat-input" className="sr-only">
          Ask AirShield AI a question about winter smog, indoor air quality, or low-emission habits
        </label>
        <input
          id="advisor-chat-input"
          type="text"
          className="input"
          maxLength={600}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about safe play hours, DIY HEPA box fans, masks, carpooling, or school protocols..."
          disabled={sending}
        />
        <button type="submit" className="btn btn-primary" disabled={sending || input.trim().length < 2}>
          <Send size={16} aria-hidden="true" />
          Send
        </button>
      </form>

      <p className="disclaimer-note">
        <ShieldAlert size={13} aria-hidden="true" style={{ verticalAlign: 'text-bottom' }} />{' '}
        Protected with server-side input sanitization and prompt-injection guardrails. Educational
        guidance only — consult a clinician for acute respiratory distress.
      </p>
    </section>
  );
}
