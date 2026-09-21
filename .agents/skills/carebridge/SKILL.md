---
name: CareBridge AI Guidelines
description: Core guidelines, flows, and safety rules for developing CareBridge AI.
---

# CareBridge AI

**Purpose**: Offline-first healthcare referral tracking and continuity.

## Core Flow
1. PHC referral
2. Offline storage
3. Sync
4. Hospital receipt
5. Identity reconciliation
6. Referral tracking
7. Discharge
8. Readmission prediction
9. SHAP explanation
10. Clinician review

## Architecture
- **Mobile**: Flutter + SQLite/Drift
- **Dashboard**: React / Vite / TypeScript
- **Backend**: FastAPI / Python
- **Database**: PostgreSQL
- **ML Services**: Python ML package

## Safety Rules
- **NEVER** auto-merge uncertain patient identities.
- **NO** diagnosis or prescription.
- **NO** fabricated medical data or ML metrics.
- Probability is **NOT** certainty.
- SHAP explanations are **NOT** causal claims.
- OCR results **REQUIRE** verification.

## Development Rules
- Use synthetic / de-identified data only.
- Run tests after implementing features.
