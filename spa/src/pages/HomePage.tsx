import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  assistantAsk, 
  assistantStream,
  createChat, 
  fetchAssistantThread, 
  fetchChatMatches, 
  fetchChatMessages, 
  fetchChatSummaryCards, 
  listChats, 
  type ChatSummary, 
  type SearchItem as DemoSearchItem, 
  type InstrumentSummary, 
  type RecommendationItem, 
  type StoredChatMessage,
  updateChatTitle,
  suggestChatTitle,
} from '../services/api';
import { useCompliance } from '../context/ComplianceContext';
import RightPane from '../components/chat/RightPane';
import ChatFeed from '../components/chat/ChatFeed';
import { TalksSidebar } from '../components/chat/TalksSidebar';
import { ChatMessage } from '../components/chat/types';

export default function HomePage() {
  // URL and navigation
  const { chatId: chatIdParam } = useParams<{ chatId?: string }>();
  const navigate = useNavigate();
  
  // Core state
  const [chatId, setChatId] = useState<string | null>(chatIdParam || null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const titleRequestedRef = useRef<Record<string, boolean>>({});
  
  // UI state
  const [typing, setTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [showRight, setShowRight] = useState(false);
  const [matchesOpen, setMatchesOpen] = useState(false);
  
  // Pagination state
  const [msgOffset, setMsgOffset] = useState(0);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  
  // Product details state
  const [selected, setSelected] = useState<DemoSearchItem | null>(null);
  const [summary, setSummary] = useState<InstrumentSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [matches, setMatches] = useState<RecommendationItem[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [asOf, setAsOf] = useState<string | null>(null);
  const [hasMatchesInChat, setHasMatchesInChat] = useState(false);
  
  // Refs
  const initialLoadedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatFeedRef = useRef<HTMLDivElement>(null);
  const { setComplianceText } = useCompliance();
  const chatIdRef = useRef<string | null>(chatIdParam || null);
  const creatingChatRef = useRef(false);

  useEffect(() => {
    chatIdRef.current = chatId;
  }, [chatId]);

  // Welcome message for fresh chats / no history
  const createWelcomeMessage = (): ChatMessage => ({
    key: `welcome-${Date.now()}`,
    role: 'assistant',
    kind: 'text',
    text: 'Welcome to Nirvana',
    ts: Date.now(),
  });

  // Utility for determining if a message is a tool JSON response
  const isToolJson = (text: string): boolean => {
    try {
      const trimmed = text.trim();
      if (!trimmed.startsWith('{')) return false;
      const parsed = JSON.parse(trimmed);
      return parsed && typeof parsed === 'object' && parsed.action && typeof parsed.action === 'string';
    } catch (e) {
      return false;
    }
  };

  // Filter placeholder weather texts like "Loading current weather..."
  const isWeatherPlaceholder = (text?: string | null): boolean => {
    try {
      const t = (text || '').trim().toLowerCase();
      return (
        t.startsWith('loading current weather') ||
        t.startsWith('loading weather') ||
        t.startsWith('fetching current weather') ||
        t.endsWith('please wait')
      );
    } catch { return false; }
  };

  // Generate a signature for a message to help with deduplication
  const signatureOf = (msg: ChatMessage): string => {
    if (!msg) return 'unknown';
    
    // Always use unique key if available to avoid deduplication of identical messages
    if (msg.key) {
      return `key-${msg.key}`;
    }
    
    switch (msg.kind) {
      case 'text':
        // Stable signature by content to avoid duplicates from SSE + refresh
        return `${msg.role}-${msg.kind}-${(msg.text || '').trim()}`;
      case 'weather':
        return `weather-${(msg.text || '').trim()}`;
      case 'summary_card':
        return `summary-${msg.symbol}-${msg.id}`;
      case 'matches':
        return `matches-${msg.key || ''}`;
      case 'comment':
        return `comment-${(msg.text || '').trim()}`;
      default:
        // Exhaustive guard reached; avoid accessing properties on never
        return `unknown-${Date.now()}`;
    }
  };

  // Deduplicate consecutive messages with the same signature and remove all duplicates
  const dedupConsecutive = (msgs: ChatMessage[]): ChatMessage[] => {
    if (!msgs.length) return msgs;
    
    // First sort by timestamp to ensure proper ordering
    const sorted = [...msgs].sort((a, b) => {
      if (a.ts === b.ts) return 0;
      return (a.ts || 0) < (b.ts || 0) ? -1 : 1;
    });
    
    // Use a Map to track unique messages by their signature
    const uniqueMessages = new Map<string, ChatMessage>();
    
    // Keep only the first occurrence of each message signature
    sorted.forEach(msg => {
      const signature = signatureOf(msg);
      if (!uniqueMessages.has(signature)) {
        uniqueMessages.set(signature, msg);
      }
    });
    
    // Convert back to array and sort by timestamp
    return Array.from(uniqueMessages.values()).sort((a, b) => {
      if (a.ts === b.ts) return 0;
      return (a.ts || 0) < (b.ts || 0) ? -1 : 1;
    });
  };

  // Map stored messages to chat messages
  const mapStoredToChatMessages = (stored: StoredChatMessage[]): ChatMessage[] => {
    if (!stored || !Array.isArray(stored)) {
      console.error("Invalid stored messages:", stored);
      return [];
    }
    
    return stored.map(msg => {
      const baseTs = msg.created_at ? new Date(msg.created_at).getTime() : Date.now();
      
      if (msg.kind === 'text') {
        // Filter out raw tool JSON that might have been saved as text
        if (isToolJson(msg.content)) {
          return null;
        }
        
        return {
          key: msg.id,
          role: msg.role as 'user' | 'assistant',
          kind: 'text',
          text: msg.content,
          ts: baseTs
        };
      } else if (msg.kind === 'weather_ref') {
        try {
          const data = JSON.parse(msg.content);
          if (isWeatherPlaceholder(data?.text)) {
            return null;
          }
          return {
            key: msg.id,
            kind: 'weather',
            text: data.text || '',
            ts: baseTs
          };
        } catch (e) {
          console.error('Failed to parse weather ref', e);
          return null;
        }
      } else if (msg.kind === 'summary_ref') {
        try {
          const ref = JSON.parse(msg.content);
          return {
            key: msg.id,
            kind: 'summary_card',
            id: ref.id,
            symbol: ref.symbol,
            data: null, // Will be hydrated later
            ts: baseTs
          };
        } catch (e) {
          console.error('Failed to parse summary ref', e);
          return null;
        }
      } else if (msg.kind === 'matches_ref') {
        try {
          const ref = JSON.parse(msg.content);
          return {
            key: msg.id,
            kind: 'matches',
            items: [],  // Will be hydrated on demand
            asOf: null,
            ts: baseTs
          };
        } catch (e) {
          console.error('Failed to parse matches ref', e);
          return null;
        }
      } else if (msg.kind === 'text' && typeof msg.content === 'string' && msg.content.includes('"action":"comment"')) {
        try {
          console.log("Attempting to parse comment:", msg.content);
          
          // Clean the JSON string before parsing
          let jsonText = msg.content.trim();
          
          // Replace invalid control characters
          jsonText = jsonText.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
          
          try {
            const data = JSON.parse(jsonText);
            if (data && data.action === 'comment' && data.assistant_text) {
              if (isWeatherPlaceholder(data.assistant_text)) {
                return null;
              }
              console.log("Successfully parsed comment:", data);
              return {
                key: msg.id,
                kind: 'comment',
                text: data.assistant_text,
                ts: baseTs
              };
      } else {
              console.log("Comment data missing required fields:", data);
            }
          } catch (parseError) {
            console.error("JSON parse error:", parseError);
            
            // Try regex extraction as fallback - more comprehensive pattern
            const match = jsonText.match(/"assistant_text"\s*:\s*"([^"]+(?:"[^"]+)*)"(?:,|$)/);
            if (match && match[1]) {
              const extractedText = match[1]
                // Unescape any escaped quotes inside the text
                .replace(/\\"/g, '"')
                // Fix common formatting issues
                .replace(/\\n/g, '\n')
                .replace(/\\t/g, '  ');
                
              console.log("Extracted assistant_text using regex:", extractedText);
              return {
                key: msg.id,
                kind: 'comment',
                text: extractedText,
                ts: baseTs
              };
            }
          }
        } catch (e) {
          console.error('Failed to process comment', e, msg.content);
          return null;
        }
      }
      
      return null;
    }).filter(Boolean) as ChatMessage[];
  };

  // Handle creating a new chat
  const handleCreateChat = useCallback(async () => {
    if (creatingChatRef.current) return;
    try {
      creatingChatRef.current = true;
      setLoading(true);
      const result = await createChat();
      // Ensure newest chat appears on top immediately
      const nowIso = new Date().toISOString();
      const normalized = { ...result, updated_at: result.updated_at || nowIso, created_at: result.created_at || nowIso };
      setChatId(normalized.id);
      chatIdRef.current = normalized.id;
      navigate(`/talk/${result.id}`);
      setThreadId(null);
      setMessages([createWelcomeMessage()]);
      setChats(prev => [normalized, ...prev]);
      initialLoadedRef.current = true; // Prevent initial load from running again
    } catch (e) {
      console.error('Error creating chat', e);
      } finally {
        setLoading(false);
      creatingChatRef.current = false;
      }
  }, [navigate]);

  // Ensure we have a chat id; create one if needed (debounced/locked)
  const ensureChatId = useCallback(async (): Promise<string> => {
    if (chatIdRef.current) return chatIdRef.current;
    // Prefer existing chat if available (avoid creating duplicates during initial load)
    if (chats && chats.length > 0) {
      const id = chats[0].id;
      setChatId(id);
      chatIdRef.current = id;
      navigate(`/talk/${id}`);
      return id;
    }
    // If creation is in progress, wait briefly
    if (creatingChatRef.current) {
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 50));
        if (chatIdRef.current) return chatIdRef.current;
      }
    }
    // Create new chat
    try {
      creatingChatRef.current = true;
      setLoading(true);
      const result = await createChat();
      setChatId(result.id);
      chatIdRef.current = result.id;
      navigate(`/talk/${result.id}`);
      setThreadId(null);
      setMessages([createWelcomeMessage()]);
      setChats(prev => [result, ...prev]);
      initialLoadedRef.current = true;
      return result.id;
    } finally {
      setLoading(false);
      creatingChatRef.current = false;
    }
  }, [navigate, chats]);

  // Handle switching to a different chat
  const handleSwitchChat = useCallback(async (id: string) => {
    if (id === chatId) return;
    
    try {
      setLoading(true);
      setChatId(id);
      chatIdRef.current = id;
      navigate(`/talk/${id}`);
      setMessages([]);
      setThreadId(null);
      setMsgOffset(0);
      setHasMoreMessages(true);
      initialLoadedRef.current = false;
      setMatchesOpen(false);
      setShowRight(false);
      
      // Reset scroll position for next load
      setTimeout(() => {
        if (chatFeedRef.current) {
          chatFeedRef.current.scrollTop = chatFeedRef.current.scrollHeight;
        }
      }, 200);
    } catch (e) {
      console.error('Error switching chat', e);
      } finally {
        setLoading(false);
      }
  }, [chatId, navigate]);

  // Load more messages when scrolling up
  const handleLoadMore = useCallback(async () => {
    if (!chatId || loadingMore || !hasMoreMessages) return;
    
    try {
      setLoadingMore(true);
      console.log("Loading more messages with offset:", msgOffset);
      
      // Store current scroll position and height before loading more messages
      const scrollContainer = chatFeedRef.current;
      const scrollHeight = scrollContainer?.scrollHeight || 0;
      const scrollTop = scrollContainer?.scrollTop || 0;
      
      // Use 'desc' sort order to get newest messages first, with increasing offset
      // to get older messages as we scroll up
      const result = await fetchChatMessages(chatId, msgOffset, 20, 'desc');
      
      // Handle both new format (messages) and old format (items)
      const messagesArray = result?.messages || (result as any)?.items || [];
      
      if (!Array.isArray(messagesArray) || messagesArray.length === 0) {
        console.log("No more messages to load or invalid format:", result);
        setHasMoreMessages(false);
        // If no history at all, seed with welcome message
        if ((messages || []).length === 0) {
          setMessages([createWelcomeMessage()]);
        }
        return;
      }
      
      console.log("Loaded older messages:", messagesArray);
      
      // Map the messages without reversing - they're already in the right order
      const newMsgs = mapStoredToChatMessages(messagesArray);
      console.log("New messages from pagination:", newMsgs);
      
      // Add older messages at the beginning (top) of the list
      const combinedMessages = [...newMsgs, ...messages];
      console.log("Combined messages before dedup:", combinedMessages);
      
      // Deduplicate and ensure proper ordering
      const uniqueMessages = dedupConsecutive(combinedMessages);
      console.log("After deduplication (pagination):", uniqueMessages);
      
      setMessages(uniqueMessages);
      setMsgOffset(prev => prev + messagesArray.length);
      
      // If we got fewer messages than requested, there are no more to load
      if (messagesArray.length < 20) {
        setHasMoreMessages(false);
      }
      
      // CRITICAL: Restore scroll position after new messages are rendered
      // This prevents jumping to the bottom when loading history
      setTimeout(() => {
        if (scrollContainer) {
          // Calculate how much the scroll height has increased
          const newScrollHeight = scrollContainer.scrollHeight;
          const scrollHeightDiff = newScrollHeight - scrollHeight;
          
          // Set the new scroll position to maintain the same relative position
          // This keeps the same messages visible that were visible before loading more
          scrollContainer.scrollTop = scrollTop + scrollHeightDiff;
          console.log("Restored scroll position after loading history");
        }
      }, 50);
    } catch (e) {
      console.error('Error loading more messages', e);
    } finally {
      setLoadingMore(false);
    }
  }, [chatId, loadingMore, hasMoreMessages, msgOffset, messages]);

  // Toggle showing products in the right pane
  const handleToggleProducts = useCallback(async () => {
    // If already open, close it
    if (matchesOpen) {
      setMatchesOpen(false);
      setShowRight(false);
      return;
    }
    
    try {
      setLoadingRecs(true);
      setShowRight(true);
      setMatchesOpen(true);
      
      // Always fetch the most recent matches for this chat
      console.log("Fetching latest matches for chat");
      const allMatchesResult = await fetchChatMatches(chatId!, '');
      const arr = (allMatchesResult && Array.isArray(allMatchesResult.chat_matches))
        ? allMatchesResult.chat_matches
        : [];
      // Sort by created_at desc to ensure we use the latest
      arr.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      const latest = arr[0];
      if (latest) {
        let items: any = latest.items as any;
        // If persisted as JSON string, parse it
        if (typeof items === 'string') {
          try { items = JSON.parse(items); } catch { items = []; }
        }
        // Normalize to an array regardless of shape
        if (!Array.isArray(items) && items && typeof items === 'object') {
          if (Array.isArray(items.recommendations)) {
            items = items.recommendations;
          } else if (Array.isArray(items.results)) {
            items = items.results;
          } else if (Array.isArray(items.items)) {
            items = items.items;
          } else {
            items = [];
          }
        }
        if (!Array.isArray(items)) {
          console.warn('Latest matches items is not an array after normalization');
          items = [];
        }
        setMatches(items);
        setAsOf(latest.as_of || null);
      } else {
        console.warn('No matches available for this chat');
      }
    } catch (e) {
      console.error('Error fetching matches', e);
    } finally {
      setLoadingRecs(false);
    }
  }, [chatId, matchesOpen]);

  // Detect if the current chat has any matches to decide header button visibility
  useEffect(() => {
    let cancelled = false;
    const checkMatches = async () => {
      if (!chatId) { setHasMatchesInChat(false); return; }
      try {
        const res = await fetchChatMatches(chatId, '');
        if (!cancelled) {
          const hasAny = Array.isArray(res?.chat_matches) && res.chat_matches.length > 0;
          setHasMatchesInChat(hasAny);
        }
      } catch {
        if (!cancelled) setHasMatchesInChat(false);
      }
    };
    checkMatches();
    return () => { cancelled = true; };
  }, [chatId]);

  // Handle user message submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("handleSubmit called with:", e);
    if (!inputRef.current || !inputRef.current.value.trim() || locked) {
      console.log("Submit blocked - empty input or locked:", {
        hasInputRef: !!inputRef.current,
        inputValue: inputRef.current?.value,
        locked
      });
      return;
    }
    
    const userInput = inputRef.current.value.trim();
    inputRef.current.value = '';
    
    // Ensure we have a chat id (avoid duplicate creation due to async state)
    const ensuredChatId = await ensureChatId();
    
    // Add user message to the chat
    const userMsg: ChatMessage = {
      key: `temp-${Date.now()}`,
      role: 'user',
      kind: 'text',
      text: userInput,
      ts: Date.now()
    };
    
      setMessages(prev => {
        const combined = [...prev, userMsg];
        console.log("Combined messages with user msg:", combined);
        const uniqueMessages = dedupConsecutive(combined);
        console.log("After deduplication (user msg):", uniqueMessages);
        
        // Auto-scroll to bottom after adding new message
        setTimeout(() => {
          if (chatFeedRef.current) {
            chatFeedRef.current.scrollTop = chatFeedRef.current.scrollHeight;
          }
        }, 100);
        
        return uniqueMessages;
      });
    
    // Track when typing indicator starts
    const typingStartTime = Date.now();
    
    try {
      setLocked(true);
      setTyping(true);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Prefer SSE streaming; gracefully fall back to POST if fails
      let es: EventSource | null = null;
      let acc = '';
      let sseFinalJson: any = null;
      let usedStreaming = false;
      const liveKey = `assistant-live-${ensuredChatId}-${Date.now()}`;
      try {
        // Generate an idempotency key per user message to suppress duplicate SSE opens
        const rid = `${ensuredChatId}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
        es = assistantStream(userInput, threadId, ensuredChatId, undefined, rid);
        await new Promise<void>((resolve, reject) => {
          const decodeB64Utf8 = (b64: string): string => {
            try {
              const bin = atob(b64);
              const bytes = new Uint8Array(Array.from(bin, c => c.charCodeAt(0)));
              return new TextDecoder('utf-8').decode(bytes);
            } catch {
              return b64;
            }
          };
          const onDelta = (e: MessageEvent) => {
            const raw = (e.data || '') as string;
            const chunk = decodeB64Utf8(raw);
            if (chunk) {
              acc += chunk;
              const assistantMsg: ChatMessage = {
                key: liveKey,
                role: 'assistant',
                kind: 'text',
                text: acc,
                ts: Date.now()
              };
              setMessages(prev => {
                const out = prev.filter(m => m.key !== liveKey);
                out.push(assistantMsg);
                return out;
              });
              // Keep view pinned to bottom while streaming
              setTimeout(() => {
                if (chatFeedRef.current) {
                  chatFeedRef.current.scrollTop = chatFeedRef.current.scrollHeight;
                }
              }, 0);
            }
          };
          const onFinal = (e: MessageEvent) => {
            try {
              const payload = JSON.parse(e.data || '{}');
              if (payload && typeof payload.text === 'string') {
                acc = payload.text;
              }
              if (!acc && typeof payload.text_b64 === 'string') {
                acc = decodeB64Utf8(payload.text_b64);
              }
              if (payload && payload.json) {
                sseFinalJson = payload.json;
              }
            } catch {}
            usedStreaming = true;
            resolve();
          };
          const onError = () => {
            reject(new Error('sse_error'));
          };
          es!.addEventListener('delta', onDelta as any);
          es!.addEventListener('final', onFinal as any);
          es!.addEventListener('error', onError as any);
        });
      } catch (err) {
        // Fallback: non-streaming POST
        const response = await assistantAsk(ensuredChatId!, userInput, threadId);
        acc = response.text || '';
        if (response.thread_id) setThreadId(response.thread_id);
      } finally {
        if (es) es.close();
      }

      if (acc && !sseFinalJson) {
        const assistantMsg: ChatMessage = {
          key: `assistant-${Date.now()}`,
          role: 'assistant',
          kind: 'text',
          text: acc,
          ts: Date.now() + 1
        };
        setMessages(prev => {
          // Remove live placeholder (if any), then append final
          const combined = prev.filter(m => m.key !== liveKey).concat(assistantMsg);
          const uniqueMessages = dedupConsecutive(combined);
          setTimeout(() => {
            if (chatFeedRef.current) {
              chatFeedRef.current.scrollTop = chatFeedRef.current.scrollHeight;
            }
          }, 100);
          return uniqueMessages;
        });
      }

      // If streaming preflight indicated a tool action (json present),
      // follow up with POST only for real tools, not for plain comments
      if (usedStreaming && sseFinalJson && typeof sseFinalJson.action === 'string') {
        const action = String(sseFinalJson.action).toUpperCase();
        const isToolAction = ['WEATHER', 'SUMMARY', 'MATCHES', 'ASK_TOL', 'CANDIDATES'].includes(action);
        if (isToolAction) {
        try {
          // Avoid duplicating the user message server-side when we already persisted it via SSE
          const response = await assistantAsk(ensuredChatId!, `<<TOOL>> ${userInput}`, threadId);
          acc = response.text || '';
          if (response.thread_id) setThreadId(response.thread_id);
          if (acc) {
            const assistantMsg: ChatMessage = {
              key: `assistant-${Date.now()}-tool`,
              role: 'assistant',
              kind: 'text',
              text: acc,
              ts: Date.now() + 2
            };
            // suppress text bubble if weather/matches/summary widgets will appear; server will add widget refs
            setMessages(prev => dedupConsecutive(prev.filter(m => m.key !== liveKey)));
          }

          // Refresh from server to hydrate widgets (weather_ref/summary_ref/matches_ref)
          try {
            const refreshed = await fetchChatMessages(ensuredChatId!, 0, 20, 'desc');
            const messagesArray = refreshed?.messages || (refreshed as any)?.items || [];
            if (Array.isArray(messagesArray)) {
              const mappedMessages = mapStoredToChatMessages(messagesArray);
              // Hydrate summary cards
              const summaryCardMsgs = mappedMessages.filter(m => m.kind === 'summary_card');
              if (summaryCardMsgs.length > 0) {
                try {
                  const summaryCards = await fetchChatSummaryCards(ensuredChatId!);
                  if (summaryCards.chat_summary_cards && summaryCards.chat_summary_cards.length > 0) {
                    const cardDataMap = new Map();
                    summaryCards.chat_summary_cards.forEach(card => {
                      try { const data = JSON.parse(card.data); cardDataMap.set(card.id, data); } catch {}
                    });
                    mappedMessages.forEach(msg => {
                      if (msg.kind === 'summary_card' && cardDataMap.has(msg.id)) {
                        (msg as any).data = cardDataMap.get(msg.id);
                      }
                    });
                  }
                } catch {}
              }
              // Hydrate matches bubble
              try {
                const matchesMsgs = mappedMessages.filter(m => m.kind === 'matches');
                if (matchesMsgs.length > 0) {
                  const allMatchesResult = await fetchChatMatches(ensuredChatId!, '');
                  if (allMatchesResult.chat_matches && allMatchesResult.chat_matches.length > 0) {
                    const latest = allMatchesResult.chat_matches.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())[0];
                    let itemsLatest: any = latest.items;
                    if (typeof itemsLatest === 'string') { try { itemsLatest = JSON.parse(itemsLatest); } catch { itemsLatest = []; } }
                    if (Array.isArray(itemsLatest)) {
                      let seen = false;
                      for (let i = mappedMessages.length - 1; i >= 0; i--) {
                        const msg = mappedMessages[i];
                        if (!seen && msg.kind === 'matches') {
                          (msg as any).items = itemsLatest;
                          (msg as any).asOf = (latest as any).as_of || null;
                          seen = true;
                        }
                      }
                    }
                  }
                }
              } catch {}

              const uniqueMessages = dedupConsecutive(mappedMessages);
              setMessages(uniqueMessages);
            }
          } catch (e) {
            console.error('Failed to refresh messages after tool', e);
          }
        } catch (e) {
          console.error('Follow-up POST after SSE intent failed', e);
        }
        return;
        }
      }

      // If streaming was used but no tool action, skip server refresh/title flow
      if (usedStreaming) {
        return;
      }

      // After a full user→assistant turn, consider requesting a title
      try {
        const currentId = ensuredChatId!;
        const chatMeta = chats.find(c => c.id === currentId);
        const already = chatMeta?.title_assigned;
        const requested = titleRequestedRef.current[currentId];
        const totalMessages = (messages?.length || 0) + 1; // include just-added assistant msg
        if (!already && !requested && totalMessages >= 6) {
          titleRequestedRef.current[currentId] = true;
          try {
            const upd = await suggestChatTitle(currentId);
            const finalTitle = upd.title || 'New talk';
            setChats(prev => prev.map(c => c.id === currentId ? { ...c, title: upd.title || finalTitle, title_assigned: upd.title_assigned ?? true } : c));
          } catch (e) {
            console.error('Title suggestion failed', e);
            titleRequestedRef.current[currentId] = false;
          }
        }
      } catch (e) {
        console.error('Post-turn title check failed', e);
      }
      
      // Auto-open right pane for matches if assistant requested it
      try {
        const paneType = (response as any)?.right_pane?.pane || (response as any)?.right_pane?.type;
        if (paneType === 'matches') {
          setShowRight(true);
          setMatchesOpen(true);
          setLoadingRecs(true);
          try {
            const allMatchesResult = await fetchChatMatches(ensuredChatId!, '');
            const arr = Array.isArray(allMatchesResult?.chat_matches) ? allMatchesResult.chat_matches : [];
            arr.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
            const latest = arr[0];
            if (latest) {
              let items: any = latest.items;
              if (typeof items === 'string') {
                try { items = JSON.parse(items); } catch { items = []; }
              }
              if (Array.isArray(items)) {
                setMatches(items);
                setAsOf((latest as any).as_of || null);
                // Update the latest matches message in the feed so the bubble shows correct count
                setMessages(prev => {
                  const out = [...prev];
                  for (let i = out.length - 1; i >= 0; i--) {
                    const m = out[i];
                    if ((m as any).kind === 'matches') {
                      (out[i] as any) = { ...(m as any), items, asOf: (latest as any).as_of } as ChatMessage;
                      break;
                    }
                  }
                  return out;
                });
              }
            }
          } catch (e) {
            console.error('Auto-open matches: failed to fetch', e);
          } finally {
            setLoadingRecs(false);
          }
        }
      } catch (e) {
        console.error('Auto-open right pane error', e);
      }
      
      // Refresh messages from server to get any widgets
      // Use 'desc' to get newest messages first
      const refreshed = await fetchChatMessages(ensuredChatId!, 0, 20, 'desc');
      console.log("Refreshed messages from server:", refreshed);
      
      // Handle both new format (messages) and old format (items)
      const messagesArray = refreshed?.messages || (refreshed as any)?.items || [];
      
      if (!Array.isArray(messagesArray)) {
        console.error("Invalid messages format in refresh:", refreshed);
        return;
      }
      
      console.log("Messages array to process in refresh:", messagesArray);
      // With 'desc' sort, API returns newest messages first
      // No need to reverse or slice - they're already in the right order
      console.log("Using messages as received from API for refresh (newest first):", messagesArray);
      const mappedMessages = mapStoredToChatMessages(messagesArray);
      
      // Hydrate summary cards
      const summaryCardMsgs = mappedMessages.filter(m => m.kind === 'summary_card');
      if (summaryCardMsgs.length > 0) {
        try {
          const summaryCards = await fetchChatSummaryCards(ensuredChatId!);
          if (summaryCards.chat_summary_cards && summaryCards.chat_summary_cards.length > 0) {
            // Create a map of id -> data
            const cardDataMap = new Map();
            summaryCards.chat_summary_cards.forEach(card => {
              try {
                const data = JSON.parse(card.data);
                cardDataMap.set(card.id, data);
              } catch (e) {
                console.error('Failed to parse summary card data', e);
              }
            });
            
            // Update messages with hydrated data
            mappedMessages.forEach(msg => {
              if (msg.kind === 'summary_card' && cardDataMap.has(msg.id)) {
                msg.data = cardDataMap.get(msg.id);
              }
            });
          }
        } catch (e) {
          console.error('Error fetching summary cards', e);
        }
      }
      
      // Hydrate matches count for bubble (fetch latest matches and attach to last matches message)
      try {
        const matchesMsgs = mappedMessages.filter(m => m.kind === 'matches');
        if (matchesMsgs.length > 0) {
          const allMatchesResult = await fetchChatMatches(ensuredChatId!, '');
          if (allMatchesResult.chat_matches && allMatchesResult.chat_matches.length > 0) {
            const latest = allMatchesResult.chat_matches.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())[0];
            let itemsLatest: any = latest.items;
            if (typeof itemsLatest === 'string') {
              try { itemsLatest = JSON.parse(itemsLatest); } catch { itemsLatest = []; }
            }
            if (Array.isArray(itemsLatest)) {
              // update only the last matches message
              let seen = false;
              for (let i = mappedMessages.length - 1; i >= 0; i--) {
                const msg = mappedMessages[i];
                if (!seen && msg.kind === 'matches') {
                  (msg as any).items = itemsLatest;
                  (msg as any).asOf = (latest as any).as_of || null;
                  seen = true;
                }
              }
            }
          }
        }
      } catch (e) {
        console.error('Error hydrating matches bubble', e);
      }

      const uniqueMessages = dedupConsecutive(mappedMessages);
      console.log("After final deduplication:", uniqueMessages);
      setMessages(uniqueMessages);
      
      // Auto-scroll to bottom after refreshing messages from server
      setTimeout(() => {
        if (chatFeedRef.current) {
          console.log("Auto-scrolling to bottom after server refresh");
          chatFeedRef.current.scrollTop = chatFeedRef.current.scrollHeight;
        }
      }, 150);
      
    } catch (e) {
      console.error('Error sending message', e);
    } finally {
      // Ensure typing indicator shows for at least 1.5 seconds
      const elapsedTime = Date.now() - typingStartTime;
      const minTypingTime = 1500; // 1.5 seconds minimum typing time
      
      if (elapsedTime < minTypingTime) {
        // If response came back too quickly, keep typing indicator for a bit longer
        console.log(`Response came back quickly, keeping typing indicator for ${minTypingTime - elapsedTime}ms more`);
        setTimeout(() => {
          setLocked(false);
      setTyping(false);
          console.log("Typing indicator deactivated (delayed)");
          
          // Final scroll to bottom after typing indicator disappears
          setTimeout(() => {
            if (chatFeedRef.current) {
              console.log("Final auto-scroll after typing indicator disappears");
              chatFeedRef.current.scrollTop = chatFeedRef.current.scrollHeight;
            }
          }, 50);
        }, minTypingTime - elapsedTime);
      } else {
        // Response took longer than minimum typing time
        console.log("Response took longer than minimum typing time, deactivating typing indicator immediately");
      setLocked(false);
        setTyping(false);
        
        // Final scroll to bottom after typing indicator disappears
        setTimeout(() => {
          if (chatFeedRef.current) {
            console.log("Final auto-scroll after typing indicator disappears");
            chatFeedRef.current.scrollTop = chatFeedRef.current.scrollHeight;
          }
        }, 50);
      }
    }
  };

  // Ref to prevent multiple executions of initial load
  const initialLoadingRef = useRef(false);
  
  // Initial load of chats and messages
  useEffect(() => {
    const loadInitialData = async () => {
      if (initialLoadingRef.current) return;
      initialLoadingRef.current = true;
      
      try {
        setLoading(true);
        
        // Load list of chats
        const chatsResult = await listChats();
        console.log("Chats loaded:", chatsResult);
        
        // Handle both new format (chats) and old format (items)
        const chatsArray = chatsResult?.chats || (chatsResult as any)?.items || [];
        
        if (Array.isArray(chatsArray)) {
          console.log("Setting chats:", chatsArray);
          setChats(chatsArray);
              } else {
          console.error("Invalid chats format, cannot extract array:", chatsResult);
          setChats([]);
        }
        
        // If no chat ID in URL but chats exist, navigate to the first one
        
        if (!chatIdParam && chatsArray.length > 0) {
          const firstChat = chatsArray[0];
          console.log("Navigating to first chat:", firstChat);
          setChatId(firstChat.id);
          navigate(`/talk/${firstChat.id}`);
      return;
    }
        
        // If no chats exist, create a new one
        if ((!chatIdParam || chatsArray.length === 0) && !chatId) {
          console.log("Creating new chat");
          const newChat = await createChat();
          console.log("New chat created:", newChat);
          setChatId(newChat.id);
          setChats([newChat]);
          navigate(`/talk/${newChat.id}`);
      return;
    }
        // If current chat has >= 6 msgs and no title yet, request it once on load
        try {
          const current = (chatsArray || []).find((c: ChatSummary) => c.id === (chatIdParam || chatId));
          const currentId = current?.id || (chatsArray[0]?.id);
          if (currentId) {
            const meta = (chatsArray || []).find((c: ChatSummary) => c.id === currentId);
            if (meta && !meta.title_assigned && !titleRequestedRef.current[currentId]) {
              // fetch last 10 messages and decide
              const refreshed = await fetchChatMessages(currentId, 0, 10, 'desc');
              const arr = Array.isArray(refreshed?.messages) ? refreshed.messages : [];
              if (arr.length >= 6) {
                titleRequestedRef.current[currentId] = true;
                const mapped = mapStoredToChatMessages(arr);
                const recent = mapped.slice(0, 6).reverse().map((m: any) => (
                  m.kind === 'text' ? `${m.role}: ${m.text}` : m.kind
                )).join('\n');
                const prompt = `Generate a very short (2-5 words) neutral conversation title in the user's language. No punctuation except spaces. Context: \n${recent}`;
                try {
                  const upd = await suggestChatTitle(currentId);
                  const finalTitle = upd.title || 'New talk';
                  setChats(prev => prev.map(c => c.id === currentId ? { ...c, title: upd.title || finalTitle, title_assigned: upd.title_assigned ?? true } : c));
                } catch (ee) {
                  console.error('Initial title suggestion failed', ee);
                  titleRequestedRef.current[currentId] = false;
                }
              }
            }
          }
        } catch (e2) {
          console.error('Initial title check failed', e2);
        }

      } catch (e) {
        console.error('Error loading initial data', e);
    } finally {
        setLoading(false);
        initialLoadingRef.current = false;
      }
    };
    
    loadInitialData();
    
    // Cleanup function to reset the loading ref when component unmounts
    return () => {
      initialLoadingRef.current = false;
    };
  }, [chatIdParam, navigate, chatId]);

  // Ref to prevent multiple executions of message loading
  const messagesLoadingRef = useRef(false);
  
  // Load messages when chat ID changes
  useEffect(() => {
    const loadMessages = async () => {
      if (!chatId) {
        console.log("No chat ID, skipping message load");
        return;
      }
      
      if (initialLoadedRef.current) {
        console.log("Messages already loaded, skipping");
        return;
      }
      
      if (messagesLoadingRef.current) {
        console.log("Already loading messages, skipping duplicate call");
        return;
      }
      
      messagesLoadingRef.current = true;
      console.log("Loading messages for chat:", chatId);
      
      try {
        setLoading(true);
        
        // Try to load from Assistants API first if thread ID exists
        if (threadId) {
          try {
            console.log("Loading from Assistant API with thread ID:", threadId);
            const assistantThread = await fetchAssistantThread(threadId);
            console.log("Assistant thread loaded:", assistantThread);
            
            if (assistantThread.messages && assistantThread.messages.length > 0) {
              const mapped = assistantThread.messages.map((msg): ChatMessage => ({
                key: msg.id,
                role: msg.role as 'user' | 'assistant',
                kind: 'text',
                text: msg.content,
                ts: new Date(msg.created_at).getTime()
              }));
              
              console.log("Mapped messages from Assistant API:", mapped);
              const uniqueMessages = dedupConsecutive(mapped);
              console.log("After deduplication (Assistant API):", uniqueMessages);
              setMessages(uniqueMessages);
              initialLoadedRef.current = true;
              return;
            }
          } catch (e) {
            console.error('Error fetching assistant thread', e);
          }
        }
        
        // Fall back to local DB if Assistants API fails or no thread ID
        console.log("Loading messages from local DB for chat:", chatId);
        // Use 'desc' sort order to load newest messages first
        const result = await fetchChatMessages(chatId, 0, 20, 'desc');
        console.log("Messages loaded from DB:", result);
        
        // Handle both new format (messages) and old format (items)
        const messagesArray = result.messages || (result as any).items || [];
        
        if (!Array.isArray(messagesArray)) {
          console.error("Invalid messages format:", result);
          // Seed with welcome on invalid response for empty state
          setMessages([createWelcomeMessage()]);
          initialLoadedRef.current = true;
          return;
        }
        
        console.log("Messages array to process:", messagesArray);
        
        // With 'desc' sort, API returns newest messages first
        // No need to reverse or slice - they're already in the right order
        console.log("Using messages as received from API (newest first):", messagesArray);
        
        const mappedMessages = mapStoredToChatMessages(messagesArray);
        if (!mappedMessages || mappedMessages.length === 0) {
          // Fresh chat with no messages persisted yet
          setMessages([createWelcomeMessage()]);
          setMsgOffset(0);
          initialLoadedRef.current = true;
          return;
        }
        console.log("Mapped messages:", mappedMessages);
        
        // Hydrate summary cards
        const summaryCardMsgs = mappedMessages.filter(m => m.kind === 'summary_card');
        if (summaryCardMsgs.length > 0) {
          try {
            console.log("Loading summary cards for chat:", chatId);
            const summaryCards = await fetchChatSummaryCards(chatId);
            console.log("Summary cards loaded:", summaryCards);
            
            if (summaryCards.chat_summary_cards && summaryCards.chat_summary_cards.length > 0) {
              // Create a map of id -> data
              const cardDataMap = new Map();
              summaryCards.chat_summary_cards.forEach(card => {
                try {
                  const data = JSON.parse(card.data);
                  cardDataMap.set(card.id, data);
                } catch (e) {
                  console.error('Failed to parse summary card data', e);
                }
              });
              
              // Update messages with hydrated data
              mappedMessages.forEach(msg => {
                if (msg.kind === 'summary_card' && cardDataMap.has(msg.id)) {
                  msg.data = cardDataMap.get(msg.id);
                }
              });
            }
          } catch (e) {
            console.error('Error fetching summary cards', e);
          }
        }
        
        // Hydrate matches bubble
        try {
          const matchesMsgs = mappedMessages.filter(m => m.kind === 'matches');
          if (matchesMsgs.length > 0) {
            const allMatchesResult = await fetchChatMatches(chatId, '');
            if (allMatchesResult.chat_matches && allMatchesResult.chat_matches.length > 0) {
              const latest = allMatchesResult.chat_matches.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())[0];
              let itemsLatest: any = latest.items;
              if (typeof itemsLatest === 'string') {
                try { itemsLatest = JSON.parse(itemsLatest); } catch { itemsLatest = []; }
              }
              if (Array.isArray(itemsLatest)) {
                let seen = false;
                for (let i = mappedMessages.length - 1; i >= 0; i--) {
                  const msg = mappedMessages[i];
                  if (!seen && msg.kind === 'matches') {
                    (msg as any).items = itemsLatest;
                    (msg as any).asOf = (latest as any).as_of || null;
                    seen = true;
                  }
                }
              }
            }
          }
        } catch (e) {
          console.error('Error hydrating matches bubble (initial)', e);
        }

        console.log("Setting messages:", mappedMessages);
        const uniqueMessages = dedupConsecutive(mappedMessages);
        console.log("After deduplication:", uniqueMessages);
        setMessages(uniqueMessages);
        setMsgOffset(messagesArray.length);
        
        // Auto-scroll to bottom ONLY after initial load (not when loading more history)
        // This is needed only for the first load to show newest messages
        setTimeout(() => {
          if (chatFeedRef.current) {
            chatFeedRef.current.scrollTop = chatFeedRef.current.scrollHeight;
          }
        }, 100);
        
        // If we have a thread ID in the result, store it
        if (result.thread_id) {
          console.log("Setting thread ID from result:", result.thread_id);
          setThreadId(result.thread_id);
        }
        
        initialLoadedRef.current = true;
      } catch (e) {
        console.error('Error loading messages', e);
    } finally {
        setLoading(false);
        messagesLoadingRef.current = false;
      }
    };
    
    loadMessages();
    
    // Cleanup function to reset the loading ref when component unmounts
    return () => {
      messagesLoadingRef.current = false;
    };
  }, [chatId, threadId]);

  // Set compliance text when summary changes
  useEffect(() => {
    if (summary) {
      setComplianceText(`Viewing ${summary.symbol} - ${summary.name || 'Unknown'}`);
    } else {
      setComplianceText('');
    }
  }, [summary, setComplianceText]);

  // Toggle sidebar visibility
  const toggleSidebar = useCallback(() => {
    setShowSidebar(prev => !prev);
  }, []);

  return (
    <div className="flex flex-col h-[100dvh] bg-black text-white bg-cover bg-center bg-no-repeat" 
         style={{ 
           backgroundImage: `url(${new URL('../assets/bg.JPG', import.meta.url).toString()})`,
           backgroundBlendMode: 'overlay',
           backgroundColor: 'rgba(0,0,0,0.3)'
         }}>
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Talks List */}
        <TalksSidebar
          chats={chats}
          activeId={chatId}
          onSelect={handleSwitchChat}
          onCreate={handleCreateChat}
          open={showSidebar}
          onClose={() => setShowSidebar(false)}
        />

        {/* Middle: Chat Messages */}
        <div className="relative h-[100dvh] md:h-auto flex-1 flex flex-col overflow-hidden p-0 glass nv-glass--inner-hairline border border-white/10 rounded-2xl m-2">
          <div className="flex items-center justify-between mb-4 absolute top-0 left-0 h-[60px] w-full p-4 z-10 backdrop-blur-md">
            <div className="flex items-center">
              <button
                type="button"
                onClick={toggleSidebar}
                className="mr-3 w-6 h-6 flex items-center justify-center rounded-full bg-[#c19658]/80 hover:bg-[#c19658] text-black transition-colors text-xs"
                aria-label={showSidebar ? "Hide Products" : "Show sidebar"}
              >
                {showSidebar ? "←" : "→"}
              </button>
              <div className="flex gap-2 items-start">
                <p className="text-white !text-4xl trajan-text trajan-text">Proximity</p>
                <p className="text-white text-md trajan-text relative right-1 bottom-1">Search</p>
            <div className="relative right-2 bottom-2 mb-0 ml-0">
              <button
                type="button"
                aria-label="What's this?"
                          onMouseEnter={() => setShowTip(true)}
                          onMouseLeave={() => setShowTip(false)}
                          onFocus={() => setShowTip(true)}
                          onBlur={() => setShowTip(false)}
                          onClick={() => setShowTip((v) => !v)}
                className="w-3 h-3 inline-flex items-center justify-center rounded-full border border-white/40 text-white/80 hover:text-white hover:border-white text-[8px]"
                title="What's this?"
              >
                i
              </button>
              {showTip && (
                <div className="text-[12px] absolute top-full left-1/2 -translate-x-1/2 mt-2 z-10 text-gray-300 bg-black/40 border border-white/10 rounded-md p-2 w-fit whitespace-nowrap">
                  Nirvana's search engine
                </div>
              )}
            </div>
          </div>
                </div>
            
            {hasMatchesInChat && (
              <button
                type="button"
                onClick={handleToggleProducts}
                className="px-2 py-1 rounded-md bg-[#c19658]/80 hover:bg-[#c19658] text-black text-xs transition-colors flex items-center gap-1"
              >
                {matchesOpen ? 'Hide Products List' : 'Show Products List'}
                {matchesOpen ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5"></path>
                    <path d="M12 19l-7-7 7-7"></path>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14"></path>
                    <path d="M12 5l7 7-7 7"></path>
                  </svg>
                )}
              </button>
            )}
        </div>

          <ChatFeed
            ref={chatFeedRef}
            messages={messages}
            matchesOpen={matchesOpen}
            onToggleProducts={handleToggleProducts}
            loadingMore={loadingMore}
            hydrating={loading}
            typing={typing}
            onTopReached={handleLoadMore}
          />
          

          <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
            <form onSubmit={handleSubmit} className="flex items-center gap-3 border border-white/20 rounded-xl glass nv-glass--inner-hairline p-1">
              <div className="px-4 py-3 flex-1 relative">
                <input 
                  ref={inputRef} 
                  type="text" 
                  placeholder="Say anything.." 
                  className="w-full bg-transparent outline-none text-white placeholder:text-gray-400 leading-none" 
                  disabled={locked} 
                />
                {/* Typing indicator in the bottom right corner */}
                {/* Typing indicator removed from here - now handled in ChatFeed component */}
              </div>
                          <button
                type="submit" 
                disabled={locked} 
                className="h-[40px] px-5 mr-1 bg-[#c19658] rounded-xl text-black hover:bg-[#d1a668] transition-colors font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span className="text-sm">Search</span>
                          </button>
            </form>
              </div>
              </div>

        {/* Right: Details or Matches (kept mounted to avoid unmount resets) */}
          <RightPane
            showRight={showRight}
            loadingSummary={loadingSummary}
            summary={summary}
            selected={selected}
            loadingRecs={loadingRecs}
            matches={matches}
            asOf={asOf}
            onShowScoreInfo={() => {}}
            onAskAboutProduct={(symbol, name) => {
              console.log("onAskAboutProduct called with:", symbol, name);
              // Set the input value and submit the form
              if (inputRef.current) {
                inputRef.current.value = `Tell me more about product: ${symbol}`;
                // inputRef.current.value = `Tell me more about product: ${name} (${symbol})`;
                
                // Create a synthetic event that more closely resembles a real submit event
                const syntheticEvent = {
                  preventDefault: () => {},
                  target: { checkValidity: () => true }
                };
                
                console.log("Submitting form with:", inputRef.current.value);
                handleSubmit(syntheticEvent as any);
              }
            }}
            onClose={() => { setShowRight(false); setMatchesOpen(false); }}
          />
        </div>
    </div>
  );
}
