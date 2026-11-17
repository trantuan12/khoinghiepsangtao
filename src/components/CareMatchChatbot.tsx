import React, { useEffect, useRef, useState } from 'react';
import { Loader2, MessageCircle, RotateCcw, Send, Sparkles, X } from 'lucide-react';
import { API } from '@/lib/apiConfig';

export interface CareMatchChatMessage {
  id: string;
  sender: 'user' | 'bot';
  content: string;
  time: string;
  quickReplies?: string[];
  grounded?: boolean;
}

export interface CareMatchChatUserContext {
  userRole?: 'family' | 'caregiver' | 'admin' | 'guest';
  userId?: number | null;
  userName?: string;
}

const SYNC_EVENT = 'carematchai:messages_updated';

function getStorageKey(userId?: number | null, userRole?: string) {
  return `carematchai_chat_${userRole || 'guest'}_${userId || 'anon'}`;
}

function nowTime() {
  return new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function getDefaultPrompts(userRole?: string): string[] {
  if (userRole === 'caregiver') {
    return [
      'Xem lịch nhận ca hiện tại của tôi',
      'Thu nhập và các giao dịch gần đây của tôi',
      'Cách nâng điểm CARE SCORE & hoàn thành ca',
    ];
  }
  if (userRole === 'admin') {
    return [
      'Thống kê hồ sơ chờ duyệt & doanh thu hệ thống',
      'Xem lịch chăm sóc gần nhất trên hệ thống',
      'Kiểm tra nhật ký sinh hiệu bệnh nhân mới nhất',
    ];
  }
  if (userRole === 'family') {
    return [
      'Tìm chuyên viên chăm sóc ở quận Đống Đa',
      'Xem lịch chăm sóc sắp tới của gia đình tôi',
      'Chỉ số sinh hiệu mới nhất của người thân thế nào?',
    ];
  }
  return [
    'Tìm chuyên viên chăm sóc tại Hà Nội',
    'Bảng giá ca chăm sóc & quy trình đặt lịch',
    'Chính sách thẩm định eKYC tại CareMatch',
  ];
}

function createWelcomeMessage(userRole?: string, userName?: string): CareMatchChatMessage {
  const greetingName = userName ? ` ${userName}` : '';
  const roleHint =
    userRole === 'caregiver'
      ? 'Tôi có thể hỗ trợ bạn về quy trình xác thực eKYC, nhận ca, viết báo cáo sinh hiệu và nâng điểm CARE SCORE.'
      : userRole === 'admin'
        ? 'Tôi có thể hỗ trợ tra cứu chuyên viên, tóm tắt quy trình điều phối, duyệt hồ sơ và theo dõi vận hành hệ thống.'
        : 'Tôi có thể giúp bạn tìm chuyên viên phù hợp, giải thích quy trình đặt ca, theo dõi sức khỏe người thân và các gói dịch vụ của CARE-MATCH.';

  return {
    id: 'welcome',
    sender: 'bot',
    content: `Xin chào${greetingName}! Tôi là CareMatchAI — trợ lý đồng hành 24/7 của CARE-MATCH. ${roleHint} Bạn cần tôi hỗ trợ gì hôm nay?`,
    time: nowTime(),
    quickReplies: getDefaultPrompts(userRole),
  };
}

export function useCareMatchChat({ userRole = 'guest', userId = null, userName = '' }: CareMatchChatUserContext) {
  const storageKey = getStorageKey(userId, userRole);

  const readStoredMessages = (): CareMatchChatMessage[] => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { }
    return [createWelcomeMessage(userRole, userName)];
  };

  const [messages, setMessages] = useState<CareMatchChatMessage[]>(readStoredMessages);
  const [sending, setSending] = useState(false);
  const [streamStatus, setStreamStatus] = useState<string>('');

  useEffect(() => {
    setMessages(readStoredMessages());
  }, [storageKey]);

  useEffect(() => {
    const onSync = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail?.storageKey === storageKey && Array.isArray(detail.messages)) {
        setMessages(detail.messages);
      }
    };
    window.addEventListener(SYNC_EVENT, onSync);
    return () => window.removeEventListener(SYNC_EVENT, onSync);
  }, [storageKey]);

  const persistAndBroadcast = (nextMessages: CareMatchChatMessage[]) => {
    setMessages(nextMessages);
    try {
      localStorage.setItem(storageKey, JSON.stringify(nextMessages.slice(-40)));
    } catch { }
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { storageKey, messages: nextMessages } }));
  };

  const sendMessage = async (rawText: string) => {
    const text = rawText.trim();
    if (!text || sending) return;

    const userMsg: CareMatchChatMessage = {
      id: `u_${Date.now()}`,
      sender: 'user',
      content: text,
      time: nowTime(),
    };

    const withUser = [...messages, userMsg];
    persistAndBroadcast(withUser);
    setSending(true);
    setStreamStatus('CareMatchAI đang xử lý yêu cầu...');

    const botId = `b_${Date.now()}`;
    let streamedText = '';

    try {
      const historyPayload = messages
        .filter((m) => m.id !== 'welcome')
        .slice(-8)
        .map((m) => ({ sender: m.sender, content: m.content }));

      const payloadBody = JSON.stringify({
        message: text,
        history: historyPayload,
        userRole,
        userId,
        userName,
      });

      const res = await fetch(`${API}/ai/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payloadBody,
      });

      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let finalMeta: { quick_replies?: string[]; grounded?: boolean } = {};

        const pushStreamFrame = (contentText: string, doneMeta?: { quick_replies?: string[]; grounded?: boolean }) => {
          const botMsg: CareMatchChatMessage = {
            id: botId,
            sender: 'bot',
            content: contentText,
            time: nowTime(),
            quickReplies: Array.isArray(doneMeta?.quick_replies) ? doneMeta.quick_replies : undefined,
            grounded: Boolean(doneMeta?.grounded),
          };
          persistAndBroadcast([...withUser, botMsg]);
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const blocks = buffer.split('\n\n');
          buffer = blocks.pop() || '';

          for (const block of blocks) {
            const lines = block.split('\n');
            let eventName = 'message';
            let dataStr = '';
            for (const line of lines) {
              if (line.startsWith('event:')) eventName = line.slice(6).trim();
              else if (line.startsWith('data:')) dataStr += line.slice(5).trim();
            }
            if (!dataStr) continue;
            try {
              const evtData = JSON.parse(dataStr);
              if (eventName === 'status' && evtData?.text) {
                setStreamStatus(String(evtData.text));
              } else if (eventName === 'chunk' && evtData?.text) {
                streamedText += String(evtData.text);
                pushStreamFrame(streamedText);
              } else if (eventName === 'done') {
                finalMeta = evtData || {};
                const finalReply = String(evtData?.reply || streamedText || 'Xin lỗi, CareMatchAI chưa thể trả lời lúc này.');
                pushStreamFrame(finalReply, finalMeta);
              } else if (eventName === 'error') {
                pushStreamFrame(evtData?.error || 'Xin lỗi, CareMatchAI tạm thời gặp sự cố.');
              }
            } catch { }
          }
        }
        if (!streamedText && !finalMeta.quick_replies && !finalMeta.grounded) {
          // Trường hợp hiếm stream kết thúc không có frame done -> fallback an toàn
          const fallbackRes = await fetch(`${API}/ai/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payloadBody,
          });
          const fData = await fallbackRes.json();
          pushStreamFrame(
            fallbackRes.ok && fData?.reply ? String(fData.reply) : fData?.error || 'Xin lỗi, CareMatchAI tạm thời chưa kết nối được.',
            fData
          );
        }
      } else {
        const data = await res.json().catch(() => ({}));
        const botText =
          res.ok && data?.reply
            ? String(data.reply)
            : data?.error || 'Xin lỗi, CareMatchAI tạm thời chưa kết nối được. Bạn vui lòng thử lại sau giây lát nhé.';

        const botMsg: CareMatchChatMessage = {
          id: botId,
          sender: 'bot',
          content: botText,
          time: nowTime(),
          quickReplies: Array.isArray(data?.quick_replies) ? data.quick_replies : undefined,
          grounded: Boolean(data?.grounded),
        };
        persistAndBroadcast([...withUser, botMsg]);
      }
    } catch {
      const errMsg: CareMatchChatMessage = {
        id: `b_err_${Date.now()}`,
        sender: 'bot',
        content: 'Lỗi kết nối tới máy chủ CareMatchAI. Bạn vui lòng kiểm tra mạng và thử lại.',
        time: nowTime(),
      };
      persistAndBroadcast([...withUser, errMsg]);
    } finally {
      setSending(false);
      setStreamStatus('');
    }
  };

  const resetChat = () => {
    persistAndBroadcast([createWelcomeMessage(userRole, userName)]);
  };

  return { messages, sending, streamStatus, sendMessage, resetChat };
}

