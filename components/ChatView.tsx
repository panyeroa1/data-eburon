
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, Citation } from '../types';
import { aiService } from '../services/aiService';

interface ChatViewProps {
  documents: any[];
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  onArchiveInteraction?: (text: string) => void;
}

// Audio Helpers for raw PCM playback
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

const ChatView: React.FC<ChatViewProps> = ({ documents, messages, setMessages, onArchiveInteraction }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcribingStatus, setTranscribingStatus] = useState<string | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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
    
    // Save this input as reference data (Interaction Record)
    if (onArchiveInteraction) {
      onArchiveInteraction(textToSend);
    }

    if (!overrideInput) setInput('');
    setIsLoading(true);

    try {
      // Use messages history as part of the reference data for RAG
      const result = await aiService.chatWithRAG(textToSend, documents, messages);
      
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
        content: "Error: Failed to process request. Intelligence node reporting infrastructure failure.",
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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(',')[1];
          setTranscribingStatus("Verifying sequence...");
          setIsLoading(true);
          try {
            const transcription = await aiService.transcribeAudio(base64, 'audio/webm');
            if (transcription) setInput(transcription);
          } catch (e) {
            console.error("Transcription error", e);
          } finally {
            setIsLoading(false);
            setTranscribingStatus(null);
          }
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start recording", err);
      alert("Microphone access denied or infrastructure not supported.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setTranscribingStatus("Analyzing frequency...");
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1];
        const transcription = await aiService.transcribeAudio(base64, file.type);
        if (transcription) {
          setInput(transcription);
        }
      } catch (error) {
        console.error("Transcription failed", error);
        alert("Failed to transcribe audio. Verify file format compliance.");
      } finally {
        setIsLoading(false);
        setTranscribingStatus(null);
        if (audioInputRef.current) audioInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-screen bg-white">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white z-10">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-slate-800 text-sm md:text-base tracking-tight uppercase">Eburon Interaction Node</h2>
            <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded text-[8px] font-black border border-emerald-100">
               <i className="fa-solid fa-database"></i>
               PERSISTENT
            </div>
          </div>
          <p className="text-[10px] md:text-xs text-slate-500 font-medium">Indexing all inputs to Sovereign Knowledge Base</p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-1.5 bg-blue-50 px-3 py-1 rounded-full shrink-0 border border-blue-100">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-[9px] md:text-[10px] font-black text-blue-700 uppercase tracking-widest">RAG Synced</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 scroll-smooth bg-slate-50/30">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto px-4">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-100 rounded-3xl flex items-center justify-center mb-6 shadow-inner ring-8 ring-blue-50">
              <i className="fa-solid fa-shield-halved text-blue-600 text-2xl md:text-3xl"></i>
            </div>
            <h3 className="text-lg md:text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">Active Intelligence</h3>
            <p className="text-slate-500 text-xs md:text-sm font-medium">Query ingested data or submit voice prompts. All dialogue is automatically archived as reference metadata for future retrieval.</p>
            <div className="mt-6 md:mt-8 grid grid-cols-1 gap-2 md:gap-3 w-full">
              {['What is the retention policy?', 'Summarize 2023 reports', 'Identify liability clauses'].map(q => (
                <button 
                  key={q} 
                  onClick={() => setInput(q)}
                  className="text-left p-3 rounded-xl border border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50 text-xs md:text-sm text-slate-600 font-bold transition-all shadow-sm"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] md:max-w-[85%] rounded-2xl p-3 md:p-4 relative group shadow-sm border ${
              msg.role === 'user' 
                ? 'bg-slate-900 text-white border-slate-950' 
                : 'bg-white text-slate-800 border-slate-200'
            }`}>
              <div className="text-xs md:text-sm leading-relaxed whitespace-pre-wrap font-medium">{msg.content}</div>
              
              {msg.role === 'assistant' && (
                <button 
                  onClick={() => handleListen(msg.id, msg.content)}
                  className={`absolute -right-10 top-2 w-8 h-8 rounded-xl flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:shadow-md ${isSpeaking === msg.id ? 'opacity-100 text-blue-600 animate-pulse' : ''}`}
                  title="Listen to response"
                >
                  <i className={`fa-solid ${isSpeaking === msg.id ? 'fa-waveform' : 'fa-volume-high'} text-xs`}></i>
                </button>
              )}

              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <i className="fa-solid fa-file-contract text-[8px]"></i>
                    Verification Sources
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {msg.citations.map((cite, idx) => (
                      <div key={idx} className="bg-slate-50 px-2 py-1 rounded text-[9px] md:text-[10px] font-bold text-slate-600 border border-slate-100 flex items-center gap-1.5 shadow-sm">
                        <i className="fa-solid fa-link text-[7px] text-blue-500"></i>
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
            <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex flex-col gap-2 shadow-sm min-w-[120px]">
              <div className="flex gap-2">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce delay-75"></div>
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce delay-150"></div>
              </div>
              {transcribingStatus && (
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest animate-pulse">
                  {transcribingStatus}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 md:p-6 bg-white border-t border-slate-100 shadow-2xl relative z-20">
        <div className="max-w-4xl mx-auto flex items-center gap-2 md:gap-4">
          <div className="flex gap-1 md:gap-2">
             <input 
              type="file" 
              ref={audioInputRef} 
              className="hidden" 
              accept="audio/*" 
              onChange={handleAudioUpload} 
            />
            <button 
              onClick={() => audioInputRef.current?.click()}
              disabled={isLoading || isRecording}
              className="w-10 h-10 md:w-12 md:h-12 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all shrink-0 shadow-sm disabled:opacity-30"
              title="Upload Audio Reference"
            >
              <i className="fa-solid fa-file-audio text-sm md:text-base"></i>
            </button>
            <button 
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLoading}
              className={`w-10 h-10 md:w-12 md:h-12 rounded-xl border flex items-center justify-center transition-all shrink-0 shadow-sm ${
                isRecording 
                  ? 'bg-red-600 border-red-700 text-white animate-pulse scale-110 shadow-lg shadow-red-200' 
                  : 'bg-white border-slate-200 text-slate-400 hover:text-blue-600 hover:bg-blue-50'
              }`}
              title={isRecording ? "Stop Recording" : "Voice Transcription"}
            >
              <i className={`fa-solid ${isRecording ? 'fa-stop' : 'fa-microphone-lines'} text-sm md:text-base`}></i>
            </button>
          </div>
          
          <div className="relative flex-1 group">
            <input 
              type="text" 
              placeholder={isRecording ? "Sovereign Audio Input Active..." : "Query infrastructure or use voice..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className={`w-full border-2 rounded-2xl px-4 py-3 md:px-6 md:py-4 text-xs md:text-sm font-bold transition-all placeholder:text-slate-400 focus:outline-none ${
                isRecording 
                  ? 'bg-red-50 border-red-200 text-red-900 focus:ring-red-500/10 focus:border-red-400' 
                  : 'bg-slate-50 border-slate-100 text-slate-800 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500'
              }`}
            />
            {isRecording && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                 <div className="flex gap-1">
                    <div className="w-1 h-3 bg-red-400 rounded-full animate-bounce"></div>
                    <div className="w-1 h-3 bg-red-400 rounded-full animate-bounce delay-100"></div>
                    <div className="w-1 h-3 bg-red-400 rounded-full animate-bounce delay-200"></div>
                 </div>
                 <span className="text-[8px] font-black text-red-600 uppercase tracking-widest hidden sm:inline">Rec Active</span>
              </div>
            )}
          </div>

          <button 
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim() || isRecording}
            className="bg-blue-700 text-white w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 hover:bg-blue-800 disabled:opacity-50 transition-all shrink-0"
          >
            <i className="fa-solid fa-paper-plane text-sm md:text-base"></i>
          </button>
        </div>
        <div className="flex justify-center items-center gap-4 mt-3">
           <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-2">
            <i className="fa-solid fa-fingerprint text-[8px]"></i>
            Sovereign Engine v2.4 • Dialogue persisted as manual reference
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatView;