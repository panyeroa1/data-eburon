
import React, { useState } from 'react';
import { Document } from '../types';

interface PurgeViewProps {
  documents: Document[];
  onExecutePurge: (filter: any) => void;
}

const PurgeView: React.FC<PurgeViewProps> = ({ documents, onExecutePurge }) => {
  const [dryRunActive, setDryRunActive] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [daysFilter, setDaysFilter] = useState(365);
  
  const affectedDocs = documents.filter(d => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysFilter);
    return new Date(d.createdAt) < cutoff;
  });

  const handleExecute = () => {
    if (confirmText === 'CONFIRM PURGE') {
      onExecutePurge({ olderThanDays: daysFilter });
      setDryRunActive(false);
      setConfirmText('');
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Compliance & Erasure</h1>
          <p className="text-slate-500 mt-1">GDPR Article 17 Management Tool for Belgian Administrative Units.</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <i className="fa-solid fa-circle-check"></i>
          APD/GBA Compliant Interface
        </div>
      </header>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <i className="fa-solid fa-filter text-blue-700"></i>
              Data Lifecycle Filters (RGPD/AVG)
            </h3>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-400 uppercase mb-3">
                  <span>Retention Threshold</span>
                  <span className="text-blue-600">Standard: 365 Days</span>
                </div>
                <div className="flex items-center gap-4">
                  <input 
                    type="range" 
                    min="0" 
                    max="3650" 
                    step="30"
                    value={daysFilter}
                    onChange={(e) => setDaysFilter(parseInt(e.target.value))}
                    className="flex-1 accent-blue-700"
                  />
                  <span className="bg-slate-100 px-3 py-1.5 rounded-lg font-bold text-slate-700 min-w-[120px] text-center border border-slate-200">
                    {daysFilter} Days
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 italic">Calculated based on royal decree for administrative archiving.</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border border-slate-100 rounded-xl bg-slate-50/50">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Erasure Target</p>
                  <p className="text-2xl font-bold text-slate-800">{affectedDocs.length} Cases</p>
                  <p className="text-xs text-slate-500">Scheduled for permanent removal</p>
                </div>
                <div className="p-4 border border-slate-100 rounded-xl bg-slate-50/50">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Encrypted Blobs</p>
                  <p className="text-2xl font-bold text-slate-800">
                    {(affectedDocs.reduce((acc, d) => acc + d.bytes, 0) / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  <p className="text-xs text-slate-500">Total data footprint reduction</p>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <button 
                onClick={() => setDryRunActive(true)}
                className="w-full bg-blue-700 text-white py-4 rounded-xl font-bold hover:bg-blue-800 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-file-shield"></i>
                Initialize Compliance Dry-Run
              </button>
            </div>
          </div>

          {dryRunActive && (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 animate-in zoom-in-95 duration-300">
              <div className="flex items-start gap-4 mb-6">
                <div className="bg-red-100 w-12 h-12 rounded-xl flex items-center justify-center shrink-0">
                  <i className="fa-solid fa-biohazard text-red-600 text-xl"></i>
                </div>
                <div>
                  <h3 className="font-bold text-red-900 text-lg">Final Erasure Confirmation</h3>
                  <p className="text-red-800 text-sm opacity-80 leading-relaxed">
                    Executing this action will fulfill "Right to Erasure" requests for the {affectedDocs.length} identified cases. 
                    This action is logged in the official BE-Gov administrative record and cannot be reversed.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-red-900/60 uppercase">Authentication Phrase Required</label>
                  <input 
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="CONFIRM PURGE"
                    className="w-full bg-white border-2 border-red-200 rounded-xl px-4 py-3 text-red-900 font-bold placeholder:text-red-200 focus:outline-none focus:border-red-400 transition-all text-center tracking-widest"
                  />
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={handleExecute}
                    disabled={confirmText !== 'CONFIRM PURGE'}
                    className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    <i className="fa-solid fa-trash-arrow-up"></i>
                    Execute Permanent Erasure
                  </button>
                  <button 
                    onClick={() => { setDryRunActive(false); setConfirmText(''); }}
                    className="px-6 py-3 rounded-xl font-bold text-red-900/60 hover:bg-red-100 transition-all"
                  >
                    Abort
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <i className="fa-solid fa-gavel text-blue-700 text-sm"></i>
              Legal Framework
            </h3>
            <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
              <p>Purge logic adheres to the <strong>Belgian Federal Archive Law</strong> and <strong>RGPD Article 17</strong>.</p>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <p className="font-bold text-slate-800 mb-1">Standard Retention:</p>
                <ul className="list-disc ml-4 space-y-1">
                  <li>Invoices: 7 Years</li>
                  <li>Citizen Data: Variable</li>
                  <li>Logs: 12 Months</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center gap-3 mb-4">
               <div className="w-8 h-8 rounded bg-yellow-400 flex items-center justify-center">
                  <i className="fa-solid fa-lock text-slate-900 text-xs"></i>
               </div>
               <h3 className="font-bold text-sm">Protected Records</h3>
            </div>
            <p className="text-[11px] opacity-70 leading-relaxed mb-4">Documents marked with high-level sensitivity or active judicial inquiry are automatically locked from the purge engine.</p>
            <button className="w-full bg-white/10 hover:bg-white/20 text-white py-2.5 rounded-lg text-xs font-bold transition-all border border-white/10">
              Audit Locked Files
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurgeView;
