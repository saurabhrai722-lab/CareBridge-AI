import { useState, useEffect } from 'react';
import { getReadmissionRisk } from '../services/api';
import type { Referral, ReadmissionRiskResponse } from '../services/api';
import { Activity, AlertTriangle, Info, Loader2, ArrowRight } from 'lucide-react';

interface Props {
  referral: Referral;
}

export function ReadmissionRisk({ referral }: Props) {
  const [data, setData] = useState<ReadmissionRiskResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // These fields are requested from the user if they are missing in the referral
  const [priorAdmissions, setPriorAdmissions] = useState<string>('');
  const [comorbidityCount, setComorbidityCount] = useState<string>('');

  const calculateAge = (dob: string | undefined) => {
    if (!dob) return undefined;
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return undefined;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
  };

  const fetchRisk = async () => {
    setLoading(true);
    setError(null);
    try {
      const age = calculateAge(referral.patient.date_of_birth);
      
      const payload = {
        age,
        gender: referral.patient.gender,
        referral_reason_category: referral.referral_reason, // We map this conceptually
        ...(priorAdmissions !== '' && { prior_admissions_count: parseInt(priorAdmissions, 10) }),
        ...(comorbidityCount !== '' && { comorbidity_count: parseInt(comorbidityCount, 10) }),
      };

      const response = await getReadmissionRisk(payload);
      setData(response);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to analyze risk');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRisk();
  }, [referral]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2 text-blue-400" />
        Analyzing readmission risk model...
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

  if (data?.status === 'INSUFFICIENT_FEATURES') {
    return (
      <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-5 h-5 text-blue-400" />
          <h4 className="text-slate-200 font-medium">Insufficient Clinical Features</h4>
        </div>
        <p className="text-sm text-slate-400 mb-4">
          The statistical model cannot perform a prediction because required features are unavailable. 
          Please supply the missing values below if they are available in the patient record. Do not guess or fabricate clinical values.
        </p>
        <div className="grid grid-cols-2 gap-4 mb-4">
          {data.missing_features?.includes('prior_admissions_count') && (
            <div>
              <label className="block text-xs text-slate-500 mb-1">Prior Admissions (Count)</label>
              <input 
                type="number" 
                min="0"
                value={priorAdmissions}
                onChange={(e) => setPriorAdmissions(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                placeholder="e.g. 0"
              />
            </div>
          )}
          {data.missing_features?.includes('comorbidity_count') && (
            <div>
              <label className="block text-xs text-slate-500 mb-1">Comorbidities (Count)</label>
              <input 
                type="number" 
                min="0"
                value={comorbidityCount}
                onChange={(e) => setComorbidityCount(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                placeholder="e.g. 2"
              />
            </div>
          )}
        </div>
        <button 
          onClick={fetchRisk}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Re-evaluate Risk
        </button>
      </div>
    );
  }

  const isHighRisk = data?.risk_category === 'HIGH';
  const isMediumRisk = data?.risk_category === 'MEDIUM';

  return (
    <div className="bg-slate-800/40 border border-slate-700 rounded-xl overflow-hidden">
      
      {/* Header / Score */}
      <div className="p-5 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-5 h-5 text-blue-400" />
            <h4 className="text-slate-100 font-semibold text-lg">30-Day Readmission Estimate</h4>
          </div>
          <p className="text-xs text-slate-400">Statistical model estimate for prototype demonstration only.</p>
        </div>
        
        <div className="text-right flex items-center gap-4">
          <div>
            <div className="text-3xl font-bold text-slate-100">
              {((data?.risk_score || 0) * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-slate-500 uppercase tracking-wide">Probability</div>
          </div>
          <div className={`px-3 py-1.5 rounded-lg border font-medium text-sm tracking-wide
            ${isHighRisk ? 'bg-red-500/20 text-red-400 border-red-500/30' : 
              isMediumRisk ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 
              'bg-green-500/20 text-green-400 border-green-500/30'}`}>
            {data?.risk_category} RISK
          </div>
        </div>
      </div>

      {/* SHAP Explanations */}
      <div className="p-5">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
          Model Associations (SHAP)
        </p>
        <div className="space-y-3">
          {data?.shap_values?.map((shap, idx) => {
            const isPositive = shap.contribution > 0;
            return (
              <div key={idx} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3 flex-1">
                  <div className={`w-2 h-2 rounded-full ${isPositive ? 'bg-red-400' : 'bg-green-400'}`} />
                  <span className="text-slate-300 font-medium">{shap.feature.replace(/_/g, ' ')}</span>
                  <span className="text-slate-500 text-xs flex items-center gap-1">
                    <ArrowRight className="w-3 h-3" /> {shap.description}
                  </span>
                </div>
                <div className={`font-mono ${isPositive ? 'text-red-400' : 'text-green-400'}`}>
                  {isPositive ? '+' : ''}{(shap.contribution * 100).toFixed(1)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Safety Disclaimers */}
      <div className="bg-slate-900/50 p-4 text-xs text-slate-400 border-t border-slate-700/50 space-y-1">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
          <p>
            <strong className="text-slate-300">Safety Notice:</strong> Prediction is not diagnosis. SHAP explanations show model associations, not causes. Performance on synthetic data does not establish clinical performance.
          </p>
        </div>
      </div>

    </div>
  );
}
