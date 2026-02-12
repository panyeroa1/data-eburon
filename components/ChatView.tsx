
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Citation } from '../types';
import { aiService } from '../services/aiService';

interface ChatViewProps {
  documents: any[];
}

// Audio Helpers for raw PCM playback as per GenAI guidelines
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function playRawPcm(base64Data: string) {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const data = decodeBase64(base64Data.split(',')[1] || base64Data);
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length;
    const buffer = audioContext.createBuffer(1, frameCount, 24000);
    const channelData = buffer.getChannelData(0);
    
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i] / 32768.0;
    }
    
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start();
  } catch (error) {
    console.error("Audio playback failed", error);
  }
}

const ChatView: React.FC<ChatViewProps> = ({ documents }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (overrideInput?: string) => {
    const textToSend = overrideInput || input;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
    };

    setMessages(prev => [...prev, userMsg]);
    if (!overrideInput) setInput('');
    setIsLoading(true);

    try {
      const result = await aiService.chatWithRAG(textToSend, documents);
      
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

  const handleListen = async (msgId: string, text: string) => {
    if (isSpeaking === msgId) return;
    setIsSpeaking(msgId);
    try {
      const audioDataUri = await aiService.textToSpeech(text);
      await playRawPcm(audioDataUri);
    } catch (error) {
      console.error("Speech synthesis failed", error);
    } finally {
      setIsSpeaking(null);
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1];
        const transcription = await aiService.transcribeAudio(base64);
        if (transcription) {
          handleSend(transcription);
        }
      } catch (error) {
        console.error("Transcription failed", error);
        alert("Failed to transcribe audio. Please ensure the file format is supported.");
      } finally {
        setIsLoading(false);
        if (audioInputRef.current) audioInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
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
            <span className="text-[9px] md:text-[11px] font-bold text-slate-600 uppercase tracking-tight">Sovereign Node Active</span>
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
            <div className={`max-w-[90%] md:max-w-[85%] rounded-2xl p-3 md:p-4 relative group ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10' 
                : 'bg-slate-100 text-slate-800'
            }`}>
              <div className="text-xs md:text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</div>
              
              {msg.role === 'assistant' && (
                <button 
                  onClick={() => handleListen(msg.id, msg.content)}
                  className={`absolute -right-10 top-2 w-8 h-8 rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:bg-slate-100 text-slate-400 hover:text-blue-600 ${isSpeaking === msg.id ? 'opacity-100 text-blue-600 animate-pulse' : ''}`}
                  title="Listen to response"
                >
                  <i className={`fa-solid ${isSpeaking === msg.id ? 'fa-waveform' : 'fa-volume-high'} text-xs`}></i>
                </button>
              )}

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
          <input 
            type="file" 
            ref={audioInputRef} 
            className="hidden" 
            accept="audio/*" 
            onChange={handleAudioUpload} 
          />
          <button 
            onClick={() => audioInputRef.current?.click()}
            disabled={isLoading}
            className="w-10 h-10 md:w-14 md:h-14 rounded-2xl border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all shrink-0"
            title="Transcribe Audio"
          >
            <i className="fa-solid fa-microphone-lines text-sm md:text-lg"></i>
          </button>
          
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder="Query files or upload audio..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 md:px-5 md:py-4 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          <button 
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 text-white w-10 h-10 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50 transition-all shrink-0"
          >
            <i className="fa-solid fa-paper-plane text-sm md:text-lg"></i>
          </button>
        </div>
        <p className="text-[9px] text-center text-slate-400 mt-2 uppercase tracking-tighter">
          Engine v2.4 • Multi-Modal • Sovereign Infrastructure
        </p>
      </div>
    </div>
  );
};

export default ChatView;
