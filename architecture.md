# Architecture

- Mobile app (Flutter) creates referrals at Primary Health Centers (PHCs).
- Data syncs offline-first to the central PostgreSQL DB via FastAPI backend.
- ML models process readmission risk.
- Dashboard (React) visualizes data for clinician review.
