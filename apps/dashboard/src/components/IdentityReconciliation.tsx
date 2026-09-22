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
      <div className="flex items-center justify-center p-8 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2 text-teal-400" />
        Searching for potential identity matches...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
        {error}
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="p-6 bg-slate-800/30 rounded-xl border border-slate-700/50 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-3">
          <Info className="w-6 h-6 text-slate-400" />
        </div>
        <h4 className="text-slate-200 font-medium mb-1">No Matches Found</h4>
        <p className="text-sm text-slate-400">
          The system did not find any plausible existing patient records matching this referral's details.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-4 h-4 text-orange-400" />
        <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          {candidates.length} Potential Match{candidates.length > 1 ? 'es' : ''} Found
        </h4>
      </div>
      
      {candidates.map(candidate => (
        <div key={candidate.candidate_patient.id} className="bg-slate-800/40 border border-slate-700 rounded-xl p-5">
          
          {/* Header */}
          <div className="flex justify-between items-start mb-4 pb-4 border-b border-slate-700/50">
            <div>
              <div className="flex items-center gap-2">
                <h5 className="font-semibold text-slate-100 text-lg">
                  {candidate.candidate_patient.name}
                </h5>
                <span className={`px-2 py-0.5 rounded text-xs font-medium tracking-wide ${
                  candidate.classification === 'LIKELY_MATCH' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                }`}>
                  {candidate.classification.replace('_', ' ')}
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                Overall Confidence: {(candidate.overall_score * 100).toFixed(0)}%
              </p>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => handleAction(candidate.candidate_patient.id, 'REJECT')}
                disabled={reconcilingId !== null}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors text-sm font-medium disabled:opacity-50"
              >
                <UserX className="w-4 h-4" /> Reject
              </button>
              <button 
                onClick={() => handleAction(candidate.candidate_patient.id, 'CONFIRM')}
                disabled={reconcilingId !== null}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/30 transition-colors text-sm font-medium disabled:opacity-50"
              >
                <UserCheck className="w-4 h-4" /> Confirm Match
              </button>
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
            <div>
              <p className="text-slate-500 text-xs mb-1">Phone</p>
              <p className={`font-medium ${candidate.conflicting_fields.includes('phone') ? 'text-red-400' : 'text-slate-300'}`}>
                {candidate.candidate_patient.phone || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-slate-500 text-xs mb-1">DOB / Age</p>
              <p className={`font-medium ${candidate.conflicting_fields.includes('date_of_birth') ? 'text-red-400' : 'text-slate-300'}`}>
                {candidate.candidate_patient.date_of_birth || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-slate-500 text-xs mb-1">Village</p>
              <p className="font-medium text-slate-300">
                {candidate.candidate_patient.village || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-slate-500 text-xs mb-1">Guardian</p>
              <p className="font-medium text-slate-300">
                {candidate.candidate_patient.guardian_name || 'N/A'}
              </p>
            </div>
          </div>

          {/* Explanations */}
          <div className="bg-slate-900/50 rounded-lg p-3 text-xs border border-slate-800">
            <p className="text-slate-400 mb-2 font-medium">Match Factors:</p>
            <div className="flex flex-wrap gap-2">
              <span className="text-slate-300 bg-slate-800 px-2 py-1 rounded">
                Name: {(candidate.component_scores.name * 100).toFixed(0)}%
              </span>
              {(!candidate.unavailable_fields.includes('phone')) && (
                 <span className={`${candidate.conflicting_fields.includes('phone') ? 'text-red-400 bg-red-950/40' : 'text-slate-300 bg-slate-800'} px-2 py-1 rounded`}>
                   Phone: {(candidate.component_scores.phone * 100).toFixed(0)}%
                 </span>
              )}
              {(!candidate.unavailable_fields.includes('date_of_birth')) && (
                 <span className={`${candidate.conflicting_fields.includes('date_of_birth') ? 'text-red-400 bg-red-950/40' : 'text-slate-300 bg-slate-800'} px-2 py-1 rounded`}>
                   DOB: {(candidate.component_scores.age_dob * 100).toFixed(0)}%
                 </span>
              )}
              {candidate.unavailable_fields.map(f => (
                <span key={f} className="text-slate-500 bg-slate-800/50 px-2 py-1 rounded">
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
