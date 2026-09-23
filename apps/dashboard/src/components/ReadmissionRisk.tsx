import { useState, useEffect } from 'react';
import { getReadmissionRisk } from '../services/api';
import type { ReadmissionRiskResponse, Referral, ShapExplanation } from '../services/api';
import { AlertTriangle, Activity, Loader2 } from 'lucide-react';

interface Props {
  referral: Referral;
}

export function ReadmissionRisk({ referral }: Props) {
  const [riskData, setRiskData] = useState<ReadmissionRiskResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRisk = async () => {
      try {
        // Calculate age roughly if DOB is present
        let age;
        if (referral.patient.date_of_birth) {
          const dob = new Date(referral.patient.date_of_birth);
          if (!isNaN(dob.getTime())) {
             const ageDifMs = Date.now() - dob.getTime();
             const ageDate = new Date(ageDifMs);
             age = Math.abs(ageDate.getUTCFullYear() - 1970);
          }
        }
        
        const data = await getReadmissionRisk({
           age: age || 50,
           gender: referral.patient.gender || 'Unknown',
           referral_reason_category: referral.referral_reason || 'Other'
        });
        setRiskData(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load risk data');
      } finally {
        setLoading(false);
      }
    };
    fetchRisk();
  }, [referral]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2 text-brand-purple" />
        Running risk model inference...
      </div>
    );
  }

  if (error || !riskData || riskData.risk_score === undefined) {
    return (
      <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
        {error || 'No risk data available.'}
      </div>
    );
  }

  const riskScore = riskData.risk_score!;
  const isHighRisk = riskScore > 0.4;
  const factors = riskData.shap_values || [];

  return (
    <div className="space-y-6">
      
      {/* Top Level Metric */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-1">
            30-Day Readmission Probability
          </h4>
          <div className="flex items-end gap-2">
            <span className={`text-4xl font-extrabold ${isHighRisk ? 'text-red-600' : 'text-brand-purple'}`}>
              {(riskScore * 100).toFixed(1)}%
            </span>
            <span className={`text-sm font-bold pb-1 ${isHighRisk ? 'text-red-500' : 'text-purple-500'}`}>
              {riskData.risk_category || 'Moderate'}
            </span>
          </div>
        </div>
        <div className={`w-16 h-16 rounded-full flex items-center justify-center border-4 ${
          isHighRisk ? 'border-red-100 bg-red-50' : 'border-purple-100 bg-brand-purpleSoft'
        }`}>
          <Activity className={`w-8 h-8 ${isHighRisk ? 'text-red-500' : 'text-brand-purple'}`} />
        </div>
      </div>

      {/* SHAP Factors */}
      <div>
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          Key Contributing Factors (SHAP)
        </h4>
        <div className="space-y-3">
          {factors.map((factor: ShapExplanation, idx: number) => {
            const isPositive = factor.contribution > 0;
            const barWidth = Math.min(Math.abs(factor.contribution) * 100 * 2, 100);
            
            return (
              <div key={idx} className="flex items-center text-sm">
                <div className="w-1/3 truncate pr-4 text-slate-600 font-medium text-right text-xs uppercase tracking-wider">
                  {factor.feature.replace(/_/g, ' ')}
                </div>
                <div className="w-2/3 flex items-center h-5 bg-slate-100 rounded-full overflow-hidden relative">
                  {/* Center line */}
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-300 z-10"></div>
                  
                  {isPositive ? (
                    <div 
                      className="h-full bg-red-400 absolute left-1/2 rounded-r-full" 
                      style={{ width: `${barWidth / 2}%` }}
                    />
                  ) : (
                    <div 
                      className="h-full bg-emerald-400 absolute right-1/2 rounded-l-full" 
                      style={{ width: `${barWidth / 2}%` }}
                    />
                  )}
                </div>
                <div className={`w-16 text-right text-xs font-bold ${isPositive ? 'text-red-500' : 'text-emerald-600'}`}>
                  {isPositive ? '+' : ''}{(factor.contribution * 100).toFixed(1)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-amber-50 p-4 rounded-xl text-xs text-amber-700 border border-amber-200 space-y-1">
        <div className="flex items-start gap-2 font-medium">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p>
            <strong className="text-amber-800">Safety Notice:</strong> Prediction is not diagnosis. SHAP explanations show model associations, not causes. Performance on synthetic data does not establish clinical performance.
          </p>
        </div>
      </div>

    </div>
  );
}
