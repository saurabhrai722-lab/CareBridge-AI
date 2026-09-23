import React, { useState } from 'react';
import { dischargeReferral } from '../services/api';
import type { Referral } from '../services/api';
import { X, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface Props {
  referral: Referral;
  onClose: () => void;
  onSuccess: () => void;
}

export function DischargeModal({ referral, onClose, onSuccess }: Props) {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) {
      setError("Discharge note is required.");
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      await dischargeReferral(referral.referral_code, note.trim());
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to discharge patient');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-brand-navy/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-greenSoft text-brand-green flex items-center justify-center border border-green-200">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-brand-navy tracking-tight">Discharge Patient</h2>
              <p className="text-sm font-bold text-slate-500 mt-0.5">{referral.patient.name}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            disabled={loading}
            className="p-2 text-slate-400 hover:text-brand-navy hover:bg-slate-200 rounded-full transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
          
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-sm text-amber-800">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="font-medium">
              You are about to formally discharge this patient. 
              This action will close the referral episode. Please ensure the readmission risk analysis has been reviewed.
            </p>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="dischargeNote" className="block text-sm font-bold text-slate-600 mb-2">
              Clinical Discharge Notes <span className="text-red-500">*</span>
            </label>
            <textarea
              id="dischargeNote"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={loading}
              placeholder="Enter discharge instructions, outcome, or follow-up plan..."
              className="w-full h-32 bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm font-medium text-brand-navy focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 resize-none disabled:opacity-50 transition-all shadow-sm"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:text-brand-navy hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !note.trim()}
              className="px-6 py-2.5 rounded-xl text-sm font-bold bg-brand-green hover:bg-emerald-700 text-white transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center min-w-[160px]"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Discharge'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
