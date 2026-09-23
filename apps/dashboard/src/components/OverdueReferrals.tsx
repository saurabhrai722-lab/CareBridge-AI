import { useEffect, useState } from 'react';
import { getOverdueReferrals } from '../services/api';
import type { Referral } from '../services/api';
import { AlertTriangle, Clock, MapPin, RefreshCw, ChevronRight } from 'lucide-react';

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
      <div className="mb-12 p-6 bg-white border border-slate-200 shadow-sm rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-3 text-slate-500 font-medium">
          <RefreshCw className="w-5 h-5 animate-spin text-brand-blue" />
          <span>Checking for overdue referrals...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-12 p-6 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-3 text-red-600 font-medium">
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
        </div>
        <button 
          onClick={fetchOverdue}
          className="px-4 py-2 text-sm bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-lg transition-colors shadow-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  if (overdue.length === 0) {
    // Empty state
    return (
      <div className="mb-12 p-6 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-3 text-emerald-700 font-medium">
          <AlertTriangle className="w-5 h-5 text-emerald-500" />
          <span>No overdue referrals. All patients are accounted for.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-12 bg-white border border-red-200 rounded-2xl overflow-hidden shadow-sm shadow-red-50">
      <div className="px-6 py-4 border-b border-red-100 flex items-center justify-between bg-red-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white border border-red-100 rounded-xl flex items-center justify-center shadow-sm">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="font-extrabold text-red-700 uppercase tracking-wide text-sm">Overdue Referrals ({overdue.length})</h3>
            <p className="text-xs text-red-600/80 font-medium mt-0.5">Patients who have not arrived within 48 hours</p>
          </div>
        </div>
        <button 
          onClick={fetchOverdue}
          disabled={loading}
          className="p-2 rounded-lg bg-white border border-red-100 hover:bg-red-100 text-red-500 transition-colors disabled:opacity-50 shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      <div className="divide-y divide-slate-100">
        {overdue.map(r => (
          <div 
            key={r.id}
            onClick={() => onSelectReferral(r)}
            className="p-4 hover:bg-red-50/50 transition-colors cursor-pointer flex items-center justify-between group"
          >
            <div>
              <div className="font-bold text-brand-navy group-hover:text-red-700 transition-colors">
                {r.patient.name} <span className="text-xs font-mono text-slate-500 ml-2 font-normal uppercase">{r.referral_code}</span>
              </div>
              <div className="text-xs font-medium text-slate-500 mt-1.5 flex items-center gap-4">
                <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {r.referring_facility}</span>
                <span className="flex items-center gap-1.5 text-red-600"><Clock className="w-3.5 h-3.5" /> Sent: {new Date(r.created_at).toLocaleString()}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-[10px] uppercase font-bold tracking-wider">
                {r.status.replace('_', ' ')}
              </span>
              <ChevronRight className="w-5 h-5 text-red-300 group-hover:text-red-500 transition-colors" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
