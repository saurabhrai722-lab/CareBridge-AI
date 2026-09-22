# CareBridge AI

Offline-first healthcare referral tracking and continuity.

## Sub-projects
- `apps/mobile`: Flutter mobile app.
- `apps/dashboard`: React/Vite dashboard.
- `backend`: FastAPI Python backend.
- `ml`: Machine learning package.
- `identity`: Patient identity reconciliation package.
- `ocr`: OCR package for document parsing.

## Development
See `.agents/skills/carebridge/SKILL.md` for guidelines.

### Running on Physical Devices
By default, the mobile app points to `http://10.0.2.2:8000` (Android Emulator) or `http://127.0.0.1:8000` (Desktop).
If you want to run the app on a physical device over your local Wi-Fi, you must pass the `API_URL` environment variable during the flutter run or build command:
```bash
flutter run --dart-define=API_URL=http://<YOUR_LOCAL_IP>:8000
```
