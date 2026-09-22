import { useEffect, useState } from 'react';
import { getReferrals, updateReferralStatus, addReferralEvent } from './services/api';
import type { Referral } from './services/api';
import { 
  Activity, 
  RefreshCw, 
  User, 
  MapPin, 
  Clock, 
  CheckCircle,
  FileText,
  X
} from 'lucide-react';
import { IdentityReconciliation } from './components/IdentityReconciliation';
import { ReadmissionRisk } from './components/ReadmissionRisk';
import { OverdueReferrals } from './components/OverdueReferrals';
import { OCRVerification } from './components/OCRVerification';

const STATUS_COLORS: Record<string, string> = {
  CREATED: 'bg-yellow-500/20 text-yellow-300',
  SENT: 'bg-blue-500/20 text-blue-300',
  RECEIVED: 'bg-purple-500/20 text-purple-300',
  UNDER_REVIEW: 'bg-orange-500/20 text-orange-300',
  ADMITTED: 'bg-green-500/20 text-green-300',
  DISCHARGED: 'bg-teal-500/20 text-teal-300',
  COMPLETED: 'bg-gray-500/20 text-gray-300'
};

const VALID_TRANSITIONS: Record<string, string[]> = {
  CREATED: ['SENT', 'RECEIVED', 'COMPLETED'],
  SENT: ['RECEIVED', 'COMPLETED'],
  RECEIVED: ['UNDER_REVIEW', 'ADMITTED', 'DISCHARGED', 'COMPLETED'],
  UNDER_REVIEW: ['ADMITTED', 'DISCHARGED', 'COMPLETED'],
  ADMITTED: ['DISCHARGED', 'COMPLETED'],
  DISCHARGED: ['COMPLETED'],
  COMPLETED: []
};

