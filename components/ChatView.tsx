
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Citation } from '../types';
import { aiService } from '../services/aiService';

interface ChatViewProps {
  documents: any[];
}

const ChatView: React.FC<ChatViewProps> = ({ documents }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const result = await aiService.chatWithRAG(input, documents);
      
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.answer,
        citations: result.citations,
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: "Error: Failed to process request. Please check connectivity and security settings.",
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-screen bg-white">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-slate-800 text-sm md:text-base">Eburon RAG Assistant</h2>
          <p className="text-[10px] md:text-xs text-slate-500">{documents.length} active documents</p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full shrink-0">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-[9px] md:text-[11px] font-bold text-slate-600 uppercase tracking-tight">Active</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 scroll-smooth">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto px-4">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-50 rounded-3xl flex items-center justify-center mb-6">
              <i className="fa-solid fa-brain text-blue-500 text-2xl md:text-3xl"></i>
            </div>
            <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-2">Knowledge Assistant</h3>
            <p className="text-slate-500 text-xs md:text-sm">Ask anything about your ingested data. I'll provide answers with verifiable citations.</p>
            <div className="mt-6 md:mt-8 grid grid-cols-1 gap-2 md:gap-3 w-full">
              {['Retention policy?', '2023 report summary', 'Liability clauses'].map(q => (
                <button 
                  key={q} 
                  onClick={() => setInput(q)}
                  className="text-left p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50 text-xs md:text-sm text-slate-600 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] md:max-w-[85%] rounded-2xl p-3 md:p-4 ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10' 
                : 'bg-slate-100 text-slate-800'
            }`}>
              <div className="text-xs md:text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</div>
              
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-200/50 space-y-2">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Sources</p>
                  <div className="flex flex-wrap gap-2">
                    {msg.citations.map((cite, idx) => (
                      <div key={idx} className="bg-white/50 px-2 py-0.5 rounded text-[9px] md:text-[10px] font-medium border border-slate-200 flex items-center gap-1.5">
                        <i className="fa-solid fa-link text-[7px]"></i>
                        {cite.title}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 rounded-2xl p-3 flex gap-2">
              <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce delay-75"></div>
              <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce delay-150"></div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 md:p-4 bg-white border-t border-slate-100">
        <div className="max-w-4xl mx-auto flex items-center gap-2 md:gap-3">
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder="Query files..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 md:px-5 md:py-4 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500">
              <i className="fa-solid fa-microphone text-xs md:text-sm"></i>
            </button>
          </div>
          <button 
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 text-white w-10 h-10 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50 transition-all shrink-0"
          >
            <i className="fa-solid fa-paper-plane text-sm md:text-lg"></i>
          </button>
        </div>
        <p className="text-[9px] text-center text-slate-400 mt-2 uppercase tracking-tighter">
          Engine v2.4 • AI Powered • Secured BE-Gov
        </p>
      </div>
    </div>
  );
};

export default ChatView;
