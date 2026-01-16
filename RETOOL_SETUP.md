# AutoOps with Retool - Complete Setup Guide

## 🎯 What We're Building

```
┌────────────────────────────────────────────────────────┐
│  YOUR LAPTOP (Local Development)                      │
│                                                        │
│  Frontend → FastAPI (localhost:8000)                  │
│                ↓                                       │
└────────────────┼───────────────────────────────────────┘
                 │ HTTPS POST
                 ↓
┌────────────────────────────────────────────────────────┐
│  RETOOL CLOUD (Free Tier)                             │
│                                                        │
│  Workflow receives webhook                            │
│      ↓                                                 │
│  Query Supabase for available employees               │
│      ↓                                                 │
│  Rank candidates (deterministic code)                 │
│      ↓                                                 │
│  Use Claude/GPT (managed by Retool - FREE!)          │
│      ↓                                                 │
│  Generate reasoning & decision                        │
│      ↓                                                 │
│  Return JSON response                                 │
│                                                        │
└────────────────┬───────────────────────────────────────┘
                 │
                 ↓
          Local FastAPI
                 ↓
            Frontend
```

**Key Benefits:**
- ✅ **No LLM API keys needed** - Retool provides managed Claude & GPT
- ✅ **Free tier**: 500 workflow runs + 20 agent hours per month
- ✅ **Local FastAPI** - runs on your laptop at localhost:8000
- ✅ **Visual debugging** - see every workflow execution in Retool UI
- ✅ **Easy to modify** - tweak LLM prompts without code changes

---

## Part 1: Retool Setup (15 minutes)

### Step 1.1: Create Retool Account

1. Go to: https://login.retool.com/auth/signup
2. Sign up with your email
3. Choose organization name: `autoops` (or whatever you prefer)
4. Select: **Free tier**

### Step 1.2: Connect Supabase Database

1. In Retool dashboard, click **Resources** (left sidebar)
2. Click **Create new** → **Supabase**
3. Fill in your credentials:
   - **Name**: `AutoOps Database`
   - **Host**: `https://stncrqeinqandouzfgoe.supabase.co`
   - **Database**: `postgres` (default)
   - **Service Role Key**:
     ```
     eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0bmNycWVpbnFhbmRvdXpmZ29lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODU4MjgzOSwiZXhwIjoyMDg0MTU4ODM5fQ.TjDP8lPat0KBulUv_cxJTZMFR3LO8wPRkWvz6CqJCo0
     ```
4. Click **Test connection** → should show ✓ Connected
5. Click **Create resource**

### Step 1.3: Create Workflow

1. Click **Workflows** (left sidebar)
2. Click **Create new workflow**
3. Name it: `Shift Coverage Agent`

---

## Part 2: Build the Workflow

### Step 2.1: Configure Webhook Trigger

1. You'll see **Start trigger** block
2. Click on it → Select **Webhook**
3. Retool generates a webhook URL like:
   ```
   https://[your-org].retool.com/api/workflows/[id]/startTrigger?workflowApiKey=[key]
   ```
4. **Copy this URL** - save it for later!

### Step 2.2: Add Workflow Blocks

Now add these blocks in sequence:

---

#### Block 1: Get Shift Details

1. Click **+** button → **Query a resource**
2. Select: `AutoOps Database` (Supabase)
3. Configure:
   - **Name**: `getShiftDetails`
   - **Query type**: SQL
   - **SQL**:
     ```sql
     SELECT
       id,
       employee_id,
       scheduled_start,
       scheduled_end,
       role_required,
       status
     FROM shifts
     WHERE id = {{ trigger.data.shift_id }}
     LIMIT 1;
     ```
4. Click **Save**

---

#### Block 2: Get Available Employees

1. Click **+** → **Query a resource**
2. Select: `AutoOps Database`
3. Configure:
   - **Name**: `getAvailableEmployees`
   - **Query type**: SQL
   - **SQL**:
     ```sql
     SELECT
       e.id,
       e.name,
       e.role,
       e.reliability_score,
       COUNT(s.id) as recent_shifts_count
     FROM employees e
     LEFT JOIN shifts s ON s.employee_id = e.id
       AND s.scheduled_start >= NOW() - INTERVAL '7 days'
     WHERE
       e.status = 'active'
       AND e.id != {{ trigger.data.missing_employee_id }}
       AND e.role = {{ getShiftDetails.data[0].role_required }}
     GROUP BY e.id, e.name, e.role, e.reliability_score
     HAVING COUNT(s.id) < 7;
     ```
4. Click **Save**

---

#### Block 3: Rank Candidates (JavaScript)

