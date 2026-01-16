"""
AutoOps Backend API
FastAPI application for autonomous employee operations
"""

import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import logging

from supervisor_retool import get_retool_supervisor_agent

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="AutoOps API",
    description="Autonomous Employee Operations Agent - Shift Coverage System",
    version="0.1.0 (Phase 0)"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request/Response Models
class ShiftMissingEvent(BaseModel):
    """Input event for shift coverage"""
    event_type: str = "shift_missing"
    shift_id: str
    missing_employee_id: str

    class Config:
        json_schema_extra = {
            "example": {
                "event_type": "shift_missing",
                "shift_id": "shift_123",
                "missing_employee_id": "emp_001"
            }
        }


class SupervisorResponse(BaseModel):
    """Response from supervisor agent"""
    replacement_employee_id: Optional[str]
    confidence: float
    reasoning: List[str]
    error: Optional[bool] = None

    class Config:
        json_schema_extra = {
            "example": {
                "replacement_employee_id": "emp_002",
                "confidence": 0.84,
                "reasoning": [
                    "Employee is available during the shift window",
                    "Employee has the highest reliability score (4.8/5.0)",
                    "Employee has fewer recent shifts (2) than alternatives"
                ]
            }
        }


# API Endpoints
@app.get("/")
def root():
    """Root endpoint - API info"""
    return {
        "name": "AutoOps API",
        "version": "0.1.0 (Phase 0)",
        "description": "Autonomous Employee Operations - Shift Coverage System",
        "endpoints": {
            "health": "/health",
            "shift_coverage": "POST /event/shift-missing"
        }
    }


@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "autoops-api",
        "version": "0.1.0"
    }


@app.post("/event/shift-missing", response_model=SupervisorResponse)
async def handle_shift_missing(event: ShiftMissingEvent):
    """
    Handle shift_missing event and find the best replacement employee

    This endpoint:
    1. Receives a shift_missing event
    2. Invokes the Supervisor Agent (Claude)
    3. Agent uses tools to query database and rank candidates
    4. Returns the best replacement with reasoning

    Args:
        event: ShiftMissingEvent with shift_id and missing_employee_id

    Returns:
        SupervisorResponse with replacement_employee_id, confidence, and reasoning
    """
    logger.info(f"Received shift_missing event: shift_id={event.shift_id}, missing_employee={event.missing_employee_id}")

    try:
        # Get Retool supervisor agent
        agent = get_retool_supervisor_agent()

        # Process the event
        result = agent.process_shift_missing_event(
            shift_id=event.shift_id,
            missing_employee_id=event.missing_employee_id
        )

        logger.info(f"Agent decision: replacement={result.get('replacement_employee_id')}, confidence={result.get('confidence')}")

        # Check for errors
        if result.get("error"):
            logger.error(f"Agent returned error: {result.get('reasoning')}")
            raise HTTPException(
                status_code=500,
                detail={
                    "error": "Agent failed to process event",
                    "reasoning": result.get("reasoning")
                }
            )

        return SupervisorResponse(**result)

    except ValueError as e:
        # Database or validation errors
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail={"error": "Invalid request", "message": str(e)}
        )

    except Exception as e:
        # Unexpected errors
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={"error": "Internal server error", "message": str(e)}
        )


# Run the server
if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("API_PORT", 8000))

    logger.info(f"Starting AutoOps API on port {port}")

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )
