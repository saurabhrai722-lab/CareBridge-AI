import { useState, useEffect } from 'react';
import { getOverdueReferrals } from '../services/api';
import type { Referral } from '../services/api';
import { AlertTriangle, RefreshCw, MapPin, Clock } from 'lucide-react';

interface Props {
  onSelectReferral: (referral: Referral) => void;
  refreshTrigger: number;
}

export function OverdueReferrals({ onSelectReferral, refreshTrigger }: Props) {
  const [overdue, setOverdue] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverdue = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getOverdueReferrals();
      setOverdue(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch overdue referrals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverdue();
  }, [refreshTrigger]);

  if (loading && overdue.length === 0) {
    return (
      <div className="mb-8 p-6 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center animate-pulse">
        <div className="flex items-center gap-3 text-slate-500">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Checking for overdue referrals...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-8 p-6 bg-red-950/20 border border-red-500/20 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-3 text-red-400">
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
        </div>
        <button 
          onClick={fetchOverdue}
          className="px-3 py-1.5 text-sm bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (overdue.length === 0) {
    // We can show an empty state explicitly since the requirement asks for it
    return (
      <div className="mb-8 p-6 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between opacity-70">
        <div className="flex items-center gap-3 text-slate-400">
          <AlertTriangle className="w-5 h-5 text-teal-500/50" />
          <span>No overdue referrals. All patients are accounted for.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8 bg-red-950/20 border border-red-500/30 rounded-2xl overflow-hidden shadow-lg shadow-red-900/10">
      <div className="px-6 py-4 border-b border-red-500/20 flex items-center justify-between bg-red-500/5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-500/20 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="font-semibold text-red-400">Overdue Referrals ({overdue.length})</h3>
            <p className="text-sm text-red-400/70">Patients who have not arrived within 48 hours</p>
          </div>
        </div>
        <button 
          onClick={fetchOverdue}
          disabled={loading}
          className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      <div className="divide-y divide-red-500/10">
        {overdue.map(r => (
          <div 
            key={r.id}
            onClick={() => onSelectReferral(r)}
            className="p-4 hover:bg-red-500/5 transition-colors cursor-pointer flex items-center justify-between group"
          >
            <div>
              <div className="font-medium text-slate-200 group-hover:text-red-400 transition-colors">
                {r.patient.name} <span className="text-sm text-slate-500 ml-2">{r.referral_code}</span>
              </div>
              <div className="text-sm text-slate-400 mt-1 flex items-center gap-4">
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {r.referring_facility}</span>
                <span className="flex items-center gap-1 text-red-400/80"><Clock className="w-3.5 h-3.5" /> Sent: {new Date(r.created_at).toLocaleString()}</span>
              </div>
            </div>
            <div className="px-3 py-1 rounded-full bg-red-500/20 text-red-300 text-xs font-semibold tracking-wide">
              {r.status}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