1. Click **+** → **Run JavaScript code**
2. Configure:
   - **Name**: `rankCandidates`
   - **Code**:
     ```javascript
     const candidates = {{ getAvailableEmployees.data }};

     if (!candidates || candidates.length === 0) {
       return [];
     }

     // Rank candidates using deterministic algorithm
     const ranked = candidates.map(candidate => {
       // Normalize reliability (0-5 scale to 0-1)
       const reliabilityScore = (candidate.reliability_score || 4.0) / 5.0;

       // Normalize recent shifts (fewer is better)
       const recentShiftsScore = 1.0 - Math.min((candidate.recent_shifts_count || 0) / 7.0, 1.0);

       // Availability (binary - all candidates here are available)
       const availabilityScore = 1.0;

       // Weighted total score
       const totalScore = (
         reliabilityScore * 0.5 +
         recentShiftsScore * 0.3 +
         availabilityScore * 0.2
       );

       return {
         id: candidate.id,
         name: candidate.name,
         role: candidate.role,
         reliability_score: candidate.reliability_score,
         recent_shifts_count: candidate.recent_shifts_count,
         score: parseFloat(totalScore.toFixed(2)),
         breakdown: {
           reliability: parseFloat(reliabilityScore.toFixed(2)),
           workload: parseFloat(recentShiftsScore.toFixed(2)),
           availability: availabilityScore
         }
       };
     });

     // Sort by score descending
     ranked.sort((a, b) => b.score - a.score);

     return ranked;
     ```
3. Click **Save**

---

#### Block 4: Generate Reasoning with Claude (AI Action)

1. Click **+** → **AI action**
2. Configure:
   - **Name**: `generateReasoning`
   - **AI provider**: **Anthropic** (Retool-managed)
   - **Model**: **Claude Sonnet 4.5** (or Claude Opus 4 if you want smarter)
   - **Prompt**:
     ```
     You are an operations supervisor AI analyzing shift coverage decisions.

     SHIFT INFORMATION:
     - Shift ID: {{ trigger.data.shift_id }}
     - Scheduled: {{ getShiftDetails.data[0].scheduled_start }} to {{ getShiftDetails.data[0].scheduled_end }}
     - Role needed: {{ getShiftDetails.data[0].role_required }}
     - Missing employee: {{ trigger.data.missing_employee_id }}

     TOP CANDIDATE SELECTED:
     - Name: {{ rankCandidates.value[0].name }}
     - ID: {{ rankCandidates.value[0].id }}
     - Reliability Score: {{ rankCandidates.value[0].reliability_score }}/5.0
     - Recent Shifts (7 days): {{ rankCandidates.value[0].recent_shifts_count }}
     - Overall Score: {{ rankCandidates.value[0].score }}

     ALL CANDIDATES (ranked):
     {{ JSON.stringify(rankCandidates.value, null, 2) }}

     Generate 3-5 clear, specific bullet points explaining why this candidate is the best choice.
     Focus on concrete data points (reliability, workload balance, availability).

     Return ONLY a JSON array of strings, no extra text:
     ["reason 1", "reason 2", "reason 3"]
     ```
   - **Response format**: Text
3. Click **Save**

---

#### Block 5: Parse AI Response

1. Click **+** → **Run JavaScript code**
2. Configure:
   - **Name**: `parseReasoning`
   - **Code**:
     ```javascript
     const aiResponse = {{ generateReasoning.value }};

     try {
       // Try to parse as JSON
       return JSON.parse(aiResponse);
     } catch (e) {
       // If not JSON, split by newlines and extract bullet points
       const lines = aiResponse.split('\n')
         .map(line => line.trim())
         .filter(line => line.length > 0 && (line.startsWith('-') || line.startsWith('•') || line.match(/^\d+\./)))
         .map(line => line.replace(/^[-•]\s*/, '').replace(/^\d+\.\s*/, ''));

       return lines.length > 0 ? lines : [
         "Selected based on highest overall score",
         "Candidate meets all availability requirements",
         "Balanced workload distribution maintained"
       ];
     }
     ```
3. Click **Save**

---

#### Block 6: Return Response

1. Click **+** → **Return**
2. Configure:
   - **Name**: `returnResponse`
   - **Response body**:
     ```json
     {
       "replacement_employee_id": "{{ rankCandidates.value[0].id }}",
       "replacement_employee_name": "{{ rankCandidates.value[0].name }}",
       "confidence": {{ rankCandidates.value[0].score }},
       "reasoning": {{ JSON.stringify(parseReasoning.value) }},
       "shift_details": {{ JSON.stringify(getShiftDetails.data[0]) }},
       "all_candidates": {{ JSON.stringify(rankCandidates.value) }}
     }
     ```
3. Click **Save**

---

### Step 2.3: Test the Workflow

1. Click **Test** button (top right)
2. Enter test payload:
   ```json
   {
     "shift_id": "shift_123",
     "missing_employee_id": "emp_001"
   }
   ```
3. Click **Run test**
4. You should see:
   - ✓ Each block executes in sequence
   - ✓ Green checkmarks on successful blocks
   - ✓ Final response with replacement employee + reasoning

5. **If it fails:**
   - Click on the failed block to see error
   - Common issues:
     - Shift/employee doesn't exist in DB → add test data
     - SQL syntax error → check table/column names
     - AI response parsing → check Claude output format

6. Once working, click **Save workflow** (top right)

---

### Step 2.4: Get Your Webhook URL

1. In the workflow, click **Start trigger** block
2. Copy the **Webhook URL** - it looks like:
   ```
   https://yourorg.retool.com/api/workflows/abc123def/startTrigger?workflowApiKey=retool_wk_xxxxxxxxxxxxx
   ```
