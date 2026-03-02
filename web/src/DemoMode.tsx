import { useState, useEffect, useRef, useCallback } from 'react';
import { startConversation, sendMessage } from './api';

/* ─── Types ─── */
interface DemoScenario {
  time: string;
  title: string;
  icon: string;
  userMessage: string;
  annotation: string;
}

interface ChatBubble {
  id: string;
  role: 'user' | 'bot';
  text: string;
}

type ScenarioPhase = 'idle' | 'typing-user' | 'sent-user' | 'typing-bot' | 'done';

/* ─── Scenarios ─── */
const SCENARIOS: DemoScenario[] = [
  {
    time: '9:00 AM',
    title: 'Morning Opening',
    icon: '🌅',
    userMessage: 'Good morning Ramu Kaka, aaj ka status batao',
    annotation:
      '🧠 AI pulls real-time weather data + festival calendar to generate proactive suggestions',
  },
  {
    time: '10:00 AM',
    title: 'Stock Depletion Report',
    icon: '📋',
    userMessage: 'Bread aur doodh khatam ho gaya, note kar lo',
    annotation:
      '📝 Voice command → intent classification → inventory update → supplier alert, all in one step',
  },
  {
    time: '11:00 AM',
    title: 'Smart Price Discovery',
    icon: '💰',
    userMessage: 'Parle-G ka sabse sasta rate batao, 10 carton chahiye',
    annotation:
      '💰 Multi-supplier comparison with MOQ, delivery time & reliability scoring',
  },
  {
    time: '2:00 PM',
    title: 'Velocity Alert + Restock',
    icon: '🔥',
    userMessage: 'Cold drinks bhi khatam ho gaye, garmi bahut hai aaj',
    annotation:
      '🔥 AI detects this is the 2nd stockout today + hot weather = surge demand. Proactively suggests bulk order.',
  },
  {
    time: '6:00 PM',
    title: 'End of Day Summary',
    icon: '📊',
    userMessage: 'Aaj ka final summary bhejo, kal distributor aane wala hai',
    annotation:
      '📊 Structured restock list grouped by distributor type AND urgency (Daily/Weekly/Monthly), ready to share on WhatsApp',
  },
];

