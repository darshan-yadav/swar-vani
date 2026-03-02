import { useState, useEffect, useRef, useCallback } from 'react';
import { startConversation, sendMessage, sendAudio, getInventory, getProductName, type InventoryItem } from './api';
import OndcDashboard from './OndcDashboard';

type TabId = 'chat' | 'inventory' | 'ondc';

interface ChatMessage {
  id: string;
  role: 'user' | 'bot' | 'system';
  text: string;
  isSummary?: boolean;
  isCritical?: boolean;
}

const QUICK_ACTIONS = [
  { label: '📦 Stock check', text: 'Kaunsa stock kam hai?' },
  { label: '💰 Price compare', text: 'Parle-G ka rate batao' },
  { label: '🛒 Place order', text: 'Order lagana hai' },
  { label: '📋 Summary', text: 'Summary batao, kal distributor aane wala hai' },
  { label: '🌤️ Weather tips', text: 'Aaj mausam kaisa hai, kya extra rakhna chahiye?' },
];

// Acoustic feedback — play "noted" sound on command acknowledgment
const playAckSound = () => {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    gain.gain.value = 0.15;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.stop(ctx.currentTime + 0.15);
  } catch {}
};

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [language, setLanguage] = useState('hi');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [voiceState, setVoiceState] = useState<'idle' | 'recording' | 'processing'>('idle');
  const [shareText, setShareText] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const conversationIdRef = useRef<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, loading, scrollToBottom]);
  useEffect(() => { conversationIdRef.current = conversationId; }, [conversationId]);

  // Start conversation
  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        setConnectionStatus('connecting');
        const data = await startConversation('store-001', language);
        if (cancelled) return;
        setConversationId(data.conversationId);
        setConnectionStatus('connected');

        let welcomeText = 'नमस्ते! मैं रामू काका हूँ। आज क्या करना है?';
        if (data.messages && data.messages.length > 0) {
          welcomeText = data.messages[data.messages.length - 1].text;
        } else if (data.message) {
          welcomeText = data.message;
        }

        setMessages([{ id: 'welcome', role: 'bot', text: welcomeText }]);
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to start conversation:', err);
        setConnectionStatus('error');
        setMessages([{ id: 'error', role: 'system', text: '⚠️ Could not connect to Ramu Kaka. Retrying...' }]);
        setTimeout(() => { if (!cancelled) init(); }, 3000);
      }
    }
    init();
    return () => { cancelled = true; };
  }, [language]);

  // Load inventory
  useEffect(() => {
    let cancelled = false;
    async function loadInventory() {
      try {
        setInventoryLoading(true);
        const items = await getInventory('store-001');
        if (cancelled) return;
        setInventory(items);
        setInventoryError('');
      } catch (_err) {
        if (cancelled) return;
        setInventoryError('Could not load inventory');
      } finally {
        if (!cancelled) setInventoryLoading(false);
      }
    }
    loadInventory();
    return () => { cancelled = true; };
  }, []);

  const isSummaryResponse = (text: string): boolean => {
    return text.includes('समरी') || text.includes('summary') || text.includes('रीस्टॉक') || text.includes('लिस्ट') || text.length > 300;
  };

  const isCriticalResponse = (text: string): boolean => {
    return text.includes('खत्म') || text.includes('khatam') || text.includes('0') || text.includes('finished') || text.includes('CRITICAL');
  };

  const doSend = useCallback(async (msgText: string) => {
    const cId = conversationIdRef.current;
    if (!cId) return;

    const userMsg: ChatMessage = { id: 'user-' + Date.now(), role: 'user', text: msgText };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const data = await sendMessage(cId, msgText);
      const responseText = data.response || 'कोई उत्तर नहीं मिला।';

      // Play acoustic feedback
      playAckSound();

      const botMsg: ChatMessage = {
        id: 'bot-' + Date.now(),
        role: 'bot',
        text: responseText,
        isSummary: isSummaryResponse(responseText),
        isCritical: isCriticalResponse(responseText),
      };
      setMessages(prev => [...prev, botMsg]);

      // Refresh inventory after commands that might change stock
      if (msgText.toLowerCase().includes('khatam') || msgText.toLowerCase().includes('finished') || msgText.toLowerCase().includes('note') || msgText.toLowerCase().includes('update')) {
        try {
          const items = await getInventory('store-001');
          setInventory(items);
        } catch {}
      }
    } catch (err) {
      console.error('Send error:', err);
      setMessages(prev => [...prev, { id: 'err-' + Date.now(), role: 'system', text: '⚠️ Message failed. Please try again.' }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, []);

  const handleSend = useCallback(() => {
    const msgText = input.trim();
    if (!msgText || !conversationId || loading) return;
    setInput('');
    doSend(msgText);
  }, [input, conversationId, loading, doSend]);

  const handleQuickAction = useCallback((text: string) => {
    if (!conversationId || loading) return;
    setSidebarOpen(false);
    doSend(text);
  }, [conversationId, loading, doSend]);

  // ─── Voice ───
  const startRecording = useCallback(async () => {
    const cId = conversationIdRef.current;
    if (!cId || loading || voiceState !== 'idle') return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Immediate acoustic feedback — "I'm listening"
      playAckSound();

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm',
      });

      audioChunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size < 100) { setVoiceState('idle'); return; }

        setVoiceState('processing');

        try {
          const data = await sendAudio(cId, audioBlob, language);

          if (data.transcribedText) {
            setMessages(prev => [...prev, { id: 'user-voice-' + Date.now(), role: 'user', text: '🎤 ' + data.transcribedText }]);
          }

          playAckSound();

          const botMsg: ChatMessage = {
            id: 'bot-voice-' + Date.now(),
            role: 'bot',
            text: data.response,
            isSummary: isSummaryResponse(data.response),
            isCritical: isCriticalResponse(data.response),
          };
          setMessages(prev => [...prev, botMsg]);

          if (data.audioUrl) {
            try { new Audio(data.audioUrl).play().catch(() => {}); } catch {}
          }

          // Refresh inventory
          try {
            const items = await getInventory('store-001');
            setInventory(items);
          } catch {}
        } catch (_err) {
          setMessages(prev => [...prev, { id: 'err-voice-' + Date.now(), role: 'system', text: '⚠️ Voice failed. Try again.' }]);
        } finally {
          setVoiceState('idle');
        }
      };

      mediaRecorder.start();
      setVoiceState('recording');
    } catch {
      setMessages(prev => [...prev, { id: 'err-mic-' + Date.now(), role: 'system', text: '⚠️ Microphone access denied. Please allow mic in browser settings.' }]);
      setVoiceState('idle');
    }
  }, [loading, voiceState]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && voiceState === 'recording') mediaRecorderRef.current.stop();
  }, [voiceState]);

  const handleMicClick = useCallback(() => {
    if (voiceState === 'idle') startRecording();
    else if (voiceState === 'recording') stopRecording();
  }, [voiceState, startRecording, stopRecording]);

  // ─── Share / Copy ───
  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setShareText('Copied!');
      setTimeout(() => setShareText(null), 2000);
    });
  }, []);

  const handleWhatsAppShare = useCallback((text: string) => {
    const clean = text.replace(/[*_~`]/g, '');
    window.open('https://wa.me/?text=' + encodeURIComponent('📦 Ramu Kaka — Restock List\n\n' + clean), '_blank');
  }, []);

  const getStockStatus = (item: InventoryItem): 'ok' | 'low' | 'out' => {
    const qty = item.stock ?? item.quantity ?? 0;
    if (qty <= 0) return 'out';
    if (item.lowStock) return 'low';
    if (item.reorderPoint && qty <= item.reorderPoint) return 'low';
    if (qty <= 5) return 'low';
    return 'ok';
  };

  const getQty = (item: InventoryItem): number => item.stock ?? item.quantity ?? 0;

  return (
    <>
      <header className="header">
        <div className="header-brand">
          <h1>🗣️ रामू काका</h1>
          <span className="tagline">Voice-first AI Procurement for Bharat</span>
        </div>
        <div className="header-right">
          <div className="connection-status">
            <div className={'connection-dot ' + connectionStatus} />
            {connectionStatus === 'connecting' && 'Connecting...'}
            {connectionStatus === 'connected' && 'Connected'}
            {connectionStatus === 'error' && 'Reconnecting...'}
          </div>
          <div className="store-info">
            <div className="store-name">🏪 Ramesh General Store</div>
            <div>Mumbai · store-001</div>
          </div>
          <select className="lang-select" value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="hi">हिन्दी</option>
            <option value="en">English</option>
            <option value="mr">मराठी</option>
          </select>
        </div>
      </header>

      {/* ── Tab Bar ── */}
      <nav className="tab-bar">
        <button
          className={'tab-item' + (activeTab === 'chat' ? ' active' : '')}
          onClick={() => setActiveTab('chat')}
        >
          🗣️ Chat
        </button>
        <button
          className={'tab-item' + (activeTab === 'inventory' ? ' active' : '')}
          onClick={() => setActiveTab('inventory')}
        >
          📦 Inventory
        </button>
        <button
          className={'tab-item' + (activeTab === 'ondc' ? ' active' : '')}
          onClick={() => setActiveTab('ondc')}
        >
          🏪 ONDC
        </button>
      </nav>

      {/* ── Tab Content ── */}
      {activeTab === 'chat' && (
        <>
          <div className="main-layout">
            <div className="chat-area">
              <div className="chat-messages">
                {messages.map(msg => (
                  <div key={msg.id} className={'message ' + msg.role + (msg.isSummary ? ' summary' : '') + (msg.isCritical ? ' critical' : '')}>
                    <div className="message-text">{msg.text}</div>
                    {msg.role === 'bot' && (msg.isSummary || msg.text.length > 150) && (
                      <div className="message-actions">
                        <button className="action-btn" onClick={() => handleCopy(msg.text)} title="Copy">📋</button>
                        <button className="action-btn" onClick={() => handleWhatsAppShare(msg.text)} title="Share on WhatsApp">📱</button>
                      </div>
                    )}
                  </div>
                ))}
                {loading && (
                  <div className="typing-indicator">
                    <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {shareText && <div className="share-toast">{shareText}</div>}

              <div className="chat-input-bar">
                <button
                  className={'btn-mic ' + voiceState}
                  onClick={handleMicClick}
                  disabled={!conversationId || (loading && voiceState === 'idle') || voiceState === 'processing'}
                  title={voiceState === 'idle' ? 'Boliye (Press to speak)' : voiceState === 'recording' ? 'Ruk jaiye (Press to stop)' : 'Processing...'}
                >
                  {voiceState === 'idle' && '🎤'}
                  {voiceState === 'recording' && <span className="recording-pulse">🔴</span>}
                  {voiceState === 'processing' && '⏳'}
                </button>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="रामू काका से बात करो... (Talk to Ramu Kaka)"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSend(); }}}
                  disabled={!conversationId || loading}
                />
                <button className="btn-send" onClick={handleSend} disabled={!input.trim() || !conversationId || loading} title="Send">➤</button>
              </div>
            </div>

            <div className={'sidebar-overlay ' + (sidebarOpen ? 'open' : '')} onClick={() => setSidebarOpen(false)} />

            <aside className={'sidebar ' + (sidebarOpen ? 'open' : '')}>
              <div className="sidebar-section">
                <h3>⚡ Quick Actions</h3>
                <div className="quick-actions">
                  {QUICK_ACTIONS.map(qa => (
                    <button key={qa.label} className="quick-action-btn" onClick={() => handleQuickAction(qa.text)} disabled={!conversationId || loading}>
                      {qa.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sidebar-section">
                <h3>📦 Live Inventory</h3>
                {inventoryLoading ? (
                  <div className="inventory-loading">Loading...</div>
                ) : inventoryError ? (
                  <div className="inventory-error">{inventoryError}</div>
                ) : inventory.length === 0 ? (
                  <div className="inventory-loading">No data</div>
                ) : (
                  <div className="inventory-list">
                    {[...inventory].sort((a, b) => getQty(a) - getQty(b)).map(item => {
                      const status = getStockStatus(item);
                      const qty = getQty(item);
                      return (
                        <div key={item.productId} className={'inventory-item ' + (status === 'out' || status === 'low' ? 'low-stock' : '')}>
                          <span className="item-name">{getProductName(item.productId)}</span>
                          <span className="item-qty">{qty}</span>
                          <span className={'status-badge ' + status}>
                            {status === 'ok' ? '✅' : status === 'low' ? '⚠️' : '🔴'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </aside>
          </div>

          <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? '✕' : '☰'}
          </button>
        </>
      )}

      {activeTab === 'inventory' && (
        <div className="inventory-tab">
          <div className="inventory-tab-header">
            <h2>📦 Live Inventory</h2>
            <span className="inventory-tab-count">
              {inventory.length} items
            </span>
          </div>
          {inventoryLoading ? (
            <div className="inventory-loading">Loading inventory...</div>
          ) : inventoryError ? (
            <div className="inventory-error">{inventoryError}</div>
          ) : inventory.length === 0 ? (
            <div className="inventory-loading">No inventory data</div>
          ) : (
            <div className="inventory-tab-grid">
              {[...inventory].sort((a, b) => getQty(a) - getQty(b)).map(item => {
                const status = getStockStatus(item);
                const qty = getQty(item);
                return (
                  <div key={item.productId} className={'inventory-tab-card ' + status}>
                    <div className="inv-card-name">{getProductName(item.productId)}</div>
                    <div className="inv-card-qty">{qty}</div>
                    <div className="inv-card-label">units in stock</div>
                    <span className={'status-badge ' + status}>
                      {status === 'ok' ? '✅ In Stock' : status === 'low' ? '⚠️ Low Stock' : '🔴 Out of Stock'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'ondc' && <OndcDashboard />}
    </>
  );
}

export default App;