interface CareMatchChatPanelProps extends CareMatchChatUserContext {
  onClose?: () => void;
  onBackMobile?: () => void;
  embedded?: boolean;
}

export function CareMatchChatPanel({
  userRole = 'guest',
  userId = null,
  userName = '',
  onClose,
  onBackMobile,
  embedded = false,
}: CareMatchChatPanelProps) {
  const { messages, sending, streamStatus, sendMessage, resetChat } = useCareMatchChat({ userRole, userId, userName });
  const [inputVal, setInputVal] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputVal.trim() || sending) return;
    const text = inputVal;
    setInputVal('');
    sendMessage(text);
  };

  const lastBotQuickReplies = [...messages].reverse().find((m) => m.sender === 'bot')?.quickReplies || [];

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      {/* Header */}
      <div
        className={`shrink-0 flex items-center justify-between gap-2 px-4 py-3 ${
          embedded
            ? 'border-b border-[hsl(var(--border))] bg-gradient-to-r from-[#f3f8f1] to-[#faf8f2]'
            : 'bg-gradient-to-r from-[#233d22] to-[#345832] text-white'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {onBackMobile && (
            <button
              type="button"
              onClick={onBackMobile}
              className="lg:hidden rounded-xl bg-[#edf4ea] px-2.5 py-1.5 text-[12px] font-bold text-[#2d4a30] cursor-pointer shrink-0"
            >
              ← Quay lại
            </button>
          )}
          <div
            className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
              embedded ? 'bg-[#2c4e2a] text-[#f3d485]' : 'bg-white/15 border border-white/20 text-[#f4d78b]'
            }`}
          >
            <Sparkles size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <strong className={`text-[14px] truncate ${embedded ? 'text-[#223922]' : 'text-white'}`}>
                CareMatchAI
              </strong>
              <span
                className={`rounded-full px-2 py-0.5 text-[9.5px] font-bold ${
                  embedded ? 'bg-emerald-100 text-emerald-800' : 'bg-white/15 text-emerald-100'
                }`}
              >
                Trực tuyến 24/7
              </span>
            </div>
            <p className={`text-[11px] truncate ${embedded ? 'text-[#5b745a]' : 'text-emerald-100/80'}`}>
              Trợ lý chăm sóc sức khỏe & điều phối thông minh
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={resetChat}
            title="Làm mới cuộc trò chuyện"
            className={`p-1.5 rounded-xl transition cursor-pointer ${
              embedded ? 'text-[#4c694b] hover:bg-[#e5efe2]' : 'text-white/80 hover:bg-white/15 hover:text-white'
            }`}
          >
            <RotateCcw size={15} />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Thu gọn CareMatchAI"
              className={`p-1.5 rounded-xl transition cursor-pointer ${
                embedded ? 'text-gray-500 hover:bg-gray-100' : 'text-white/80 hover:bg-white/15 hover:text-white'
              }`}
            >
              <X size={17} />
            </button>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-[#f8faf7] p-4 space-y-3.5"
        style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
      >
        {messages.map((m) => {
          const isUser = m.sender === 'user';
          return (
            <div key={m.id} className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
              {!isUser && (
                <div className="w-7 h-7 rounded-full bg-[#2c4e2a] text-[#f3d485] flex items-center justify-center shrink-0 mb-4 shadow-2xs">
                  <Sparkles size={13} />
                </div>
              )}
              <div className={`max-w-[82%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
                <div
                  className={`rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed whitespace-pre-line shadow-2xs ${
                    isUser
                      ? 'bg-[#2f522d] text-white rounded-br-[4px]'
                      : 'bg-white text-[#233524] border border-[#dce8d8] rounded-bl-[4px]'
                  }`}
                >
                  {m.content}
                </div>
                <span className="mt-1 px-1 text-[10px] text-gray-400 flex items-center gap-1.5">
                  <span>{m.time}</span>
                  {!isUser && m.grounded && (
                    <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 text-[9px] font-semibold">
                      Đã tra cứu dữ liệu hệ thống
                    </span>
                  )}
                </span>
              </div>
            </div>
          );
        })}

        {sending && (
          <div className="flex items-end gap-2 justify-start">
            <div className="w-7 h-7 rounded-full bg-[#2c4e2a] text-[#f3d485] flex items-center justify-center shrink-0">
              <Sparkles size={13} />
            </div>
            <div className="rounded-2xl rounded-bl-[4px] bg-white border border-[#dce8d8] px-3.5 py-2.5 text-[12px] text-[#456344] flex items-center gap-2 shadow-2xs">
              <Loader2 size={14} className="animate-spin text-emerald-700" />
              {streamStatus || 'CareMatchAI đang soạn câu trả lời...'}
            </div>
          </div>
        )}

        {!sending && lastBotQuickReplies.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {lastBotQuickReplies.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => sendMessage(q)}
                className="text-left rounded-full bg-[#eef5ec] hover:bg-[#dfecd9] text-[#284726] border border-[#cbe0c5] px-3 py-1 text-[11px] font-medium transition cursor-pointer"
              >
                ✨ {q}
              </button>
            ))}
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input form */}
      <form
        onSubmit={handleSubmit}
        className="shrink-0 border-t border-[hsl(var(--border))] p-3 bg-white pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-center gap-2 rounded-2xl bg-[#f1f6ef] border border-[#d6e4d2] px-3 py-1.5 focus-within:border-[#3c653a] focus-within:bg-white transition">
          <input
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Hỏi CareMatchAI bất cứ điều gì..."
            className="min-w-0 flex-1 bg-transparent py-1.5 text-[12.5px] text-gray-800 outline-none placeholder:text-gray-400"
          />
          <button
            type="submit"
            disabled={sending || !inputVal.trim()}
            className="w-8 h-8 rounded-xl bg-[#2f522d] hover:bg-[#234022] text-white flex items-center justify-center transition cursor-pointer disabled:opacity-40 shrink-0"
            aria-label="Gửi tin nhắn cho CareMatchAI"
          >
            <Send size={14} />
          </button>
        </div>
      </form>
    </div>
  );
}

export function CareMatchChatBubble(props: CareMatchChatUserContext) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[95] flex flex-col items-end gap-3">
      {open && (
        <div
          className="w-[calc(100vw-2rem)] sm:w-[390px] h-[520px] max-h-[80dvh] rounded-3xl overflow-hidden shadow-[0_24px_60px_rgba(23,41,22,0.28)] border border-[#c8dcc2] bg-white animate-rise"
          data-testid="carematchai-bubble-window"
        >
          <CareMatchChatPanel {...props} onClose={() => setOpen(false)} />
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        data-testid="button-carematchai-bubble"
        aria-label={open ? 'Đóng CareMatchAI' : 'Mở trợ lý CareMatchAI'}
        className="group relative flex items-center gap-2.5 rounded-full bg-gradient-to-r from-[#233d22] to-[#345832] hover:from-[#1b311a] hover:to-[#2b4929] text-white px-4 py-3 shadow-[0_12px_30px_rgba(35,61,34,0.35)] border border-[#61895f]/40 transition-all hover:scale-[1.03] active:scale-[0.98] cursor-pointer"
      >
        <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-[#f4d78b]">
          {open ? <X size={16} /> : <MessageCircle size={16} />}
          {!open && (
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 border border-[#233d22]" />
            </span>
          )}
        </span>
        <div className="text-left pr-0.5">
          <span className="block text-[12.5px] font-bold leading-none flex items-center gap-1">
            <Sparkles size={11} className="text-[#f4d78b]" />
            CareMatchAI
          </span>
          <span className="block text-[10px] text-emerald-100/80 mt-0.5 leading-none">
            {open ? 'Thu gọn chat' : 'Hỏi đáp 24/7'}
          </span>
        </div>
      </button>
    </div>
  );
}