/* ─── Helpers ─── */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function DemoMode() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<ScenarioPhase>('idle');
  const [bubbles, setBubbles] = useState<ChatBubble[]>([]);
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const scenarioRunning = useRef(false);

  /* Auto-scroll */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [bubbles, phase]);

  /* Bootstrap conversation once */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await startConversation('store-001', 'hi');
        if (cancelled) return;
        setConversationId(data.conversationId);
        setConnecting(false);
      } catch (err) {
        if (cancelled) return;
        console.error('Demo: failed to start conversation', err);
        setError('Could not connect to the API. Please try again.');
        setConnecting(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /* Run a scenario */
  const runScenario = useCallback(
    async (index: number) => {
      if (!conversationId || scenarioRunning.current) return;
      scenarioRunning.current = true;
      const scenario = SCENARIOS[index];

      // Phase 1: show user typing
      setPhase('typing-user');
      await sleep(1200);

      // Phase 2: show user bubble
      const userBubble: ChatBubble = {
        id: `user-${index}-${Date.now()}`,
        role: 'user',
        text: scenario.userMessage,
      };
      setBubbles((prev) => [...prev, userBubble]);
      setPhase('sent-user');
      await sleep(600);

      // Phase 3: show bot typing
      setPhase('typing-bot');

      try {
        const resp = await sendMessage(conversationId, scenario.userMessage);
        // Add a small min-delay so the typing indicator is visible
        await sleep(800);

        const botBubble: ChatBubble = {
          id: `bot-${index}-${Date.now()}`,
          role: 'bot',
          text: resp.response || 'कोई उत्तर नहीं मिला।',
        };
        setBubbles((prev) => [...prev, botBubble]);
      } catch (err) {
        console.error('Demo send error', err);
        const botBubble: ChatBubble = {
          id: `bot-err-${index}-${Date.now()}`,
          role: 'bot',
          text: '⚠️ API response could not be loaded. This would normally show Ramu Kaka\'s intelligent response.',
        };
        setBubbles((prev) => [...prev, botBubble]);
      }

      setPhase('done');
      scenarioRunning.current = false;
    },
    [conversationId],
  );

  /* Auto-run first scenario once connected */
  useEffect(() => {
    if (conversationId && currentIndex === 0 && phase === 'idle') {
      runScenario(0);
    }
  }, [conversationId, currentIndex, phase, runScenario]);

  /* Next handler */
  const handleNext = () => {
    const nextIdx = currentIndex + 1;
    if (nextIdx >= SCENARIOS.length) return;
    setCurrentIndex(nextIdx);
    runScenario(nextIdx);
  };

  /* Exit demo */
  const exitDemo = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('demo');
    window.location.href = url.toString();
  };

  const scenario = SCENARIOS[currentIndex];
  const progress = ((currentIndex + (phase === 'done' ? 1 : 0.5)) / SCENARIOS.length) * 100;
  const isLastDone = currentIndex === SCENARIOS.length - 1 && phase === 'done';

  return (
    <div className="demo-root">
      {/* ─── Header ─── */}
      <header className="demo-header">
        <div className="demo-header-top">
          <h1 className="demo-title">🎬 Live Demo — A Day with Ramu Kaka</h1>
          <button className="demo-exit-btn" onClick={exitDemo}>✕ Exit</button>
        </div>
        <p className="demo-subtitle">Watch how AI transforms kirana store procurement</p>
        {/* Progress */}
        <div className="demo-progress-bar">
          <div className="demo-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="demo-progress-text">
          Scenario {currentIndex + 1} of {SCENARIOS.length}
        </div>
      </header>

      {/* ─── Scenario Card ─── */}
      <div className="demo-scenario-card" key={currentIndex}>
        <div className="demo-time-badge">{scenario.icon} {scenario.time}</div>
        <h2 className="demo-scenario-title">{scenario.title}</h2>
      </div>

      {/* ─── Chat Area ─── */}
      <div className="demo-chat-area">
        <div className="demo-chat-scroll">
          {bubbles.map((b) => (
            <div key={b.id} className={`demo-bubble demo-bubble-${b.role}`}>
              <div className="demo-bubble-label">
                {b.role === 'user' ? '🏪 Ramesh (Shopkeeper)' : '🤖 Ramu Kaka (AI)'}
              </div>
              <div className="demo-bubble-text">{b.text}</div>
            </div>
          ))}

          {/* Typing indicators */}
          {phase === 'typing-user' && (
            <div className="demo-bubble demo-bubble-user demo-bubble-typing">
              <div className="demo-bubble-label">🏪 Ramesh (Shopkeeper)</div>
              <div className="demo-typing-dots">
                <span /><span /><span />
              </div>
            </div>
          )}
          {phase === 'typing-bot' && (
            <div className="demo-bubble demo-bubble-bot demo-bubble-typing">
              <div className="demo-bubble-label">🤖 Ramu Kaka (AI)</div>
              <div className="demo-typing-dots">
                <span /><span /><span />
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* ─── Annotation ─── */}
      {phase === 'done' && (
        <div className="demo-annotation" key={`ann-${currentIndex}`}>
          <div className="demo-annotation-inner">{scenario.annotation}</div>
        </div>
      )}

      {/* ─── Footer / Controls ─── */}
      <footer className="demo-footer">
        {connecting && (
          <div className="demo-connecting">
            <div className="demo-spinner" />
            Connecting to Ramu Kaka API…
          </div>
        )}
        {error && <div className="demo-error">{error}</div>}

        {phase === 'done' && !isLastDone && (
          <button className="demo-next-btn" onClick={handleNext}>
            Next Scenario →
          </button>
        )}

        {isLastDone && (
          <div className="demo-finale">
            <p className="demo-finale-text">🏆 Demo Complete!</p>
            <button className="demo-try-btn" onClick={exitDemo}>
              🚀 Try it yourself!
            </button>
          </div>
        )}
      </footer>

      {/* ─── Styles ─── */}
      <style>{`
        /* ===== ROOT ===== */
        .demo-root {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: #0a0a0a;
          color: #f0f0f0;
          font-family: 'Noto Sans Devanagari', 'Inter', system-ui, sans-serif;
          overflow: hidden;
        }

        /* ===== HEADER ===== */
        .demo-header {
          padding: 1rem 1.5rem 0.6rem;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-bottom: 2px solid #FF9933;
          flex-shrink: 0;
        }
        .demo-header-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .demo-title {
          font-size: 1.3rem;
          font-weight: 700;
          background: linear-gradient(90deg, #FF9933, #fff, #138808);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .demo-exit-btn {
          background: rgba(255,255,255,0.08);
          border: 1px solid #444;
          color: #aaa;
          border-radius: 8px;
          padding: 0.3rem 0.8rem;
          cursor: pointer;
          font-size: 0.8rem;
          transition: all 0.2s;
        }
        .demo-exit-btn:hover {
          border-color: #FF9933;
          color: #FF9933;
        }
        .demo-subtitle {
          color: #888;
          font-size: 0.85rem;
          margin-top: 0.25rem;
        }
        .demo-progress-bar {
          margin-top: 0.6rem;
          height: 4px;
          background: #2a2a3e;
          border-radius: 2px;
          overflow: hidden;
        }
        .demo-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #FF9933, #138808);
          border-radius: 2px;
          transition: width 0.5s ease;
        }
        .demo-progress-text {
          text-align: right;
          font-size: 0.7rem;
          color: #666;
          margin-top: 0.2rem;
          padding-bottom: 0.2rem;
        }

        /* ===== SCENARIO CARD ===== */
        .demo-scenario-card {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          padding: 0.8rem 1.5rem;
          background: #141425;
          border-bottom: 1px solid #2a2a4a;
          animation: demo-slideDown 0.4s ease;
          flex-shrink: 0;
        }
        @keyframes demo-slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .demo-time-badge {
          background: linear-gradient(135deg, #FF9933 0%, #e68a2e 100%);
          color: #fff;
          font-weight: 700;
          font-size: 0.8rem;
          padding: 0.35rem 0.7rem;
          border-radius: 20px;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .demo-scenario-title {
          font-size: 1.05rem;
          font-weight: 600;
          color: #f0f0f0;
        }

        /* ===== CHAT ===== */
        .demo-chat-area {
          flex: 1;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .demo-chat-scroll {
          flex: 1;
          overflow-y: auto;
          padding: 1rem 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          scroll-behavior: smooth;
        }
        .demo-chat-scroll::-webkit-scrollbar { width: 5px; }
        .demo-chat-scroll::-webkit-scrollbar-thumb { background: #2a2a4a; border-radius: 3px; }

        /* Bubbles */
        .demo-bubble {
          max-width: 85%;
          padding: 0.6rem 1rem;
          border-radius: 16px;
          font-size: 0.95rem;
          line-height: 1.55;
          word-wrap: break-word;
          white-space: pre-wrap;
          animation: demo-fadeUp 0.35s ease;
        }
        @keyframes demo-fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .demo-bubble-user {
          align-self: flex-end;
          background: #1e40af;
          color: #fff;
          border-bottom-right-radius: 4px;
        }
        .demo-bubble-bot {
          align-self: flex-start;
          background: #2a2a3e;
          color: #f0f0f0;
          border-bottom-left-radius: 4px;
          border-left: 3px solid #FF9933;
        }
        .demo-bubble-label {
          font-size: 0.7rem;
          color: #888;
          margin-bottom: 0.25rem;
          font-weight: 600;
        }
        .demo-bubble-text {
          white-space: pre-wrap;
        }

        /* Typing dots */
        .demo-bubble-typing {
          min-width: 100px;
        }
        .demo-typing-dots {
          display: flex;
          gap: 5px;
          align-items: center;
          padding: 0.3rem 0;
        }
        .demo-typing-dots span {
          width: 8px;
          height: 8px;
          background: #888;
          border-radius: 50%;
          animation: demo-dotBounce 1.2s infinite;
        }
        .demo-typing-dots span:nth-child(2) { animation-delay: 0.2s; }
        .demo-typing-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes demo-dotBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }

        /* ===== ANNOTATION ===== */
        .demo-annotation {
          flex-shrink: 0;
          padding: 0 1.5rem;
          animation: demo-fadeUp 0.4s ease;
        }
        .demo-annotation-inner {
          background: linear-gradient(135deg, rgba(19,136,8,0.15) 0%, rgba(255,153,51,0.10) 100%);
          border: 1px solid rgba(255,153,51,0.3);
          border-radius: 12px;
          padding: 0.7rem 1rem;
          font-size: 0.85rem;
          color: #ccc;
          line-height: 1.5;
        }

        /* ===== FOOTER ===== */
        .demo-footer {
          flex-shrink: 0;
          padding: 0.8rem 1.5rem 1.2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.6rem;
        }
        .demo-connecting {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #FF9933;
          font-size: 0.9rem;
        }
        .demo-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid #FF9933;
          border-top-color: transparent;
          border-radius: 50%;
          animation: demo-spin 0.8s linear infinite;
        }
        @keyframes demo-spin {
          to { transform: rotate(360deg); }
        }
        .demo-error {
          color: #ef4444;
          font-size: 0.85rem;
          text-align: center;
        }
        .demo-next-btn {
          background: linear-gradient(90deg, #FF9933, #e68a2e);
          color: #fff;
          border: none;
          border-radius: 12px;
          padding: 0.75rem 2rem;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 4px 20px rgba(255,153,51,0.3);
        }
        .demo-next-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 24px rgba(255,153,51,0.45);
        }

        /* Finale */
        .demo-finale {
          text-align: center;
          animation: demo-fadeUp 0.5s ease;
        }
        .demo-finale-text {
          font-size: 1.4rem;
          font-weight: 700;
          margin-bottom: 0.6rem;
          background: linear-gradient(90deg, #FF9933, #fff, #138808);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .demo-try-btn {
          background: linear-gradient(90deg, #138808, #1ba30e);
          color: #fff;
          border: none;
          border-radius: 12px;
          padding: 0.85rem 2.5rem;
          font-size: 1.1rem;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 4px 20px rgba(19,136,8,0.35);
        }
        .demo-try-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 24px rgba(19,136,8,0.5);
        }

        /* ===== Responsive ===== */
        @media (max-width: 600px) {
          .demo-header { padding: 0.7rem 1rem 0.5rem; }
          .demo-title { font-size: 1rem; }
          .demo-subtitle { font-size: 0.75rem; }
          .demo-scenario-card { padding: 0.6rem 1rem; }
          .demo-chat-scroll { padding: 0.75rem 1rem; }
          .demo-annotation { padding: 0 1rem; }
          .demo-footer { padding: 0.6rem 1rem 1rem; }
        }
      `}</style>
    </div>
  );
}
