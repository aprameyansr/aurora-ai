from fastapi import APIRouter, HTTPException
from app.services.explain_service import generate_explanation
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter()


@router.post("")
def explain(data: dict):
    try:
        bias_metrics = data.get("bias_metrics", {})
        explanation = generate_explanation(bias_metrics)
        return {"success": True, "explanation": explanation}
    except Exception as e:
        logger.error(f"Explain error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
