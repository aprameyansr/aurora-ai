from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.mitigation_service import run_all_mitigations
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()


class MitigateRequest(BaseModel):
    file_path: str
    target: str
    sensitive: str


@router.post("/run")
def run_mitigation(req: MitigateRequest):
    try:
        results = run_all_mitigations(req.file_path, req.target, req.sensitive)
        return {"success": True, "mitigation_results": results}
    except Exception as e:
        logger.error(f"Mitigation error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