export default function App() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchReferrals = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getReferrals();
      setReferrals(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch referrals');
    } finally {
      setLoading(false);
      setRefreshTrigger(prev => prev + 1);
    }
  };

  useEffect(() => {
    fetchReferrals();
  }, []);

  const total = referrals.length;
  const pending = referrals.filter(r => ['CREATED', 'SENT', 'RECEIVED', 'UNDER_REVIEW'].includes(r.status)).length;
  const admitted = referrals.filter(r => r.status === 'ADMITTED').length;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 font-sans selection:bg-teal-500/30">
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-lg tracking-tight">CareBridge AI Dashboard</span>
          </div>
          <button 
            onClick={fetchReferrals}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-teal-400' : 'text-slate-400'}`} />
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard title="Total Referrals" value={total} icon={<FileText />} />
          <StatCard title="Pending Review" value={pending} icon={<Clock />} color="text-yellow-400" />
          <StatCard title="Currently Admitted" value={admitted} icon={<CheckCircle />} color="text-green-400" />
        </div>

        <OverdueReferrals 
          onSelectReferral={(r) => setSelectedReferral(r)}
          refreshTrigger={refreshTrigger}
        />

        <div className="mb-8">
          <OCRVerification onConfirm={(data) => {
            alert(`Verified Data Ready for submission:\n${JSON.stringify(data, null, 2)}\n\n(This would normally proceed to the referral creation workflow)`);
          }} />
        </div>

        {error && (
          <div className="mb-8 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
            {error}
          </div>
        )}

        <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-700/50 bg-slate-800/30 text-sm font-medium text-slate-400">
                  <th className="py-4 px-6">Patient</th>
                  <th className="py-4 px-6">Origin Facility</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {referrals.length === 0 && !loading && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-500">
                      No referrals found.
                    </td>
                  </tr>
                )}
                {referrals.map((r) => (
                  <tr 
                    key={r.id} 
                    onClick={() => setSelectedReferral(r)}
                    className="hover:bg-slate-800/50 transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-6">
                      <div className="font-medium text-slate-200 group-hover:text-teal-400 transition-colors">
                        {r.patient.name}
                      </div>
                      <div className="text-sm text-slate-500 text-xs mt-1">{r.referral_code}</div>
                    </td>
                    <td className="py-4 px-6 text-slate-300">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-500" />
                        {r.referring_facility}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium tracking-wide ${STATUS_COLORS[r.status] || 'bg-slate-700 text-slate-300'}`}>
                        {r.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-400 text-sm">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {selectedReferral && (
        <ReferralModal 
          referral={selectedReferral} 
          onClose={() => setSelectedReferral(null)} 
          onStatusUpdated={() => {
            setSelectedReferral(null);
            fetchReferrals();
          }}
        />
      )}
    </div>
  );
}

function StatCard({ title, value, icon, color = "text-teal-400" }: any) {
  return (
    <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6 flex items-start justify-between backdrop-blur-sm hover:border-slate-600/50 transition-colors">
      <div>
        <p className="text-sm font-medium text-slate-400 mb-1">{title}</p>
        <p className="text-3xl font-semibold text-slate-100">{value}</p>
      </div>
      <div className={`p-3 rounded-xl bg-slate-800 ${color}`}>
        {icon}
      </div>
    </div>
  );
}

function ReferralModal({ referral, onClose, onStatusUpdated }: any) {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);

  const availableStatuses = VALID_TRANSITIONS[referral.status] || [];

  const handleStatusChange = async (newStatus: string) => {
    setUpdating(true);
    setError(null);
    try {
      await updateReferralStatus(referral.referral_code, newStatus);
      onStatusUpdated();
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to update status');
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-semibold text-slate-100">Referral Details</h2>
            <p className="text-sm text-slate-400 mt-1">{referral.referral_code}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-8 flex-1">
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Patient Info */}
          <section>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <User className="w-4 h-4" /> Patient Information
            </h3>
            <div className="bg-slate-800/50 rounded-xl p-5 grid grid-cols-2 gap-4 text-sm border border-slate-700/50">
              <div>
                <p className="text-slate-500 mb-1">Name</p>
                <p className="font-medium text-slate-200">{referral.patient.name}</p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">Phone</p>
                <p className="font-medium text-slate-200">{referral.patient.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">Village</p>
                <p className="font-medium text-slate-200">{referral.patient.village || 'N/A'}</p>
              </div>
              <div>
                <p className="text-slate-500 mb-1">Guardian</p>
                <p className="font-medium text-slate-200">{referral.patient.guardian_name || 'N/A'}</p>
              </div>
            </div>
          </section>

          {/* Referral Info */}
          <section>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Referral Context
            </h3>
            <div className="bg-slate-800/50 rounded-xl p-5 space-y-4 text-sm border border-slate-700/50">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-500 mb-1">From Facility</p>
                  <p className="font-medium text-slate-200">{referral.referring_facility}</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">To Facility</p>
                  <p className="font-medium text-slate-200">{referral.receiving_facility}</p>
                </div>
              </div>
              <div>
                <p className="text-slate-500 mb-1">Reason for Referral</p>
                <p className="font-medium text-slate-200 bg-slate-900/50 p-3 rounded-lg border border-slate-800 mt-2">
                  {referral.referral_reason || 'No reason provided.'}
                </p>
              </div>
            </div>
          </section>

          {/* Identity Reconciliation (Phase 6) */}
          <section>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <User className="w-4 h-4" /> Identity Reconciliation
            </h3>
            <IdentityReconciliation referral={referral} />
          </section>

          {/* AI Risk Analysis (Phase 7) */}
          <section>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4" /> AI Risk Analysis
            </h3>
            <ReadmissionRisk referral={referral} />
          </section>

          {/* Action Area */}
          <section>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
              Update Status
            </h3>
            <div className="flex items-center gap-4 flex-wrap">
              <span className={`px-3 py-1.5 rounded-full text-sm font-medium tracking-wide border border-current ${STATUS_COLORS[referral.status] || 'bg-slate-700 text-slate-300'}`}>
                CURRENT: {referral.status.replace('_', ' ')}
              </span>
              
              {availableStatuses.length > 0 ? (
                <>
                  <span className="text-slate-500">→</span>
                  <div className="flex gap-2 flex-wrap">
                    {availableStatuses.map(s => (
                      <button
                        key={s}
                        disabled={updating}
                        onClick={() => handleStatusChange(s)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${updating ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 hover:shadow-lg'} ${STATUS_COLORS[s] || 'bg-slate-700 text-slate-300'}`}
                      >
                        Set {s.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <span className="text-slate-500 text-sm ml-2">No further transitions available.</span>
              )}
            </div>
          </section>
          
          {/* Event History */}
          <section>
             <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Timeline Events
            </h3>
            
            <div className="mb-6 bg-slate-800/30 border border-slate-700/50 rounded-xl p-4">
              <h4 className="text-sm font-medium text-slate-300 mb-2">Log Follow-up Attempt</h4>
              <div className="flex gap-3">
                <input 
                  type="text" 
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="e.g. Called patient, no answer..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-teal-500"
                />
                <button 
                  onClick={async () => {
                    if (!noteText.trim()) return;
                    setSubmittingNote(true);
                    try {
                      await addReferralEvent(referral.referral_code, 'FOLLOW_UP_ATTEMPTED', noteText.trim());
                      setNoteText('');
                      onStatusUpdated(); // Refresh modal
                    } catch (err) {
                      setError("Failed to add follow-up note.");
                    } finally {
                      setSubmittingNote(false);
                    }
                  }}
                  disabled={submittingNote || !noteText.trim()}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {submittingNote ? 'Saving...' : 'Add Note'}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {referral.events.map((e: any) => (
                <div key={e.id} className="text-sm border-l-2 border-slate-700 pl-4 py-1">
                  <div className="text-slate-300 font-medium">{e.event}</div>
                  {e.note && <div className="text-slate-500 text-xs mt-1">{e.note}</div>}
                  <div className="text-slate-600 text-xs mt-1">{new Date(e.created_at).toLocaleString()}</div>
                </div>
              ))}
              {referral.events.length === 0 && (
                <div className="text-sm text-slate-500 italic">No events recorded.</div>
              )}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
