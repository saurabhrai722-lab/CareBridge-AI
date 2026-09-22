import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Patient {
  id: number;
  name: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  village?: string;
  guardian_name?: string;
}

export interface ReferralEvent {
  id: number;
  referral_id: number;
  event: string;
  note?: string;
  created_at: string;
}

export interface Referral {
  id: number;
  referral_code: string;
  patient_id: number;
  referring_facility: string;
  receiving_facility: string;
  referral_reason?: string;
  status: string;
  created_at: string;
  updated_at: string;
  patient: Patient;
  events: ReferralEvent[];
}

export const getReferrals = async (): Promise<Referral[]> => {
  const response = await api.get('/api/v1/referrals');
  return response.data;
};

export const updateReferralStatus = async (referral_code: string, status: string): Promise<Referral> => {
  const response = await api.patch(`/api/v1/referrals/${referral_code}`, { status });
  return response.data;
};

export const getOverdueReferrals = async (): Promise<Referral[]> => {
  const response = await api.get('/api/v1/referrals/overdue');
  return response.data;
};

export const addReferralEvent = async (referral_code: string, event: string, note?: string): Promise<ReferralEvent> => {
  const response = await api.post(`/api/v1/referrals/${referral_code}/events`, { event, note });
  return response.data;
};

export interface MatchComponentScores {
  name: number;
  phone: number;
  age_dob: number;
  village: number;
  guardian: number;
  gender: number;
}

export interface MatchCandidate {
  candidate_patient: Patient;
  overall_score: number;
  classification: string;
  component_scores: MatchComponentScores;
  unavailable_fields: string[];
  conflicting_fields: string[];
  existing_reconciliation_status: string | null;
}

export const getReconciliationCandidates = async (referral_code: string): Promise<MatchCandidate[]> => {
  const response = await api.get(`/api/v1/referrals/${referral_code}/candidates`);
  return response.data;
};

export const reconcilePatient = async (referral_code: string, candidate_patient_id: number, action: 'CONFIRM' | 'REJECT'): Promise<void> => {
  await api.post(`/api/v1/referrals/${referral_code}/reconcile`, {
    candidate_patient_id,
    action
  });
};

export interface ShapExplanation {
  feature: string;
  contribution: number;
  description: string;
}

export interface ReadmissionRiskResponse {
  status: string;
  missing_features?: string[];
  detail?: string;
  risk_score?: number;
  risk_category?: string;
  base_value?: number;
  shap_values?: ShapExplanation[];
}

export interface ReadmissionRiskRequest {
  age?: number;
  gender?: string;
  referral_reason_category?: string;
  prior_admissions_count?: number;
  comorbidity_count?: number;
}

export const getReadmissionRisk = async (payload: ReadmissionRiskRequest): Promise<ReadmissionRiskResponse> => {
  const response = await api.post('/api/v1/predictions/readmission-risk', payload);
  return response.data;
};

export async function extractOCR(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/api/v1/ocr/extract', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};
