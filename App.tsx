
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import DocsView from './components/DocsView';
import ChatView from './components/ChatView';
import PurgeView from './components/PurgeView';
import { Document, AuditLog, ChatMessage } from './types';
import { MOCK_DOCS, BE_GOV_WEBSITES, CURRENT_WORKSPACE_ID, CURRENT_USER_ID, MAX_FILE_SIZE, ALLOWED_MIME_TYPES } from './constants';
import { aiService } from './services/aiService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('docs');
  const [docs, setDocs] = useState<Document[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [serverMode, setServerMode] = useState<'cloud' | 'local'>('cloud');

  useEffect(() => {
    const savedDocs = localStorage.getItem('eburon_docs');
    const savedLogs = localStorage.getItem('eburon_logs');
    const savedServer = localStorage.getItem('eburon_server_mode');
    const savedMessages = localStorage.getItem('eburon_messages');
    
    if (savedDocs) {
      setDocs(JSON.parse(savedDocs));
    } else {
      // Initialize with Mock Docs + Showcase Websites for 2025-2026
      const showcaseDocs: Document[] = BE_GOV_WEBSITES.map((site, i) => ({
        id: `showcase-be-${i}`,
        workspaceId: CURRENT_WORKSPACE_ID,
        title: site.title,
        sourceType: 'url',
        status: 'ready',
        ocrStatus: 'not_required',
        createdAt: new Date().toISOString(),
        mimeType: 'text/html',
        bytes: 0,
        text: `Official Belgian Governance portal (2025-2026 Active Node): ${site.url}. This node is pre-indexed for institutional RAG capabilities.`,
        protected: true,
        extractedData: {
          documentType: "GOVERNMENT_PORTAL",
          entity: site.title,
          summary: "Indexed institutional web gateway for 2025-2026 Belgian administration."
        }
      }));
      setDocs([...MOCK_DOCS, ...showcaseDocs]);
    }

    if (savedLogs) setAuditLogs(JSON.parse(savedLogs));
    if (savedServer) setServerMode(savedServer as 'cloud' | 'local');
    if (savedMessages) setMessages(JSON.parse(savedMessages));
    
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) localStorage.setItem('eburon_docs', JSON.stringify(docs));
  }, [docs, isLoaded]);

  useEffect(() => {
    if (isLoaded) localStorage.setItem('eburon_logs', JSON.stringify(auditLogs));
  }, [auditLogs, isLoaded]);

  useEffect(() => {
    if (isLoaded) localStorage.setItem('eburon_server_mode', serverMode);
  }, [serverMode, isLoaded]);

  useEffect(() => {
    if (isLoaded) localStorage.setItem('eburon_messages', JSON.stringify(messages));
  }, [messages, isLoaded]);

  const addAuditLog = (action: string, targetType: string, targetId?: string, metadata?: any) => {
    const log: AuditLog = {
      id: `LOG-BE-${Date.now()}`,
      workspaceId: CURRENT_WORKSPACE_ID,
      actorId: CURRENT_USER_ID,
      action,
      targetType,
      targetId,
      metadata: { ...metadata, compliance: 'GDPR_2025_AUDIT', server: serverMode },
      createdAt: new Date().toISOString()
    };
    setAuditLogs(prev => [log, ...prev]);
  };

  const handleUpload = async (files: FileList) => {
    const fileArray = Array.from(files);
    const newDocs: Document[] = fileArray.map((f, i) => {
      const isSizeValid = f.size <= MAX_FILE_SIZE;
      const isTypeValid = ALLOWED_MIME_TYPES.includes(f.type);
      const status = (!isSizeValid || !isTypeValid) ? 'error' : 'processing';
      return {
        id: `be-file-${Date.now()}-${i}`,
        workspaceId: CURRENT_WORKSPACE_ID,
        title: f.name,
        sourceType: 'upload',
        status,
        ocrStatus: status === 'error' ? 'failed' : 'pending',
        createdAt: new Date().toISOString(),
        mimeType: f.type || 'application/octet-stream',
        bytes: f.size,
        text: status === 'error' ? "Rejected: Compliance failure." : "Scanning for 2025 patterns...",
        protected: false
      };
    });

    setDocs(prev => [...newDocs, ...prev]);
    addAuditLog('INGEST_INIT', 'DOC_BATCH', undefined, { count: newDocs.length });

    newDocs.forEach(async (doc, idx) => {
      if (doc.status !== 'processing') return;
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        try {
          const res = await aiService.performOCR(base64, fileArray[idx].type);
          setDocs(prev => prev.map(d => d.id === doc.id ? { 
            ...d, status: 'ready', ocrStatus: 'completed', text: res.fullText, extractedData: res 
          } : d));
          addAuditLog('OCR_SUCCESS', 'DOCUMENT', doc.id);
        } catch (e) {
          setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, status: 'error' } : d));
        }
      };
      reader.readAsDataURL(fileArray[idx]);
    });
  };

  const handleCameraCapture = async (base64: string) => {
    const docId = `capture-${Date.now()}`;
    const newDoc: Document = {
      id: docId,
      workspaceId: CURRENT_WORKSPACE_ID,
      title: `Camera Scan ${new Date().toLocaleTimeString()}`,
      sourceType: 'manual',
      status: 'processing',
      ocrStatus: 'pending',
      createdAt: new Date().toISOString(),
      mimeType: 'image/jpeg',
      bytes: base64.length * 0.75, // Estimate
      text: "Sovereign OCR in progress...",
      protected: false
    };

    setDocs(prev => [newDoc, ...prev]);
    addAuditLog('CAMERA_SCAN_START', 'DOCUMENT', docId);

    try {
      const res = await aiService.performOCR(base64, 'image/jpeg');
      setDocs(prev => prev.map(d => d.id === docId ? { 
        ...d, status: 'ready', ocrStatus: 'completed', text: res.fullText, extractedData: res 
      } : d));
      addAuditLog('OCR_SUCCESS', 'CAMERA_DOCUMENT', docId);
      // Automatically switch to chat if it was a camera capture for immediate questioning
      setActiveTab('chat');
    } catch (e) {
      setDocs(prev => prev.map(d => d.id === docId ? { ...d, status: 'error' } : d));
    }
  };

  const handleUrlIngest = async (url: string) => {
    const docId = `web-${Date.now()}`;
    const placeholder: Document = {
      id: docId,
      workspaceId: CURRENT_WORKSPACE_ID,
      title: "Fetching 2025 Sovereign Content...",
      sourceType: 'url',
      status: 'processing',
      ocrStatus: 'not_required',
      createdAt: new Date().toISOString(),
      mimeType: 'text/html',
      bytes: 0,
      text: `Processing external knowledge node (2025-2026): ${url}`,
      protected: false
    };

    setDocs(prev => [placeholder, ...prev]);
    addAuditLog('URL_INGEST_START', 'WEB_NODE', docId, { url });

    try {
      const result = await aiService.ingestUrl(url);
      setDocs(prev => prev.map(d => d.id === docId ? {
        ...d,
        title: result.title || url,
        status: 'ready',
        text: result.fullText,
        extractedData: {
          documentType: "WEB_RESOURCE",
          summary: result.summary,
          entity: "Belgian Web Node (2025)"
        }
      } : d));
      addAuditLog('URL_INGEST_SUCCESS', 'WEB_NODE', docId);
    } catch (e) {
      setDocs(prev => prev.map(d => d.id === docId ? { ...d, status: 'error', title: "Fetch Failed" } : d));
    }
  };

  const archiveInteractionAsDoc = (text: string) => {
    const docId = `interaction-${Date.now()}`;
    const newDoc: Document = {
      id: docId,
      workspaceId: CURRENT_WORKSPACE_ID,
      title: `Interaction Record ${new Date().toLocaleTimeString()}`,
      sourceType: 'manual',
      status: 'ready',
      ocrStatus: 'not_required',
      createdAt: new Date().toISOString(),
      mimeType: 'text/plain',
      bytes: new Blob([text]).size,
      text: text,
      protected: false
    };
    setDocs(prev => [newDoc, ...prev]);
  };

  const handleTriggerOCR = (ids: string[]) => {
    setDocs(prev => prev.map(d => ids.includes(d.id) ? { ...d, status: 'processing', ocrStatus: 'pending' } : d));
    setTimeout(() => {
      setDocs(prev => prev.map(d => ids.includes(d.id) ? { ...d, status: 'ready', ocrStatus: 'completed' } : d));
    }, 2000);
  };

  const handleDelete = (id: string) => setDocs(prev => prev.filter(d => d.id !== id || d.protected));
  const handleBulkDelete = (ids: string[]) => setDocs(prev => prev.filter(d => !ids.includes(d.id) || d.protected));
  const handleToggleProtect = (ids: string[], isP: boolean) => setDocs(prev => prev.map(d => ids.includes(d.id) ? { ...d, protected: isP } : d));

  const handlePurge = (filter: any) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - filter.olderThanDays);
    setDocs(prev => prev.filter(d => new Date(d.createdAt) >= cutoff || d.protected));
    alert("Purge complete for the 2025 compliance record.");
  };

  if (!isLoaded) return null;

  return (
    <div className="flex bg-slate-50 min-h-screen font-sans overflow-x-hidden text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(tab) => { setActiveTab(tab); setIsSidebarOpen(false); }} 
        isOpen={isSidebarOpen}
      />
      
      <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-0' : 'md:ml-64'} min-h-screen w-full`}>
        <div className="md:ml-0 pt-20 md:pt-0">
          {activeTab === 'docs' && (
            <DocsView 
              documents={docs} 
              onUpload={handleUpload} 
              onUrlIngest={handleUrlIngest}
              onDelete={handleDelete}
              onBulkDelete={handleBulkDelete}
              onToggleProtect={handleToggleProtect}
              onTriggerOCR={handleTriggerOCR}
              onCameraCapture={handleCameraCapture}
            />
          )}
          
          {activeTab === 'chat' && (
            <ChatView 
              documents={docs.filter(d => d.status === 'ready')} 
              messages={messages}
              setMessages={setMessages}
              onArchiveInteraction={archiveInteractionAsDoc}
            />
          )}
          
          {activeTab === 'purge' && <PurgeView documents={docs} onExecutePurge={handlePurge} />}
          {activeTab === 'audit' && (
            <div className="p-6 max-w-6xl mx-auto">
              <h1 className="text-2xl font-black border-b-4 border-slate-900 pb-2 inline-block uppercase">2025-2026 Audit Record</h1>
              <div className="bg-white mt-8 rounded-3xl border border-slate-200 overflow-hidden shadow-xl">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-6 py-4 font-black uppercase text-[10px]">Action</th>
                      <th className="px-6 py-4 font-black uppercase text-[10px]">Resource</th>
                      <th className="px-6 py-4 font-black uppercase text-[10px]">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {auditLogs.map(log => (
                      <tr key={log.id}>
                        <td className="px-6 py-4 font-bold text-blue-900">{log.action}</td>
                        <td className="px-6 py-4 text-slate-500 font-mono text-[10px]">{log.targetType}</td>
                        <td className="px-6 py-4 text-slate-400 text-xs">{new Date(log.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
