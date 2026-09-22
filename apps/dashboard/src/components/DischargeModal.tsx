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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-teal-500/30 rounded-2xl shadow-2xl shadow-teal-900/20 w-full max-w-lg overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-100">Discharge Patient</h2>
              <p className="text-sm text-slate-400 mt-0.5">{referral.patient.name}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            disabled={loading}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
          
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 flex gap-3 text-sm text-orange-200">
            <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0" />
            <p>
              You are about to formally discharge this patient. 
              This action will close the referral episode. Please ensure the readmission risk analysis has been reviewed.
            </p>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="dischargeNote" className="block text-sm font-medium text-slate-300 mb-2">
              Clinical Discharge Notes <span className="text-red-400">*</span>
            </label>
            <textarea
              id="dischargeNote"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={loading}
              placeholder="Enter discharge instructions, outcome, or follow-up plan..."
              className="w-full h-32 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-none disabled:opacity-50"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !note.trim()}
              className="px-5 py-2.5 rounded-xl text-sm font-medium bg-teal-600 hover:bg-teal-500 text-white transition-colors disabled:opacity-50 flex items-center justify-center min-w-[120px]"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Discharge'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
