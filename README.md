# AutoOps - Autonomous Employee Operations

AI-powered shift coverage agent for hackathon demo.

## Overview

AutoOps automatically finds the best replacement when an employee calls out sick. It uses:
- **Retool Workflows** for AI reasoning (managed Claude - no API keys!)
- **FastAPI** backend running locally
- **Supabase** for employee/shift data

## Architecture

```
Frontend → FastAPI (localhost:8000) → Retool Workflow → Supabase
                                            ↓
                                    Claude LLM (managed)
                                            ↓
                                      Decision + Reasoning
```

## Quick Start

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Set Up Retool Workflow

📖 **Follow the complete guide:** [RETOOL_SETUP.md](RETOOL_SETUP.md)

**Summary:**
1. Sign up at https://login.retool.com/auth/signup (free)
2. Connect your Supabase database
3. Create "Shift Coverage Agent" workflow
4. Copy webhook URL

### 3. Configure Environment

```bash
cd backend
cp .env.example .env
# Edit .env and add your Retool webhook URL
```

### 4. Run Locally

```bash
python main.py
```

Server starts at `http://localhost:8000`

### 5. Test It

```bash
# In another terminal
python test_api.py
```

## API Usage

### Endpoint

```
POST http://localhost:8000/event/shift-missing
```

### Request

```json
{
  "event_type": "shift_missing",
  "shift_id": "shift_123",
  "missing_employee_id": "emp_001"
}
```

### Response

```json
{
  "replacement_employee_id": "emp_002",
  "replacement_employee_name": "John Smith",
  "confidence": 0.87,
  "reasoning": [
    "Employee is available during the shift window",
    "Highest reliability score (4.8/5.0) among candidates",
    "Worked only 2 shifts this week vs team average of 4"
  ]
}
```

## Project Structure

```
AWS-Agentic/
├── README.md                    ← You are here
├── RETOOL_SETUP.md              ← Detailed Retool workflow guide
├── .gitignore                   ← Git ignore rules
│
└── backend/
    ├── main.py                  ← FastAPI application
    ├── supervisor_retool.py     ← Retool workflow client
    ├── test_api.py              ← Test script
    ├── requirements.txt         ← Python dependencies
    ├── .env                     ← Your configuration (gitignored)
    └── .env.example             ← Configuration template
```

## How It Works

1. **Frontend** sends shift_missing event to FastAPI
2. **FastAPI** validates request and calls Retool webhook
3. **Retool Workflow** executes:
   - Queries Supabase for shift details
   - Gets available employees
   - Ranks candidates (deterministic algorithm)
   - Uses Claude to generate reasoning
4. **Returns** decision with explanation
5. **FastAPI** forwards response to frontend

## Key Features

✅ **No API Keys Required** - Retool provides managed Claude/GPT
✅ **Local Development** - FastAPI runs on your laptop
✅ **Free Tier** - 500 workflow runs + 20 agent hours/month
✅ **Visual Debugging** - See every execution in Retool UI
✅ **Explainable AI** - Clear reasoning for every decision

## Configuration

### Environment Variables

```env
# Required
RETOOL_WORKFLOW_URL=https://your-org.retool.com/api/workflows/.../startTrigger?workflowApiKey=...

# Optional
ENVIRONMENT=development
LOG_LEVEL=INFO
API_PORT=8000
```

See `.env.example` for details.

## Troubleshooting

### "RETOOL_WORKFLOW_URL environment variable not set"
- Update `backend/.env` with your Retool webhook URL
- Get URL from Retool workflow settings

### "Workflow timed out"
- Check Retool execution logs
- Verify Supabase connection in Retool

### "No candidates found"
- Ensure your Supabase has employee data
- Check shift_id and employee_id exist

### Module Errors
- Run `pip install -r requirements.txt`
- Use Python 3.9+

## Tech Stack

- **Backend**: FastAPI 0.115.0 + Python 3.9+
- **AI Orchestration**: Retool Workflows
- **LLM**: Claude 4.5 Sonnet (managed by Retool)
- **Database**: Supabase (PostgreSQL)
- **HTTP Client**: httpx

## Development

### API Documentation

FastAPI auto-generates docs:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Testing

```bash
# Test API endpoint
python test_api.py

# Test with custom data
python test_api.py shift_456 emp_003

# Test with curl
curl -X POST http://localhost:8000/event/shift-missing \
  -H "Content-Type: application/json" \
  -d '{"shift_id":"shift_123","missing_employee_id":"emp_001"}'
```

### Logs

View detailed execution logs:
- **Local**: Check FastAPI terminal output
- **Retool**: View workflow execution logs in Retool dashboard

## Next Steps

1. ✅ **Complete Retool Setup** - Follow [RETOOL_SETUP.md](RETOOL_SETUP.md)
2. ✅ **Test Locally** - Run test script
3. ✅ **Build Frontend** - Create UI to call the API
4. ✅ **Add Features** - Onboarding, payouts, feedback
5. 🚀 **Demo!**

## Resources

- **Retool Setup Guide**: [RETOOL_SETUP.md](RETOOL_SETUP.md)
- **Retool Docs**: https://docs.retool.com/workflows
- **FastAPI Docs**: https://fastapi.tiangolo.com
- **Supabase Docs**: https://supabase.com/docs

## Team

- **Backend + AI**: You
- **Database**: Teammate (Supabase)
- **Frontend**: Teammate (React/Next.js)

## License

MIT

---

**Built for hackathon speed** 🚀

For detailed Retool workflow setup, see [RETOOL_SETUP.md](RETOOL_SETUP.md)
