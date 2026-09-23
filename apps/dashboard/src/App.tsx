import { useEffect, useState } from 'react';
import { getReferrals, updateReferralStatus, addReferralEvent } from './services/api';
import type { Referral } from './services/api';
import { 
  Activity, 
  RefreshCw, 
  User, 
  Building2, 
  Clock, 
  CheckCircle,
  FileText,
  X,
  ChevronRight,
  ShieldCheck,
  Stethoscope
} from 'lucide-react';
import { IdentityReconciliation } from './components/IdentityReconciliation';
import { ReadmissionRisk } from './components/ReadmissionRisk';
import { OverdueReferrals } from './components/OverdueReferrals';
import { OCRVerification } from './components/OCRVerification';
import { DischargeModal } from './components/DischargeModal';

const STATUS_COLORS: Record<string, string> = {
  CREATED: 'bg-slate-100 text-slate-700 border-slate-200',
  SENT: 'bg-brand-blueSoft text-brand-blue border-blue-200',
  RECEIVED: 'bg-brand-purpleSoft text-brand-purple border-purple-200',
  UNDER_REVIEW: 'bg-amber-50 text-amber-700 border-amber-200',
  ADMITTED: 'bg-brand-greenSoft text-brand-green border-green-200',
  DISCHARGED: 'bg-sky-50 text-sky-700 border-sky-200',
  COMPLETED: 'bg-slate-100 text-slate-500 border-slate-200'
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

// Map backend statuses to visual timeline states
const TIMELINE_STAGES = [
  'CREATED',
  'SENT',
  'RECEIVED',
  'UNDER_REVIEW',
  'ADMITTED',
  'DISCHARGED',
  'COMPLETED'
];

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
    <div className="min-h-screen bg-brand-bgLight text-brand-navy font-sans selection:bg-brand-blue selection:text-white">
      {/* Top Utility Bar */}
      <aside aria-label="Operational Telemetry Strip" className="w-full bg-brand-navy text-slate-300 text-xs py-2 px-6 border-b border-slate-800/80 flex items-center justify-between overflow-hidden">
        <div className="hidden lg:flex items-center space-x-4 shrink-0 text-slate-400">
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-dot"></span>
            ACTIVE COVERAGE REGIONS
          </span>
          <span className="text-slate-600">/</span>
          <span className="text-slate-300 font-medium">Maharashtra · Karnataka · Delhi NCR · Tamil Nadu · Telangana</span>
        </div>

        <div className="flex-1 max-w-2xl overflow-hidden relative mx-4">
          <div className="animate-marquee items-center gap-10 text-slate-300">
            <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span> <strong>{total} referrals tracked</strong> across clinical nodes</span>
            <span className="flex items-center gap-2 text-slate-400">·</span>
            <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> <strong>100% FHIR Handshake Integrity</strong> in Q3 2026</span>
            <span className="flex items-center gap-2 text-slate-400">·</span>
            <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span> <strong>CareBridge AI v1.0.0 CodeX Live Ready</strong></span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-4 shrink-0">
          <span className="font-mono text-[11px] text-slate-400">NODE LATENCY: 14ms</span>
        </div>
      </aside>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#FAFAFC]/90 backdrop-blur-md border-b border-slate-200/80 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <a href="#" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-brand-navy flex items-center justify-center text-white font-bold text-sm shadow-sm group-hover:bg-brand-blue transition-colors">
              <svg className="w-4 h-4 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-brand-navy leading-none">CareBridge<span className="text-brand-blue">AI</span></span>
              <span className="text-[9px] uppercase tracking-widest text-slate-500 font-semibold mt-0.5">Continuity Infrastructure</span>
            </div>
          </a>

          <div className="flex items-center gap-4">
            <button 
              onClick={fetchReferrals}
              disabled={loading}
              className="p-2 rounded-lg text-slate-500 hover:text-brand-blue hover:bg-brand-blueSoft transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-brand-blue' : ''}`} />
            </button>
            <div className="hidden sm:inline-flex items-center justify-center px-5 py-2.5 rounded-full text-sm font-semibold bg-brand-navy text-white shadow-sm">
              Hospital Terminal
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-brand-navy tracking-tight font-sans mb-3">
            Active Care Grid
          </h1>
          <p className="text-slate-600 text-lg">Manage incoming and outgoing referrals securely.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <StatCard title="Total Referrals" value={total} icon={<FileText className="w-5 h-5" />} color="text-brand-blue" bgColor="bg-brand-blueSoft" />
          <StatCard title="Pending Review" value={pending} icon={<Clock className="w-5 h-5" />} color="text-amber-600" bgColor="bg-amber-50" />
          <StatCard title="Currently Admitted" value={admitted} icon={<CheckCircle className="w-5 h-5" />} color="text-brand-green" bgColor="bg-brand-greenSoft" />
        </div>

        <OverdueReferrals 
          onSelectReferral={(r) => setSelectedReferral(r)}
          refreshTrigger={refreshTrigger}
        />

        <div className="mb-12">
          <OCRVerification onConfirm={(data) => {
            alert(`Verified Data Ready for submission:\n${JSON.stringify(data, null, 2)}\n\n(This would normally proceed to the referral creation workflow)`);
          }} />
        </div>

        {error && (
          <div className="mb-8 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-16">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider font-bold text-slate-500">
                  <th className="py-4 px-6">Patient</th>
                  <th className="py-4 px-6">Origin Facility</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Date</th>
                  <th className="py-4 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {referrals.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500 text-sm">
                      No referrals found in the registry.
                    </td>
                  </tr>
                )}
                {referrals.map((r) => (
                  <tr 
                    key={r.id} 
                    onClick={() => setSelectedReferral(r)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-6">
                      <div className="font-bold text-brand-navy group-hover:text-brand-blue transition-colors">
                        {r.patient.name}
                      </div>
                      <div className="text-xs font-mono text-slate-500 mt-1 uppercase">{r.referral_code}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        {r.referring_facility}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide border ${STATUS_COLORS[r.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {r.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-500 text-sm font-medium">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button className="text-brand-blue hover:text-brand-navy transition-colors">
                        <ChevronRight className="w-5 h-5 ml-auto" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#070D18] text-slate-400 text-xs py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 justify-center sm:justify-start">
              <div className="w-5 h-5 rounded bg-brand-blue flex items-center justify-center text-white font-bold text-[10px]">C</div>
              <span className="text-sm font-bold text-white tracking-tight">CareBridge AI</span>
            </div>
            <p className="text-slate-500">© 2026 CareBridge AI Systems. CodeX 2026 Competition Build.</p>
          </div>
          <div className="font-mono text-[10px] text-slate-600">
            HIPAA & ABDM COMPLIANT · HL7 FHIR R4 CERTIFIED
          </div>
        </div>
      </footer>

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

function StatCard({ title, value, icon, color, bgColor }: any) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-start justify-between shadow-sm hover:shadow-md transition-shadow">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">{title}</p>
        <p className="text-4xl font-extrabold text-brand-navy tracking-tight">{value}</p>
      </div>
      <div className={`p-3 rounded-xl ${bgColor} ${color}`}>
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
  const [showDischarge, setShowDischarge] = useState(false);

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

  const currentStageIndex = TIMELINE_STAGES.indexOf(referral.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-brand-navy/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#FAFAFC] rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-full border border-slate-200/60">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-200 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-blueSoft text-brand-blue flex items-center justify-center border border-blue-100">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-brand-navy font-sans tracking-tight leading-none">Referral Document</h2>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-sm font-mono text-slate-500 uppercase font-semibold">{referral.referral_code}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide border ${STATUS_COLORS[referral.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                  {referral.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-brand-navy hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Content - Scrollable */}
        <div className="p-8 overflow-y-auto space-y-10 flex-1">
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium flex items-center gap-3">
              <ShieldCheck className="w-5 h-5" /> {error}
            </div>
          )}

          {/* 1. PATIENT INFORMATION | REFERRAL INFORMATION | FACILITIES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-bold text-brand-blue uppercase tracking-widest mb-4 flex items-center gap-2">
                <User className="w-4 h-4" /> Patient Information
              </h3>
              <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                <div>
                  <p className="text-slate-500 mb-1 font-medium">Name</p>
                  <p className="font-bold text-brand-navy text-base">{referral.patient.name}</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1 font-medium">Phone</p>
                  <p className="font-semibold text-slate-700">{referral.patient.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1 font-medium">Village</p>
                  <p className="font-semibold text-slate-700">{referral.patient.village || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1 font-medium">Guardian</p>
                  <p className="font-semibold text-slate-700">{referral.patient.guardian_name || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <h3 className="text-xs font-bold text-brand-blue uppercase tracking-widest mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Facilities & Context
              </h3>
              <div className="space-y-4 text-sm flex-1">
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-slate-500 font-medium">Origin</span>
                  <span className="font-bold text-brand-navy">{referral.referring_facility}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-slate-500 font-medium">Destination</span>
                  <span className="font-bold text-brand-navy">{referral.receiving_facility}</span>
                </div>
                <div>
                  <p className="text-slate-500 mb-1 font-medium">Clinical Reason</p>
                  <p className="font-medium text-slate-700 leading-relaxed italic">
                    "{referral.referral_reason || 'No specific clinical reason provided.'}"
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 2. REFERRAL JOURNEY TIMELINE */}
          <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
             <h3 className="text-xs font-bold text-brand-blue uppercase tracking-widest mb-6">
                Referral Journey
            </h3>
            <div className="relative">
               {/* Connecting Line */}
              <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 hidden md:block"></div>
              
              <div className="grid grid-cols-1 md:grid-cols-7 gap-4 relative z-10">
                {TIMELINE_STAGES.map((stage, index) => {
                  const isCompleted = currentStageIndex >= index;
                  const isCurrent = currentStageIndex === index;
                  return (
                    <div key={stage} className="flex flex-row md:flex-col items-center gap-3 md:gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-colors z-10 ${
                        isCurrent ? 'bg-brand-blue text-white border-brand-blue ring-4 ring-brand-blueSoft' :
                        isCompleted ? 'bg-brand-greenSoft text-brand-green border-green-200' : 
                        'bg-white text-slate-300 border-slate-200'
                      }`}>
                        {isCompleted && !isCurrent ? <CheckCircle className="w-4 h-4" /> : index + 1}
                      </div>
                      <span className={`text-[11px] font-bold text-center uppercase tracking-wider ${
                        isCurrent ? 'text-brand-navy' : 
                        isCompleted ? 'text-brand-green' : 'text-slate-400'
                      }`}>
                        {stage.replace('_', ' ')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* 3. IDENTITY RECONCILIATION | HUMAN VERIFICATION */}
          <section>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                 <h3 className="text-xs font-bold text-brand-blue uppercase tracking-widest flex items-center gap-2 m-0">
                    <ShieldCheck className="w-4 h-4" /> Identity Reconciliation
                  </h3>
                  <span className="text-[10px] px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 font-bold rounded uppercase tracking-wider">Human Verification</span>
               </div>
               <div className="p-6">
                 <IdentityReconciliation referral={referral} />
               </div>
            </div>
          </section>

          {/* 4. READMISSION RISK | SHAP EXPLANATION */}
          <section>
             <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                 <h3 className="text-xs font-bold text-brand-purple uppercase tracking-widest flex items-center gap-2 m-0">
                    <Activity className="w-4 h-4" /> Readmission Risk AI
                  </h3>
                  <span className="text-[10px] px-2 py-1 bg-brand-purpleSoft text-brand-purple border border-purple-200 font-bold rounded uppercase tracking-wider">Decision Support</span>
               </div>
               <div className="p-6">
                 <ReadmissionRisk referral={referral} />
               </div>
            </div>
          </section>

          {/* 5. PHC OUTCOME / STATUS & ACTIONS */}
          <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
             <h3 className="text-xs font-bold text-brand-blue uppercase tracking-widest mb-6 flex items-center gap-2">
                <Stethoscope className="w-4 h-4" /> Clinical Actions & Status
            </h3>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-slate-100 mb-6">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-2">Update Stage</p>
                <div className="flex flex-wrap gap-3">
                  {availableStatuses.length > 0 ? (
                    <>
                      {availableStatuses.filter(s => s !== 'DISCHARGED').map(s => (
                        <button
                          key={s}
                          disabled={updating}
                          onClick={() => handleStatusChange(s)}
                          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border shadow-sm ${updating ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-0.5 hover:shadow-md'} ${
                            s === 'COMPLETED' ? 'bg-slate-800 text-white border-slate-900 hover:bg-slate-700' :
                            'bg-white text-brand-navy border-slate-200 hover:border-brand-blue hover:text-brand-blue'
                          }`}
                        >
                          Mark as {s.replace('_', ' ')}
                        </button>
                      ))}
                      {referral.status === 'ADMITTED' && (
                        <button
                          onClick={() => setShowDischarge(true)}
                          className="px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-brand-green hover:bg-emerald-600 text-white transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                        >
                          Initiate Discharge
                        </button>
                      )}
                    </>
                  ) : (
                    <span className="text-slate-500 text-sm font-medium italic">No further lifecycle transitions available.</span>
                  )}
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-500 mb-3">Add Clinical Note / Outcome</p>
              <div className="flex gap-3">
                <input 
                  type="text" 
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="e.g. Patient verified at PHC clinic..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-brand-navy font-medium focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all"
                />
                <button 
                  onClick={async () => {
                    if (!noteText.trim()) return;
                    setSubmittingNote(true);
                    try {
                      await addReferralEvent(referral.referral_code, 'NOTE_ADDED', noteText.trim());
                      setNoteText('');
                      onStatusUpdated();
                    } catch (err) {
                      setError("Failed to add note.");
                    } finally {
                      setSubmittingNote(false);
                    }
                  }}
                  disabled={submittingNote || !noteText.trim()}
                  className="px-6 py-2.5 bg-brand-navy hover:bg-brand-blue text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50 shadow-sm"
                >
                  {submittingNote ? 'Saving...' : 'Submit'}
                </button>
              </div>

              <div className="mt-6 space-y-4">
                {referral.events.map((e: any) => (
                  <div key={e.id} className="relative pl-6 pb-2 before:absolute before:left-2 before:top-2 before:w-px before:h-full before:bg-slate-200 last:before:hidden">
                    <div className="absolute left-1 top-1.5 w-2.5 h-2.5 rounded-full bg-slate-300 border-2 border-white"></div>
                    <div className="text-brand-navy font-bold text-sm">{e.event.replace(/_/g, ' ')}</div>
                    {e.note && <div className="text-slate-600 text-sm mt-1 bg-slate-50 p-3 rounded-lg border border-slate-100">{e.note}</div>}
                    <div className="text-slate-400 text-xs mt-1.5 font-mono">{new Date(e.created_at).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

        </div>
      </div>
      
      {showDischarge && (
        <DischargeModal
          referral={referral}
          onClose={() => setShowDischarge(false)}
          onSuccess={() => {
            setShowDischarge(false);
            onStatusUpdated();
          }}
        />
      )}
    </div>
  );
}
