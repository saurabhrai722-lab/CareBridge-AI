from fastapi import FastAPI

app = FastAPI(title="CareBridge AI Backend")

# Placeholder for Database layer
# DATABASE_URL is defined in .env but will not be connected in Phase 1.

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "carebridge-backend"}
