from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.services.simulation_service import SimulationEngine
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()

engine: Optional[SimulationEngine] = None


class InitRequest(BaseModel):
    file_path: str
    target: str
    sensitive_feature: str = ""


class PredictRequest(BaseModel):
    input: dict


class WhatIfRequest(BaseModel):
    input: dict
    modified: dict


class CounterfactualRequest(BaseModel):
    input: dict
    desired_outcome: int = 1
    n: int = 5


class BiasTestRequest(BaseModel):
    input: dict
    sensitive_feature: str


class ScenarioRequest(BaseModel):
    base_input: dict
    n_scenarios: int = 4


class SweepRequest(BaseModel):
    base_input: dict
    feature: str
    steps: int = 12


class BoundaryRequest(BaseModel):
    feature_x: str
    feature_y: str
    base_input: dict
    steps: int = 8


def _require_engine():
    if engine is None:
        raise HTTPException(status_code=400, detail="Engine not initialized. POST /simulation/init first.")


@router.post("/init")
def init_engine(req: InitRequest):
    global engine
    try:
        engine = SimulationEngine(req.file_path, req.target, req.sensitive_feature)
        return {
            "success": True,
            "message": "Simulation engine ready",
            "features": engine.feature_names,
            "rows": len(engine.df),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/predict")
def predict(req: PredictRequest):
    _require_engine()
    try:
        return {"success": True, **engine.predict(req.input)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/what-if")
def what_if(req: WhatIfRequest):
    _require_engine()
    try:
        return {"success": True, **engine.what_if(req.input, req.modified)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/counterfactual")
def counterfactual(req: CounterfactualRequest):
    _require_engine()
    try:
        cfs = engine.generate_counterfactuals(req.input, req.desired_outcome, req.n)
        return {"success": True, "counterfactuals": cfs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/bias-test")
def bias_test(req: BiasTestRequest):
    _require_engine()
    try:
        result = engine.bias_sensitivity_test(req.input, req.sensitive_feature)
        return {"success": True, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/scenarios")
def scenarios(req: ScenarioRequest):
    _require_engine()
    try:
        return {"success": True, "scenarios": engine.generate_scenarios(req.base_input, req.n_scenarios)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sweep")
def feature_sweep(req: SweepRequest):
    _require_engine()
    try:
        return {"success": True, **engine.feature_sweep(req.base_input, req.feature, req.steps)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/boundary")
def boundary(req: BoundaryRequest):
    _require_engine()
    try:
        points = engine.decision_boundary_sample(req.feature_x, req.feature_y, req.base_input, req.steps)
        return {"success": True, "points": points}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
