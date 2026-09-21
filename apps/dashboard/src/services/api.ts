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
