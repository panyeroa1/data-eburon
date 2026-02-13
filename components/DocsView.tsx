
import React, { useState, useRef, useEffect } from 'react';
import { Document } from '../types';
import { MAX_FILE_SIZE, ALLOWED_MIME_TYPES } from '../constants';

interface DocsViewProps {
  documents: Document[];
  onUpload: (files: FileList) => void;
  onUrlIngest: (url: string) => void;
  onDelete: (id: string) => void;
  onBulkDelete: (ids: string[]) => void;
  onToggleProtect: (ids: string[], isProtected: boolean) => void;
  onTriggerOCR: (ids: string[]) => void;
  onCameraCapture: (base64: string) => void;
}

const DocsView: React.FC<DocsViewProps> = ({ 
  documents, 
  onUpload, 
  onUrlIngest,
  onDelete, 
  onBulkDelete, 
  onToggleProtect,
  onTriggerOCR,
  onCameraCapture
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [urlInput, setUrlInput] = useState('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access denied", err);
      alert("Please allow camera access to scan documents.");
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL('image/jpeg').split(',')[1];
        onCameraCapture(base64);
        stopCamera();
      }
    }
  };

  const validateAndUpload = (files: FileList) => {
    onUpload(files);
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      onUrlIngest(urlInput.trim());
      setUrlInput('');
    }
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
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const getFileIcon = (mimeType: string, sourceType: string) => {
    if (sourceType === 'url') return 'fa-globe text-blue-500';
    if (mimeType.includes('pdf')) return 'fa-file-pdf text-red-500';
    if (mimeType.includes('word')) return 'fa-file-word text-blue-600';
    if (mimeType.includes('image')) return 'fa-file-image text-purple-500';
    return 'fa-file text-slate-400';
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6 md:space-y-8">
      <header className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight uppercase">Governance Corpus</h1>
            <p className="text-slate-500 mt-1 text-sm font-medium">Sovereign repository: Ingest paperwork, web nodes, or live captures.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <form onSubmit={handleUrlSubmit} className="flex flex-1">
              <input 
                type="url"
                placeholder="Ingest BE-Gov URL..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="flex-1 bg-white border border-slate-200 rounded-l-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
              <button type="submit" className="bg-slate-900 text-white px-4 rounded-r-xl border border-slate-900 hover:bg-black transition-all">
                <i className="fa-solid fa-cloud-arrow-down"></i>
              </button>
            </form>
            <div className="flex gap-2 shrink-0">
               <button 
                onClick={startCamera}
                className="bg-slate-800 hover:bg-slate-900 text-white w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-lg active:scale-95"
                title="Scan Document with Camera"
              >
                <i className="fa-solid fa-camera"></i>
              </button>
              <label className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-3 rounded-xl font-bold cursor-pointer transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 active:scale-95">
                <i className="fa-solid fa-file-export"></i>
                <span>Upload</span>
                <input type="file" multiple className="hidden" onChange={(e) => e.target.files && validateAndUpload(e.target.files)} />
              </label>
            </div>
          </div>
        </div>
      </header>

      {/* Camera Overlay */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4">
          <div className="relative max-w-2xl w-full aspect-[3/4] bg-slate-800 rounded-3xl overflow-hidden border-4 border-slate-700 shadow-2xl">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute inset-x-8 inset-y-12 border-2 border-white/30 border-dashed rounded-lg pointer-events-none">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-yellow-400"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-yellow-400"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-yellow-400"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-yellow-400"></div>
            </div>
            <div className="absolute bottom-8 inset-x-0 flex justify-center gap-8 items-center">
              <button onClick={stopCamera} className="w-12 h-12 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center">
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
              <button onClick={capturePhoto} className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-xl active:scale-90 transition-transform">
                <div className="w-16 h-16 rounded-full border-4 border-slate-900"></div>
              </button>
              <div className="w-12"></div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>
          <p className="text-white/60 font-black uppercase text-[10px] tracking-[0.2em] mt-6">Position document within frame • BE-GOV Sovereign Scanner</p>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="bg-slate-900 text-white p-3 rounded-2xl flex items-center justify-between shadow-xl border border-slate-700">
          <span className="font-bold text-sm px-4">{selectedIds.size} nodes selected</span>
          <button onClick={() => onBulkDelete(Array.from(selectedIds))} className="bg-red-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-700 transition-all mr-2">Purge Selected</button>
        </div>
      )}

      {/* Grid Status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Knowledge Nodes</p>
            <p className="text-2xl font-black text-slate-900">{documents.length}</p>
         </div>
         <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Web Sources</p>
            <p className="text-2xl font-black text-blue-600">{documents.filter(d => d.sourceType === 'url').length}</p>
         </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[950px]">
            <thead className="bg-slate-50 border-b text-[10px] uppercase font-black">
              <tr>
                <th className="px-6 py-4 w-12 text-center">
                  <input type="checkbox" checked={selectedIds.size === documents.length} onChange={toggleSelectAll} className="w-4 h-4" />
                </th>
                <th className="px-6 py-4">Sovereign Asset</th>
                <th className="px-6 py-4">Data Metadata</th>
                <th className="px-6 py-4">Lifecycle Status</th>
                <th className="px-6 py-4 text-right">Ops</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50 transition-all">
                  <td className="px-6 py-4 text-center">
                    <input type="checkbox" checked={selectedIds.has(doc.id)} onChange={() => toggleSelect(doc.id)} className="w-4 h-4" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border flex items-center justify-center text-lg">
                        <i className={`fa-solid ${getFileIcon(doc.mimeType, doc.sourceType)}`}></i>
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate max-w-[300px]">{doc.title}</p>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{doc.sourceType} Node</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5 items-start">
                      {doc.extractedData?.documentType && (
                        <span className="bg-slate-900 text-yellow-400 text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border border-slate-700 shadow-sm flex items-center gap-1.5 mb-1 group-hover:scale-105 transition-transform">
                          <i className="fa-solid fa-file-signature text-[8px]"></i>
                          {doc.extractedData.documentType}
                        </span>
                      )}
                      <div className="flex flex-wrap gap-1">
                        {doc.extractedData?.niss && (
                          <span className="bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase px-2 py-0.5 rounded border border-emerald-100">
                            NISS: {doc.extractedData.niss}
                          </span>
                        )}
                        {doc.extractedData?.date && (
                          <span className="bg-slate-50 text-slate-500 text-[9px] font-black uppercase px-2 py-0.5 rounded border border-slate-100">
                            {doc.extractedData.date}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                      doc.status === 'ready' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800 animate-pulse'
                    }`}>
                      {doc.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => onDelete(doc.id)} disabled={doc.protected} className="text-slate-300 hover:text-red-600 disabled:opacity-30 p-2">
                       <i className="fa-solid fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DocsView;
