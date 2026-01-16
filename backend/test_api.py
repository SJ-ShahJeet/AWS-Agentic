"""
Test script for AutoOps API
Tests the shift_missing endpoint with sample data
"""

import httpx
import json
import sys


def test_shift_coverage(base_url="http://localhost:8000", shift_id="shift_123", missing_employee_id="emp_001"):
    """
    Test the shift coverage endpoint

    Args:
        base_url: Base URL of the API
        shift_id: ID of the shift that needs coverage
        missing_employee_id: ID of the unavailable employee
    """
    print("=" * 60)
    print("AutoOps API Test - Shift Coverage")
    print("=" * 60)
    print()

    # Test 1: Health check
    print("1. Testing health endpoint...")
    try:
        response = httpx.get(f"{base_url}/health")
        if response.status_code == 200:
            print("✓ Health check passed")
            print(f"  Response: {response.json()}")
        else:
            print(f"✗ Health check failed: {response.status_code}")
            return
    except Exception as e:
        print(f"✗ Failed to connect to API: {e}")
        print(f"  Make sure the server is running at {base_url}")
        return

    print()

    # Test 2: Shift coverage request
    print("2. Testing shift_missing endpoint...")
    print(f"   Shift ID: {shift_id}")
    print(f"   Missing Employee: {missing_employee_id}")
    print()

    payload = {
        "event_type": "shift_missing",
        "shift_id": shift_id,
        "missing_employee_id": missing_employee_id
    }

    try:
        print("   Sending request...")
        response = httpx.post(
            f"{base_url}/event/shift-missing",
            json=payload,
            timeout=30.0  # Allow 30 seconds for Claude to process
        )

        print(f"   Status Code: {response.status_code}")
        print()

        if response.status_code == 200:
            result = response.json()

            print("✓ Shift coverage request successful!")
            print()
            print("=" * 60)
            print("AGENT DECISION")
            print("=" * 60)
            print()
            print(f"Replacement Employee ID: {result['replacement_employee_id']}")
            print(f"Confidence: {result['confidence']:.0%}")
            print()
            print("Reasoning:")
            for i, reason in enumerate(result['reasoning'], 1):
                print(f"  {i}. {reason}")
            print()
            print("=" * 60)

        else:
            print(f"✗ Request failed with status code: {response.status_code}")
            print(f"  Response: {response.text}")

    except httpx.TimeoutException:
        print("✗ Request timed out (took more than 30 seconds)")
        print("  The agent may be taking too long to process")

    except Exception as e:
        print(f"✗ Request failed: {e}")


def main():
    """Main function"""
    # Default values
    base_url = "http://localhost:8000"
    shift_id = "shift_123"
    missing_employee_id = "emp_001"

    # Parse command line arguments
    if len(sys.argv) > 1:
        shift_id = sys.argv[1]
    if len(sys.argv) > 2:
        missing_employee_id = sys.argv[2]
    if len(sys.argv) > 3:
        base_url = sys.argv[3]

    # Run test
    test_shift_coverage(base_url, shift_id, missing_employee_id)


if __name__ == "__main__":
    print()
    print("AutoOps API Test Script")
    print()
    print("Usage: python test_api.py [shift_id] [missing_employee_id] [base_url]")
    print()
    print("Example:")
    print("  python test_api.py shift_123 emp_001 http://localhost:8000")
    print()
    print("-" * 60)
    print()

    main()
