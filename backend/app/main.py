"""
AURORA AI - AI Governance & Bias Detection Platform
FastAPI Backend - Production Grade
"""

import logging
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.routes import dataset, bias, explain, simulation, mitigation, audit
from app.utils.logger import get_logger

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 AURORA AI Backend starting up...")
    yield
    logger.info("🛑 AURORA AI Backend shutting down...")


app = FastAPI(
    title="AURORA AI Governance Platform",
    description="Bias Detection, Explanation, and Mitigation for AI Systems",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = round((time.time() - start) * 1000, 1)
    logger.info(f"{request.method} {request.url.path} → {response.status_code} ({duration}ms)")
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": "Internal server error", "detail": str(exc)},
    )


app.include_router(dataset.router,    prefix="/dataset",    tags=["Dataset"])
app.include_router(bias.router,       prefix="/bias",       tags=["Bias Analysis"])
app.include_router(explain.router,    prefix="/explain",    tags=["Explainability"])
app.include_router(simulation.router, prefix="/simulation", tags=["Simulation"])
app.include_router(mitigation.router, prefix="/mitigation", tags=["Mitigation"])
app.include_router(audit.router,      prefix="/audit",      tags=["Audit"])


@app.get("/")
def root():
    return {"success": True, "message": "AURORA AI Governance Platform v2.0.0", "status": "running"}


@app.get("/health")
def health():
    return {"success": True, "status": "healthy", "version": "2.0.0"}
