from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.services.audit_service import generate_audit_report
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()


class AuditRequest(BaseModel):
    filename: str
    target: str
    sensitive: str
    bias_result: dict
    explanation: dict
    mitigation_result: Optional[dict] = None


@router.post("/generate")
def generate_report(req: AuditRequest):
    try:
        report = generate_audit_report(
            req.filename, req.target, req.sensitive,
            req.bias_result, req.explanation, req.mitigation_result,
        )
        return {"success": True, "audit_report": report}
    except Exception as e:
        logger.error(f"Audit error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
