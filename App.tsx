
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import DocsView from './components/DocsView';
import ChatView from './components/ChatView';
import PurgeView from './components/PurgeView';
import { Document, AuditLog } from './types';
import { MOCK_DOCS, CURRENT_WORKSPACE_ID, CURRENT_USER_ID } from './constants';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('docs');
  const [docs, setDocs] = useState<Document[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [serverMode, setServerMode] = useState<'cloud' | 'local'>('cloud');

  // Persistence Layer: Load from Local Storage on mount
  useEffect(() => {
    const savedDocs = localStorage.getItem('eburon_docs');
    const savedLogs = localStorage.getItem('eburon_logs');
    const savedServer = localStorage.getItem('eburon_server_mode');
    
    if (savedDocs) setDocs(JSON.parse(savedDocs));
    else setDocs(MOCK_DOCS);

    if (savedLogs) setAuditLogs(JSON.parse(savedLogs));
    if (savedServer) setServerMode(savedServer as 'cloud' | 'local');
    
    setIsLoaded(true);
  }, []);

  // Persistence Layer: Save to Local Storage on change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('eburon_docs', JSON.stringify(docs));
    }
  }, [docs, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('eburon_logs', JSON.stringify(auditLogs));
    }
  }, [auditLogs, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('eburon_server_mode', serverMode);
    }
  }, [serverMode, isLoaded]);

  const addAuditLog = (action: string, targetType: string, targetId?: string, metadata?: any) => {
    const log: AuditLog = {
      id: `LOG-BE-${Date.now()}`,
      workspaceId: CURRENT_WORKSPACE_ID,
      actorId: CURRENT_USER_ID,
      action,
      targetType,
      targetId,
      metadata: { ...metadata, compliance: 'GDPR_V2_AUDIT', server: serverMode },
      createdAt: new Date().toISOString()
    };
    setAuditLogs(prev => [log, ...prev]);
  };

  const handleUpload = (files: FileList) => {
    const newDocs: Document[] = Array.from(files).map((f, i) => ({
      id: `be-file-${Date.now()}-${i}`,
      workspaceId: CURRENT_WORKSPACE_ID,
      title: f.name,
      sourceType: 'upload',
      status: 'processing',
      ocrStatus: 'pending',
      createdAt: new Date().toISOString(),
      mimeType: f.type || 'application/octet-stream',
      bytes: f.size,
      text: "Infrastructure is scanning and extracting structured content...",
      protected: false
    }));

    setDocs(prev => [...prev, ...newDocs]);
    addAuditLog('INGEST_INIT', 'GOV_DOC_BATCH', undefined, { count: newDocs.length, filenames: newDocs.map(d => d.title) });

    // Simulate async processing
    setTimeout(() => {
      setDocs(prev => prev.map(d => 
        newDocs.some(nd => nd.id === d.id) ? { 
          ...d, 
          status: 'ready', 
          ocrStatus: 'completed',
          text: `Administrative analysis completed for ${d.title}. Intelligence patterns extracted and indexed for retrieval.` 
        } : d
      ));
    }, 3000);
  };

  const handleTriggerOCR = (ids: string[]) => {
    // Stage 1: Mark as pending and processing
    setDocs(prev => prev.map(d => 
      ids.includes(d.id) ? { ...d, status: 'processing', ocrStatus: 'pending' } : d
    ));
    
    addAuditLog('MANUAL_OCR_TRIGGER', 'DOCUMENT_BATCH', undefined, { 
      count: ids.length, 
      initiatedAt: new Date().toISOString() 
    });

    // Stage 2: Simulate completion delay
    setTimeout(() => {
      setDocs(prev => prev.map(d => 
        ids.includes(d.id) ? { 
          ...d, 
          status: 'ready', 
          ocrStatus: 'completed', 
          text: `On-demand OCR sequence completed for ${d.title}. Internal audit trace: ${Math.random().toString(36).substring(2, 10).toUpperCase()}. Intelligence node verified: ${serverMode.toUpperCase()}` 
        } : d
      ));
    }, 2500);
  };

  const handleDelete = (id: string) => {
    const doc = docs.find(d => d.id === id);
    if (doc?.protected) return;
    setDocs(prev => prev.filter(d => d.id !== id));
    addAuditLog('MANUAL_DELETE', 'DOCUMENT', id);
  };

  const handleBulkDelete = (ids: string[]) => {
    const targetDocs = docs.filter(d => ids.includes(d.id));
    const deleteableIds = targetDocs.filter(d => !d.protected).map(d => d.id);
    setDocs(prev => prev.filter(d => !deleteableIds.includes(d.id)));
    addAuditLog('BULK_DELETE', 'DOCUMENT_BATCH', undefined, { count: deleteableIds.length });
  };

  const handleToggleProtect = (ids: string[], isProtected: boolean) => {
    setDocs(prev => prev.map(d => ids.includes(d.id) ? { ...d, protected: isProtected } : d));
    addAuditLog(isProtected ? 'SET_PROTECTION' : 'RELEASE_PROTECTION', 'DOCUMENT_BATCH', undefined, { count: ids.length });
  };

  const handlePurge = (filter: any) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - filter.olderThanDays);
    const toDelete = docs.filter(d => new Date(d.createdAt) < cutoff && !d.protected);
    setDocs(prev => prev.filter(d => !toDelete.some(td => td.id === d.id)));
    addAuditLog('COMPLIANCE_PURGE', 'WORKSPACE_CLEANUP', undefined, { filter, deletedCount: toDelete.length });
    alert(`Administrative Purge Complete: ${toDelete.length} records erased.`);
  };

  if (!isLoaded) return null;

  const localInstallScript = `#!/bin/bash
# Eburon RAG Local Infrastructure Setup
echo "Initializing Eburon Local environment..."

# 1. Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# 2. Pull Eburon RAG OCR Model
echo "Pulling Eburon-Pro Vision models..."
ollama pull eburon-pro/vision

# 3. Start Local Inference Engine
echo "Starting Eburon Vision..."
ollama run eburon-pro/vision`;

  return (
    <div className="flex bg-slate-50 min-h-screen font-sans overflow-x-hidden text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="md:hidden fixed top-4 right-4 z-[60] bg-slate-900 text-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl transition-transform active:scale-90"
      >
        <i className={`fa-solid ${isSidebarOpen ? 'fa-xmark' : 'fa-bars-staggered'}`}></i>
      </button>

      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[55] md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

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
              onDelete={handleDelete}
              onBulkDelete={handleBulkDelete}
              onToggleProtect={handleToggleProtect}
              onTriggerOCR={handleTriggerOCR}
            />
          )}
          
          {activeTab === 'chat' && (
            <ChatView documents={docs.filter(d => d.status === 'ready')} />
          )}
          
          {activeTab === 'purge' && (
            <PurgeView documents={docs} onExecutePurge={handlePurge} />
          )}

          {activeTab === 'audit' && (
            <div className="p-4 md:p-6 max-w-6xl mx-auto">
              <header className="mb-10">
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase border-b-4 border-slate-900 pb-2 inline-block">Administrative Audit Logs</h1>
                <p className="text-slate-500 mt-3 text-sm font-medium">Official forensic record for SPF/FPS compliance monitoring and APD/GBA disclosure.</p>
              </header>
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xl shadow-slate-200/50 overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[800px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-5 font-black text-slate-400 text-[10px] uppercase tracking-widest">Action Event</th>
                      <th className="px-6 py-5 font-black text-slate-400 text-[10px] uppercase tracking-widest">Authority ID</th>
                      <th className="px-6 py-5 font-black text-slate-400 text-[10px] uppercase tracking-widest">Resource Type</th>
                      <th className="px-6 py-5 font-black text-slate-400 text-[10px] uppercase tracking-widest text-right">Verification Metadata</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.length === 0 ? (
                       <tr>
                         <td colSpan={4} className="px-6 py-20 text-center text-slate-400 italic">No administrative events recorded in this session.</td>
                       </tr>
                    ) : auditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-5 font-black text-blue-900 text-xs">{log.action}</td>
                        <td className="px-6 py-5 text-slate-400 font-mono text-[10px]">{log.actorId}</td>
                        <td className="px-6 py-5">
                          <span className="bg-slate-100 px-2 py-0.5 rounded-lg text-[10px] font-black text-slate-600 border border-slate-200">
                            {log.targetType}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right text-[10px] text-slate-400 font-mono">
                          {JSON.stringify(log.metadata || {})}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-8">
              <header className="mb-10">
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase border-b-4 border-slate-900 pb-2 inline-block">System Infrastructure</h1>
                <p className="text-slate-500 mt-3 text-sm font-medium">Configure secure processing nodes and institutional jurisdictional settings.</p>
              </header>

              <div className="grid md:grid-cols-1 gap-8">
                {/* Server Settings */}
                <section className="bg-white rounded-3xl border border-slate-200 p-6 md:p-10 space-y-8 shadow-xl shadow-slate-200/50">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 text-xl shadow-inner">
                        <i className="fa-solid fa-microchip"></i>
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 uppercase text-sm tracking-tight">Intelligence Node Selection</h3>
                        <p className="text-xs text-slate-400 font-medium">Select compliant compute environment for OCR/RAG operations.</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <button 
                      onClick={() => setServerMode('cloud')}
                      className={`p-6 rounded-3xl border-2 text-left transition-all relative group ${serverMode === 'cloud' ? 'border-blue-600 bg-blue-50/50 ring-4 ring-blue-50' : 'border-slate-100 hover:border-slate-300'}`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${serverMode === 'cloud' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                          <i className="fa-solid fa-cloud-bolt"></i>
                        </div>
                        {serverMode === 'cloud' && <i className="fa-solid fa-circle-check text-blue-600 text-xl"></i>}
                      </div>
                      <p className="font-black text-slate-900 uppercase text-xs tracking-wider">Sovereign Cloud Node</p>
                      <p className="text-[11px] text-slate-500 leading-relaxed mt-2 font-medium">Secured FPS environment for high-throughput administrative processing.</p>
                    </button>

                    <button 
                      onClick={() => setServerMode('local')}
                      className={`p-6 rounded-3xl border-2 text-left transition-all relative group ${serverMode === 'local' ? 'border-blue-600 bg-blue-50/50 ring-4 ring-blue-50' : 'border-slate-100 hover:border-slate-300'}`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${serverMode === 'local' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                          <i className="fa-solid fa-shield-halved"></i>
                        </div>
                        {serverMode === 'local' && <i className="fa-solid fa-circle-check text-blue-600 text-xl"></i>}
                      </div>
                      <p className="font-black text-slate-900 uppercase text-xs tracking-wider">Local Private Node</p>
                      <p className="text-[11px] text-slate-500 leading-relaxed mt-2 font-medium">Air-gapped on-premise infrastructure. No external traffic footprint.</p>
                    </button>
                  </div>

                  {serverMode === 'local' && (
                    <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="bg-slate-900 rounded-3xl p-8 relative overflow-hidden group">
                        <div className="relative z-10">
                          <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-900 shadow-lg shadow-emerald-500/20">
                              <i className="fa-solid fa-terminal text-xs"></i>
                            </div>
                            <h4 className="text-white font-black uppercase text-xs tracking-widest">Local Provisioning Sequence</h4>
                          </div>
                          
                          <p className="text-slate-400 text-xs mb-6 leading-relaxed">
                            To activate local processing, execute the provisioning script on your secure workstation. This will install the local intelligence layer and pull the necessary Vision models.
                          </p>

                          <div className="relative">
                            <pre className="bg-black/50 text-emerald-400 p-6 rounded-2xl font-mono text-[11px] overflow-x-auto leading-relaxed border border-white/5 scrollbar-hide">
                              {localInstallScript}
                            </pre>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(localInstallScript);
                                alert('Compliance script copied to secure clipboard.');
                              }}
                              className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl text-[10px] uppercase font-black transition-all backdrop-blur-md active:scale-95"
                            >
                              Copy Command
                            </button>
                          </div>
                        </div>
                        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full group-hover:bg-emerald-500/20 transition-all duration-1000"></div>
                      </div>
                    </div>
                  )}
                </section>

                <section className="bg-white rounded-3xl border border-slate-200 p-6 md:p-10 space-y-8 shadow-xl shadow-slate-200/50">
                  <div className="flex items-center gap-2 mb-6 border-l-4 border-yellow-400 pl-4">
                     <h3 className="font-black text-slate-900 uppercase text-sm tracking-tight">Officer Registry Profile</h3>
                  </div>
                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Institutional Service Entity</label>
                      <input type="text" readOnly defaultValue="FPS BOSA - DIGITAL TRANSFORMATION" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-600 font-bold text-sm focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">Administrative Jurisdiction</label>
                      <select className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20 appearance-none">
                         <option>BE-FEDERAL (Kingdom level)</option>
                         <option>BE-VLG (Flanders)</option>
                         <option>BE-WAL (Wallonia)</option>
                         <option>BE-BCR (Brussels)</option>
                      </select>
                    </div>
                  </div>
                </section>

                <section className="pt-4">
                  <div className="p-6 bg-red-50 border border-red-100 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                    <div className="text-center md:text-left">
                      <p className="text-sm font-black text-red-900 uppercase tracking-tight">Security Decommissioning</p>
                      <p className="text-[11px] text-red-800 opacity-70 mt-1 font-medium italic">Complete institutional wipe. This action initiates a secure erasure of all metadata and audit logs from this node.</p>
                    </div>
                    <button className="bg-red-600 text-white px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-900/20 active:scale-95 whitespace-nowrap">Node Wipe</button>
                  </div>
                </section>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
