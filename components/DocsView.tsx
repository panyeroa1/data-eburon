
import React, { useState } from 'react';
import { Document } from '../types';

interface DocsViewProps {
  documents: Document[];
  onUpload: (files: FileList) => void;
  onDelete: (id: string) => void;
  onBulkDelete: (ids: string[]) => void;
  onToggleProtect: (ids: string[], isProtected: boolean) => void;
}

const DocsView: React.FC<DocsViewProps> = ({ documents, onUpload, onDelete, onBulkDelete, onToggleProtect }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) onUpload(e.target.files);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === documents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(documents.map(d => d.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleBulkDeleteAction = () => {
    if (confirm(`Are you sure you want to delete ${selectedIds.size} documents?`)) {
      onBulkDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const handleBulkProtectAction = (isProtected: boolean) => {
    onToggleProtect(Array.from(selectedIds), isProtected);
    setSelectedIds(new Set());
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return 'fa-file-pdf text-red-500';
    if (mimeType.includes('word') || mimeType.includes('msword')) return 'fa-file-word text-blue-600';
    if (mimeType.includes('csv') || mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'fa-file-csv text-emerald-600';
    if (mimeType.includes('image')) return 'fa-file-image text-purple-500';
    if (mimeType.includes('text')) return 'fa-file-lines text-slate-500';
    return 'fa-file text-slate-400';
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6 md:space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight uppercase">Governance Corpus</h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">Manage institutional data assets and track automated OCR/Index status.</p>
        </div>
        <label className="w-full md:w-auto bg-blue-700 hover:bg-blue-800 text-white px-6 py-3 rounded-xl font-bold cursor-pointer transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 active:scale-95">
          <i className="fa-solid fa-cloud-arrow-up"></i>
          <span>Ingest Data</span>
          <input 
            type="file" 
            multiple 
            className="hidden" 
            onChange={handleFileSelect} 
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,image/*"
          />
        </label>
      </header>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-slate-900 text-white p-3 md:p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <button 
              onClick={() => setSelectedIds(new Set())}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>
            <span className="font-bold text-sm">
              {selectedIds.size} objects selected
            </span>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button 
              onClick={() => handleBulkProtectAction(true)}
              className="bg-slate-800 hover:bg-slate-700 text-[10px] md:text-xs px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-bold transition-all flex items-center gap-2 border border-slate-700"
            >
              <i className="fa-solid fa-lock text-yellow-500"></i>
              Legal Hold
            </button>
            <button 
              onClick={() => handleBulkProtectAction(false)}
              className="bg-slate-800 hover:bg-slate-700 text-[10px] md:text-xs px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-bold transition-all flex items-center gap-2 border border-slate-700"
            >
              <i className="fa-solid fa-lock-open"></i>
              Release
            </button>
            <div className="w-px h-6 bg-slate-700 mx-1 hidden md:block"></div>
            <button 
              onClick={handleBulkDeleteAction}
              className="bg-red-600 hover:bg-red-700 text-[10px] md:text-xs px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-bold transition-all flex items-center gap-2 shadow-lg shadow-red-900/20"
            >
              <i className="fa-solid fa-trash-can"></i>
              Purge
            </button>
          </div>
        </div>
      )}

      {/* Upload Dropzone */}
      <div 
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files) onUpload(e.dataTransfer.files); }}
        className={`border-2 border-dashed rounded-3xl p-6 md:p-12 text-center transition-all duration-300 relative overflow-hidden ${
          isDragging ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 bg-white hover:border-slate-300 shadow-sm'
        }`}
      >
        <div className="relative z-10">
          <div className="mx-auto w-16 h-16 md:w-20 md:h-20 bg-blue-100/50 rounded-3xl flex items-center justify-center mb-6 ring-8 ring-blue-50">
            <i className="fa-solid fa-folder-plus text-blue-600 text-2xl md:text-3xl"></i>
          </div>
          <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-2">Multi-Format Ingestion</h3>
          <p className="text-slate-500 text-xs md:text-sm mb-6 max-w-md mx-auto">
            Drop Case Files, Administrative Records, or Media Assets. Support for PDF, Office, CSV, and Images with automatic OCR.
          </p>
          <div className="flex flex-wrap justify-center gap-3 text-[10px] md:text-xs font-bold">
            <span className="bg-slate-100 px-3 py-1.5 rounded-full text-slate-600 border border-slate-200">PDF</span>
            <span className="bg-slate-100 px-3 py-1.5 rounded-full text-slate-600 border border-slate-200">DOCX</span>
            <span className="bg-slate-100 px-3 py-1.5 rounded-full text-slate-600 border border-slate-200">CSV/XLS</span>
            <span className="bg-slate-100 px-3 py-1.5 rounded-full text-slate-600 border border-slate-200">MEDIA</span>
            <span className="bg-slate-100 px-3 py-1.5 rounded-full text-slate-600 border border-slate-200">TEXT</span>
          </div>
        </div>
        {isDragging && <div className="absolute inset-0 bg-blue-600/5 animate-pulse"></div>}
      </div>

      {/* Docs List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[850px]">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-[10px] md:text-xs backdrop-blur-sm">
              <tr>
                <th className="px-4 md:px-6 py-5 w-12 text-center">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.size === documents.length && documents.length > 0}
                    onChange={toggleSelectAll}
                    className="w-5 h-5 rounded-lg border-slate-300 text-blue-700 focus:ring-blue-600 focus:ring-offset-0"
                  />
                </th>
                <th className="px-4 md:px-6 py-5 font-black text-slate-400 uppercase tracking-widest">Administrative Object</th>
                <th className="px-4 md:px-6 py-5 font-black text-slate-400 uppercase tracking-widest">Compliance Status</th>
                <th className="px-4 md:px-6 py-5 font-black text-slate-400 uppercase tracking-widest">OCR Index</th>
                <th className="px-4 md:px-6 py-5 font-black text-slate-400 uppercase tracking-widest">Registry Date</th>
                <th className="px-4 md:px-6 py-5 font-black text-slate-400 uppercase tracking-widest text-right">Ops</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-24 text-center">
                    <div className="max-w-xs mx-auto opacity-30 grayscale">
                       <i className="fa-solid fa-box-open text-6xl mb-4 block"></i>
                       <p className="font-bold text-slate-900 uppercase tracking-widest text-xs">Repository Exhausted</p>
                       <p className="text-xs mt-1">No active documents detected in this governance node.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id} className={`hover:bg-blue-50/30 transition-all group ${selectedIds.has(doc.id) ? 'bg-blue-50/70' : ''}`}>
                    <td className="px-4 md:px-6 py-5 text-center">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.has(doc.id)}
                        onChange={() => toggleSelect(doc.id)}
                        className="w-5 h-5 rounded-lg border-slate-300 text-blue-700 focus:ring-blue-600 focus:ring-offset-0"
                      />
                    </td>
                    <td className="px-4 md:px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-xl shadow-sm group-hover:shadow transition-all shrink-0">
                          <i className={`fa-solid ${getFileIcon(doc.mimeType)}`}></i>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-bold text-slate-800 text-xs md:text-sm truncate">{doc.title}</p>
                            {doc.protected && (
                              <span className="bg-yellow-100 text-yellow-800 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-yellow-200 flex items-center gap-1 shrink-0 shadow-sm animate-pulse">
                                <i className="fa-solid fa-shield-halved text-[8px]"></i>
                                Hold
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 uppercase font-bold tracking-tight">
                            <span>{(doc.bytes / 1024).toFixed(0)} KB</span>
                            <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                            <span>{doc.sourceType}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-5">
                      <span className={`px-3 py-1 rounded-full text-[9px] md:text-[10px] font-black tracking-widest ${
                        doc.status === 'ready' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 
                        doc.status === 'processing' ? 'bg-blue-100 text-blue-800 animate-pulse border border-blue-200' : 
                        'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}>
                        {doc.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          doc.ocrStatus === 'completed' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                          doc.ocrStatus === 'pending' ? 'bg-blue-500 animate-pulse' :
                          doc.ocrStatus === 'failed' ? 'bg-red-500' : 'bg-slate-300'
                        }`}></div>
                        <span className="text-[10px] md:text-xs text-slate-600 font-bold tracking-tight">
                          {doc.ocrStatus.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-5">
                       <div className="text-xs text-slate-500 font-medium">
                          {new Date(doc.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                       </div>
                    </td>
                    <td className="px-4 md:px-6 py-5 text-right">
                      <div className="flex justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all transform md:group-hover:translate-x-0 md:translate-x-2">
                        <button 
                          onClick={() => onDelete(doc.id)}
                          disabled={doc.protected}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                            doc.protected ? 'text-slate-200 bg-slate-50 cursor-not-allowed' : 'text-slate-400 hover:text-red-600 hover:bg-red-50 hover:shadow-sm'
                          }`}
                        >
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DocsView;
