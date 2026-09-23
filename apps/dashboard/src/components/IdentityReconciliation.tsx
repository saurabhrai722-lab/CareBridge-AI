import { useState, useEffect } from 'react';
import { getReconciliationCandidates, reconcilePatient } from '../services/api';
import type { MatchCandidate, Referral } from '../services/api';
import { AlertTriangle, UserCheck, UserX, Loader2, Info } from 'lucide-react';

interface Props {
  referral: Referral;
}

export function IdentityReconciliation({ referral }: Props) {
  const [candidates, setCandidates] = useState<MatchCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reconcilingId, setReconcilingId] = useState<number | null>(null);

  const fetchCandidates = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getReconciliationCandidates(referral.referral_code);
      setCandidates(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to load candidates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, [referral.referral_code]);

  const handleAction = async (candidateId: number, action: 'CONFIRM' | 'REJECT') => {
    setReconcilingId(candidateId);
    setError(null);
    try {
      await reconcilePatient(referral.referral_code, candidateId, action);
      await fetchCandidates(); // Refresh list to remove reconciled or update status
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to reconcile');
    } finally {
      setReconcilingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2 text-brand-blue" />
        Searching for potential identity matches...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
        {error}
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
          <Info className="w-6 h-6 text-slate-400" />
        </div>
        <h4 className="text-brand-navy font-bold mb-1">No Matches Found</h4>
        <p className="text-sm text-slate-500">
          The system did not find any plausible existing patient records matching this referral's details.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        <h4 className="text-sm font-bold text-slate-600 uppercase tracking-wider">
          {candidates.length} Potential Match{candidates.length > 1 ? 'es' : ''} Found
        </h4>
      </div>
      
      {candidates.map(candidate => (
        <div key={candidate.candidate_patient.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          
          {/* Header */}
          <div className="flex justify-between items-start mb-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h5 className="font-extrabold text-brand-navy text-lg">
                  {candidate.candidate_patient.name}
                </h5>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                  candidate.classification === 'LIKELY_MATCH' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {candidate.classification.replace('_', ' ')}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1 font-medium">
                Overall Confidence: {(candidate.overall_score * 100).toFixed(0)}%
              </p>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => handleAction(candidate.candidate_patient.id, 'REJECT')}
                disabled={reconcilingId !== null}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-colors text-sm font-bold disabled:opacity-50"
              >
                <UserX className="w-4 h-4" /> Reject
              </button>
              <button 
                onClick={() => handleAction(candidate.candidate_patient.id, 'CONFIRM')}
                disabled={reconcilingId !== null}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors text-sm font-bold disabled:opacity-50"
              >
                <UserCheck className="w-4 h-4" /> Confirm Match
              </button>
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
            <div>
              <p className="text-slate-500 text-xs mb-1 font-medium">Phone</p>
              <p className={`font-semibold ${candidate.conflicting_fields.includes('phone') ? 'text-red-600' : 'text-slate-700'}`}>
                {candidate.candidate_patient.phone || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-slate-500 text-xs mb-1 font-medium">DOB / Age</p>
              <p className={`font-semibold ${candidate.conflicting_fields.includes('date_of_birth') ? 'text-red-600' : 'text-slate-700'}`}>
                {candidate.candidate_patient.date_of_birth || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-slate-500 text-xs mb-1 font-medium">Village</p>
              <p className="font-semibold text-slate-700">
                {candidate.candidate_patient.village || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-slate-500 text-xs mb-1 font-medium">Guardian</p>
              <p className="font-semibold text-slate-700">
                {candidate.candidate_patient.guardian_name || 'N/A'}
              </p>
            </div>
          </div>

          {/* Explanations */}
          <div className="bg-slate-50 rounded-lg p-4 text-xs border border-slate-100">
            <p className="text-slate-600 mb-2 font-bold uppercase tracking-wider">Match Factors:</p>
            <div className="flex flex-wrap gap-2 font-medium">
              <span className="text-brand-navy bg-white border border-slate-200 px-2 py-1 rounded">
                Name: {(candidate.component_scores.name * 100).toFixed(0)}%
              </span>
              {(!candidate.unavailable_fields.includes('phone')) && (
                 <span className={`${candidate.conflicting_fields.includes('phone') ? 'text-red-700 bg-red-50 border-red-200' : 'text-brand-navy bg-white border-slate-200'} border px-2 py-1 rounded`}>
                   Phone: {(candidate.component_scores.phone * 100).toFixed(0)}%
                 </span>
              )}
              {(!candidate.unavailable_fields.includes('date_of_birth')) && (
                 <span className={`${candidate.conflicting_fields.includes('date_of_birth') ? 'text-red-700 bg-red-50 border-red-200' : 'text-brand-navy bg-white border-slate-200'} border px-2 py-1 rounded`}>
                   DOB: {(candidate.component_scores.age_dob * 100).toFixed(0)}%
                 </span>
              )}
              {candidate.unavailable_fields.map(f => (
                <span key={f} className="text-slate-500 bg-slate-100 border border-slate-200 px-2 py-1 rounded">
                  {f.replace('_', ' ')}: N/A
                </span>
              ))}
            </div>
          </div>

        </div>
      ))}
    </div>
  );
}
