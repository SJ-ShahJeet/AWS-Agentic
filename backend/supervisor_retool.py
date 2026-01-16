"""
Supervisor Agent - Retool Workflow Integration
Calls Retool Workflow with managed LLM for shift coverage decisions
"""

import os
import httpx
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)


class RetoolSupervisorAgent:
    """
    Supervisor Agent that delegates to Retool Workflow

    Architecture:
    - FastAPI receives event (runs locally)
    - Calls Retool Workflow webhook (cloud)
    - Retool handles: DB queries + LLM reasoning + decision
    - Returns structured response

    Benefits:
    - No API keys needed (Retool provides managed Claude/GPT)
    - Visual workflow debugging in Retool UI
    - Easy to modify prompts and logic without code changes
    """

    def __init__(self, workflow_url: str):
        """
        Initialize the Retool Supervisor Agent

        Args:
            workflow_url: Retool workflow webhook URL (includes API key)
        """
        self.workflow_url = workflow_url
        self.client = httpx.Client(timeout=30.0)  # 30 second timeout

    def process_shift_missing_event(
        self,
        shift_id: str,
        missing_employee_id: str
    ) -> Dict[str, Any]:
        """
        Process a shift_missing event by calling Retool Workflow

        Args:
            shift_id: ID of the shift that needs coverage
            missing_employee_id: ID of the employee who is unavailable

        Returns:
            Dict with replacement_employee_id, confidence, and reasoning
        """
        logger.info(f"Calling Retool workflow for shift_id={shift_id}, missing_employee={missing_employee_id}")

        # Prepare payload for Retool
        payload = {
            "shift_id": shift_id,
            "missing_employee_id": missing_employee_id
        }

        try:
            # Call Retool workflow webhook
            response = self.client.post(
                self.workflow_url,
                json=payload,
                headers={"Content-Type": "application/json"}
            )

            # Check for HTTP errors
            response.raise_for_status()

            # Parse response
            result = response.json()

            logger.info(f"Retool workflow succeeded: replacement={result.get('replacement_employee_id')}")

            # Ensure consistent response format
            formatted_result = {
                "replacement_employee_id": result.get("replacement_employee_id"),
                "replacement_employee_name": result.get("replacement_employee_name"),
                "confidence": result.get("confidence", 0.0),
                "reasoning": result.get("reasoning", []),
            }

            # Add optional fields if present
            if "shift_details" in result:
                formatted_result["shift_details"] = result["shift_details"]

            if "all_candidates" in result:
                formatted_result["all_candidates"] = result["all_candidates"]

            return formatted_result

        except httpx.TimeoutException:
            logger.error("Retool workflow timeout")
            return {
                "replacement_employee_id": None,
                "confidence": 0.0,
                "reasoning": ["Workflow timed out after 30 seconds"],
                "error": True
            }

        except httpx.HTTPStatusError as e:
            logger.error(f"Retool workflow HTTP error: {e.response.status_code} - {e.response.text}")
            return {
                "replacement_employee_id": None,
                "confidence": 0.0,
                "reasoning": [f"Workflow failed with status {e.response.status_code}"],
                "error": True
            }

        except Exception as e:
            logger.error(f"Retool workflow error: {str(e)}", exc_info=True)
            return {
                "replacement_employee_id": None,
                "confidence": 0.0,
                "reasoning": [f"Workflow error: {str(e)}"],
                "error": True
            }

    def __del__(self):
        """Clean up HTTP client"""
        if hasattr(self, 'client'):
            self.client.close()


# Singleton instance
_agent_instance = None


def get_retool_supervisor_agent() -> RetoolSupervisorAgent:
    """Get or create the Retool supervisor agent instance"""
    global _agent_instance

    if _agent_instance is None:
        workflow_url = os.getenv("RETOOL_WORKFLOW_URL")
        if not workflow_url:
            raise ValueError(
                "RETOOL_WORKFLOW_URL environment variable not set. "
                "Please add your Retool workflow webhook URL to .env file."
            )

        _agent_instance = RetoolSupervisorAgent(workflow_url)

    return _agent_instance
