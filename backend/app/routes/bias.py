from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List

from app.services.bias_service import analyze_bias
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()


class BiasRequest(BaseModel):
    file_path: str
    target: str
    sensitive: str
    extra_sensitive: Optional[List[str]] = None


@router.post("/analyze")
def analyze(req: BiasRequest):
    try:
        result = analyze_bias(req.file_path, req.target, req.sensitive, req.extra_sensitive)
        return {"success": True, "bias_metrics": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Bias analysis error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
