from fastapi import APIRouter, UploadFile, File, HTTPException
import pandas as pd
import os

from app.utils.logger import get_logger
from app.services.bias_service import detect_sensitive_attributes

logger = get_logger(__name__)
router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
MAX_SIZE_MB = 50


@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    content = await file.read()
    if len(content) > MAX_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"File too large. Max {MAX_SIZE_MB}MB.")

    safe_filename = os.path.basename(file.filename)
    file_path = os.path.join(UPLOAD_DIR, safe_filename)

    with open(file_path, "wb") as f:
        f.write(content)

    try:
        df = pd.read_csv(file_path)
    except Exception as e:
        os.remove(file_path)
        raise HTTPException(status_code=400, detail=f"Could not parse CSV: {str(e)}")

    if df.empty:
        raise HTTPException(status_code=400, detail="CSV file is empty")

    numeric_cols   = df.select_dtypes(include=["int64", "float64"]).columns.tolist()
    categorical_cols = df.select_dtypes(include="object").columns.tolist()
    missing = {col: int(df[col].isnull().sum()) for col in df.columns if df[col].isnull().sum() > 0}
    suggested_sensitive = detect_sensitive_attributes(df)

    logger.info(f"Uploaded: {safe_filename} ({df.shape[0]} rows, {df.shape[1]} cols)")

    return {
        "success": True,
        "filename": safe_filename,
        "rows": df.shape[0],
        "columns": df.columns.tolist(),
        "numeric_columns": numeric_cols,
        "categorical_columns": categorical_cols,
        "missing_values": missing,
        "suggested_sensitive_attributes": suggested_sensitive,
        "preview": df.head(5).to_dict(orient="records"),
    }
