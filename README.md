# AURORA AI — Bias Governance Platform v2.0

## Quick Start

### 1. Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # Already has a key in .env
uvicorn app.main:app --reload --port 8000
```

Backend runs at: http://localhost:8000  
Swagger docs:    http://localhost:8000/docs

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: http://localhost:3000

---

## Workflow

1. **Upload** → `/upload` — Upload any CSV. Select target column + sensitive attribute.
2. **Dashboard** → `/dashboard` — See all fairness metrics, radar chart, proxy detection, intersectional bias.
3. **Mitigation** → `/mitigation` — Run 3 fairness strategies. Compare before/after risk scores.
4. **Audit** → `/audit` — Generate compliance report (EEOC, EU AI Act). Get deployment decision.
5. **Simulation** → `/simulation` — What-If, counterfactuals, bias test, feature sweep.

---

## Test Dataset

Download the UCI Adult Income dataset (https://archive.ics.uci.edu/dataset/2/adult):
- Target column: `income` (or `income_binary`)
- Sensitive attribute: `sex` or `race`

Or use any CSV with a binary target column.

---

## Environment Variables

```
GEMINI_API_KEY=your_key_here   # Optional — falls back to rule-based explanation if missing
```

---

## Architecture

```
backend/
  app/
    main.py                  # FastAPI app entry point
    routes/
      dataset.py             # /dataset/upload
      bias.py                # /bias/analyze
      explain.py             # /explain
      simulation.py          # /simulation/*
      mitigation.py          # /mitigation/run
      audit.py               # /audit/generate
    services/
      bias_service.py        # All fairness metric computation
      explain_service.py     # Gemini + rule-based fallback
      simulation_service.py  # SimulationEngine
      mitigation_service.py  # Reweighting, suppression, fairness-aware
      audit_service.py       # Compliance report generation
    utils/
      logger.py              # Structured logging
      response.py            # Standardized API responses

frontend/
  app/
    page.tsx                 # Landing page
    upload/page.tsx          # File upload + column config
    dashboard/page.tsx       # Full analysis dashboard
    mitigation/page.tsx      # Mitigation strategies
    audit/page.tsx           # Compliance audit report
    simulation/page.tsx      # What-if simulation engine
  Context/AppContext.tsx     # Global state
  lib/api.ts                 # API client
  components/layout/Navbar.tsx
```

---

## Fairness Metrics

| Metric | Threshold | Standard |
|--------|-----------|----------|
| Disparate Impact Ratio | ≥ 0.8 | EEOC 80% Rule |
| Demographic Parity Diff | < 0.1 | General fairness |
| Equalized Odds Diff | < 0.1 | General fairness |
| Statistical Parity Ratio | ≥ 0.8 | General fairness |

Risk Score: 0–100 composite (LOW < 20, MEDIUM < 50, HIGH ≥ 50)
