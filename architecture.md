# Architecture

- Mobile app (Flutter) creates referrals at Primary Health Centers (PHCs).
- Data syncs offline-first to the central PostgreSQL DB via FastAPI backend.
- ML models process readmission risk.
- Dashboard (React) visualizes data for clinician review.

## Database Architecture (Phase 2)

The backend uses a PostgreSQL-compatible schema implemented via SQLAlchemy and Alembic.

### Core Entities & Relationships

- **Patient**: Stores core identity fields (name, phone, dob, gender, village).
- **Referral**: Represents a referral episode. Contains a unique `referral_code` and links to a `Patient`. Includes origin and destination facility details, and a `status` (e.g., CREATED, SENT, RECEIVED).
- **ReferralEvent**: A time-series log of updates for a specific `Referral`. Used to track the referral lifecycle timeline.

### Intentionally Deferred
- **Offline Sync & SMS Tracking**: Database schema supports it via `referral_code`, but logic is deferred to later phases.
- **Identity Reconciliation (Fuzzy Matching)**: No auto-merging functionality is implemented yet.
- **ML / SHAP / OCR**: Deferred to later phases.
- **Full API / CRUD**: Only the database foundation is built currently.