3. **Save this URL** - you'll need it in the next step!

---

## Part 3: Update Local FastAPI

### Step 3.1: Update .env File

Open `backend/.env` and update:

```env
# Comment out or remove Anthropic key (not needed!)
# ANTHROPIC_API_KEY=sk-ant-xxxxx

# Add Retool Webhook URL
RETOOL_WORKFLOW_URL=https://yourorg.retool.com/api/workflows/abc123def/startTrigger?workflowApiKey=retool_wk_xxxxxxxxxxxxx

# Keep Supabase (not used directly, but good to have)
SUPABASE_URL=https://stncrqeinqandouzfgoe.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0bmNycWVpbnFhbmRvdXpmZ29lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODU4MjgzOSwiZXhwIjoyMDg0MTU4ODM5fQ.TjDP8lPat0KBulUv_cxJTZMFR3LO8wPRkWvz6CqJCo0

# Application Settings
ENVIRONMENT=development
LOG_LEVEL=INFO
API_PORT=8000
```

### Step 3.2: Code is Already Updated!

Your `supervisor.py` has been updated to call the Retool webhook.

---

## Part 4: Run & Test

### Step 4.1: Start FastAPI

```bash
cd backend
python main.py
```

You should see:
```
INFO:     Started server process
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Step 4.2: Test the API

In another terminal:

```bash
cd backend
python test_api.py
```

**Expected output:**
```
AutoOps API Test - Shift Coverage
==================================================

1. Testing health endpoint...
✓ Health check passed

2. Testing shift_missing endpoint...
   Shift ID: shift_123
   Missing Employee: emp_001

   Sending request...
   Status Code: 200

✓ Shift coverage request successful!

==================================================
AGENT DECISION
==================================================

Replacement Employee ID: emp_002
Confidence: 87%

Reasoning:
  1. Employee is available during shift window (8am-4pm on 2026-01-17)
  2. Highest reliability score (4.8/5.0) among available candidates
  3. Has worked only 2 shifts in the past 7 days, below team average
  4. Possesses required role qualifications for this shift

==================================================
```

---

## Part 5: Debugging & Monitoring

### View Workflow Executions in Retool

1. Go to Retool → **Workflows** → **Shift Coverage Agent**
2. Click **Runs** tab
3. You'll see every execution with:
   - Input data
   - Each step's output
   - Execution time
   - Any errors

### Common Issues

**"Workflow not found"**
- Check webhook URL in `.env` is correct
- Make sure workflow is saved (not draft)

**"No candidates found"**
- Check your Supabase has employee data
- Use Retool's query tester to run SQL directly

**"AI response parsing failed"**
- Check Claude's response in workflow execution logs
- Adjust prompt to ensure JSON output

**"Timeout"**
- Workflow takes >30 seconds
- Optimize SQL queries or simplify AI prompt

---

## Part 6: Customize & Improve

### Change LLM Model

In Retool workflow → AI Action block:
- **Claude Opus 4**: Smarter, slower, higher cost
- **Claude Sonnet 4.5**: Balanced (recommended)
- **Claude Haiku**: Faster, cheaper, simpler reasoning
- **GPT-5**: OpenAI's latest model

### Adjust Ranking Algorithm

In `rankCandidates` JavaScript block, change weights:
```javascript
const totalScore = (
  reliabilityScore * 0.4 +    // Reduce reliability weight
  recentShiftsScore * 0.5 +   // Increase workload balance weight
  availabilityScore * 0.1
);
```

### Add More Context to AI

In `generateReasoning` prompt, add:
```
EMPLOYEE PERFORMANCE HISTORY:
{{ /* Add query for past performance */ }}

MANAGER PREFERENCES:
{{ /* Add business rules */ }}
```

### Cache Workflow Results

Add a Code block to check if this shift was already processed and return cached result.

---

## Architecture Benefits

✅ **Local Development**
- FastAPI runs on localhost:8000
- Easy debugging
- Works with your IDE

✅ **Cloud AI Power**
- Retool provides managed Claude/GPT
- No API key management
- Free tier included

✅ **Flexible**
- Change LLM model in UI (no code changes)
- Update prompts visually
- Test changes instantly

✅ **Production Ready**
- Same workflow works in production
- Retool handles scaling
- Built-in monitoring

---

## Next Steps

1. ✅ **Add more tools** - Create workflow blocks for other operations
2. ✅ **Build frontend** - Call `POST /event/shift-missing` from React
3. ✅ **Add auth** - Protect your FastAPI endpoints
4. ✅ **Deploy** - FastAPI to cloud, keep Retool workflows
5. 🎯 **Demo at hackathon!**

---

## Resources

- **Retool Dashboard**: https://[your-org].retool.com
- **Workflow Docs**: https://docs.retool.com/workflows
- **AI Actions**: https://docs.retool.com/ai
- **Community**: https://community.retool.com

---

**You're now running a full agentic system with:**
- Local FastAPI backend
- Cloud-powered AI reasoning (Claude)
- Real database integration
- Explainable decisions
- All for FREE! 🎉
