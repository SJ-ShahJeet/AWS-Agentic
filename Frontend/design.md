# AutoOps Architecture Documentation

**AI-Powered Operations Management Console**

---

## System Overview

AutoOps is a real-time operations dashboard that enables human managers to review and override autonomous AI supervisor decisions. The system follows a clean three-tier architecture with clear separation of concerns.

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  React + TypeScript + TanStack Query + Tailwind CSS         │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐         │
│  │  Events  │  │  Event   │  │   Explanation    │         │
│  │   Feed   │  │  Detail  │  │     Panel        │         │
│  └──────────┘  └──────────┘  └──────────────────┘         │
└─────────────────────────────────────────────────────────────┘
                          │
                    REST API (JSON)
                          │
┌─────────────────────────────────────────────────────────────┐
│                      Backend API                             │
│                   Node.js / Python / Go                      │
│                                                              │
│  GET  /api/events                                           │
│  GET  /api/events/:id                                       │
│  POST /api/events/:id/override                             │
└─────────────────────────────────────────────────────────────┘
                          │
                    Data Layer
                          │
┌─────────────────────────────────────────────────────────────┐
│                   Database / Storage                         │
│              PostgreSQL / MongoDB / SQLite                   │
└─────────────────────────────────────────────────────────────┘
```

---

## API Contract

### Base Configuration

```
Protocol:  HTTP/HTTPS
Base URL:  http://localhost:3000/api
Format:    JSON
CORS:      Required (allow localhost:5173)
```

### Endpoints

#### 1. **GET /api/events**

Returns list of all supervisor decisions requiring review.

**Response:**
```json
{
  "events": [
    {
      "id": "evt_9001",
      "summary": "Callout - Jane Doe - Tue Jan 14",
      "status": "resolved" | "pending" | "needs_review",
      "timestamp": "2026-01-14T08:30:00Z",
      "employee": "Jane Doe",
      "shift_date": "2026-01-14",
      "shift_time": "09:00-17:00"
    }
  ]
}
```

**Status Codes:**
- `200` - Success
- `500` - Server error

---

#### 2. **GET /api/events/:id**

Returns detailed information about a specific event and the AI's decision.

**Parameters:**
- `id` (path) - Event identifier (e.g., "evt_9001")

**Response:**
```json
{
  "event": {
    "id": "evt_9001",
    "summary": "Callout - Jane Doe - Tue Jan 14",
    "employee": "Jane Doe",
    "shift_date": "2026-01-14",
    "shift_time": "09:00-17:00",
    "timestamp": "2026-01-14T08:30:00Z"
  },
  "decision": {
    "action": "Assigned replacement: Bob Smith",
    "reason": "Bob Smith had highest compatibility score based on certification match, availability, and proximity to shift start time.",
    "alternatives": [
      {
        "id": "alt_1",
        "name": "Bob Smith",
        "score": 95,
        "selected": true,
        "reasons": [
          "Certified for required equipment",
          "Available in coverage pool",
          "Lives 15 minutes from site"
        ]
      },
      {
        "id": "alt_2",
        "name": "Alice Johnson",
        "score": 78,
        "selected": false,
        "reasons": [
          "Certified but lower seniority",
          "Available but 45 minutes away",
          "Recently worked overtime"
        ]
      }
    ]
  }
}
```

**Status Codes:**
- `200` - Success
- `404` - Event not found
- `500` - Server error

---

#### 3. **POST /api/events/:id/override**

Allows manager to override the AI's decision with a human judgment.

**Parameters:**
- `id` (path) - Event identifier

**Request Body:**
```json
{
  "reason": "Employee requested specific replacement for personal reasons",
  "new_selection": 2  // Optional: ID of alternative to select instead
}
```

**Response:**
```json
{
  "success": true,
  "event_id": "evt_9001",
  "overridden_at": "2026-01-16T10:45:00Z",
  "overridden_by": "manager_id_123"
}
```

**Status Codes:**
- `200` - Override successful
- `400` - Invalid request (reason too short, etc.)
- `404` - Event not found
- `500` - Server error

---

## Frontend Architecture

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | React 18 + TypeScript | Type-safe component architecture |
| **State Management** | TanStack Query v5 | Server state caching & synchronization |
| **Styling** | Tailwind CSS | Utility-first responsive design |
| **Build Tool** | Vite | Fast development server & builds |

### Component Hierarchy

```
App (QueryClient Provider)
│
└── AppContent (State: selectedEventId)
    │
    ├── OpsInbox (Left Column - 320px)
    │   └── useEvents() → Auto-refreshes every 30s
    │
    ├── EventPanel (Center Column - Flexible)
    │   └── useEventDetail(selectedId)
    │       └── OverrideForm (Conditional)
    │
    └── ExplanationPanel (Right Column - 400px)
        └── useEventDetail(selectedId)
            ├── Reasoning Card
            └── Alternatives Table
```

### Data Flow

```
┌─────────────────────────────────────────────────────────┐
│  User Action: Select Event                              │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  React State: setSelectedEventId("evt_9001")            │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  TanStack Query: Check Cache                            │
│  - Cache hit? Return immediately                        │
│  - Cache miss? Fetch from API                           │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  API Call: GET /api/events/evt_9001                     │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│  Update UI:                                             │
│  - EventPanel shows decision                            │
│  - ExplanationPanel shows reasoning                     │
└─────────────────────────────────────────────────────────┘
```

### Override Flow

```
User clicks "Override Decision"
  → Form appears with textarea
  → User enters reason (min 10 chars)
  → Click "Confirm Override"
  → POST /api/events/:id/override
  → Query cache invalidated
  → UI auto-refreshes with new status
```

---

## Backend Integration Guide

### Minimum Viable Backend

Your backend needs to implement **3 endpoints** and handle **CORS**:

```javascript
// Example Express.js setup
const express = require('express');
const cors = require('cors');
const app = express();

// CRITICAL: Enable CORS for frontend
app.use(cors({
  origin: 'http://localhost:5173'  // Vite dev server
}));

app.use(express.json());

// Route handlers
app.get('/api/events', getEvents);
app.get('/api/events/:id', getEventDetail);
app.post('/api/events/:id/override', overrideDecision);

app.listen(3000, () => {
  console.log('API running on http://localhost:3000');
});
```

### Database Schema (Suggested)

```sql
-- Events table
CREATE TABLE events (
  id VARCHAR(50) PRIMARY KEY,
  summary TEXT,
  status VARCHAR(20),
  employee VARCHAR(100),
  shift_date DATE,
  shift_time VARCHAR(20),
  timestamp TIMESTAMP
);

-- Decisions table
CREATE TABLE decisions (
  id SERIAL PRIMARY KEY,
  event_id VARCHAR(50) REFERENCES events(id),
  action TEXT,
  reason TEXT,
  created_at TIMESTAMP
);

-- Alternatives table
CREATE TABLE alternatives (
  id SERIAL PRIMARY KEY,
  decision_id INTEGER REFERENCES decisions(id),
  name VARCHAR(100),
  score INTEGER,
  selected BOOLEAN,
  reasons JSONB
);

-- Overrides table
CREATE TABLE overrides (
  id SERIAL PRIMARY KEY,
  event_id VARCHAR(50) REFERENCES events(id),
  reason TEXT,
  new_selection INTEGER,
  overridden_at TIMESTAMP,
  overridden_by VARCHAR(100)
);
```

---

## Development Setup

### Frontend Setup (5 minutes)

```bash
# 1. Create project
npm create vite@latest autoops-ui -- --template react-ts
cd autoops-ui

# 2. Install dependencies
npm install @tanstack/react-query
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# 3. Configure Tailwind (tailwind.config.js)
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
}

# 4. Add Tailwind to src/index.css
@tailwind base;
@tailwind components;
@tailwind utilities;

# 5. Start dev server
npm run dev
```

### Backend Connection Test

```bash
# Test endpoints are responding
curl http://localhost:3000/api/events

# Expected: JSON array of events
# If you get CORS errors in browser console, check backend CORS config
```

### Environment Variables

Create `.env` in frontend root:

```bash
VITE_API_URL=http://localhost:3000/api
```

Update `src/lib/api.ts`:

```typescript
const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
```

---

## Deployment Considerations

### Frontend (Static Hosting)

- **Vercel/Netlify**: Zero config, just connect git repo
- **Build command**: `npm run build`
- **Output directory**: `dist`
- **Environment variable**: Set `VITE_API_URL` to production backend

### Backend (API Server)

- **Railway/Render/Fly.io**: Container deployment
- **Required env vars**: `DATABASE_URL`, `PORT`, `CORS_ORIGIN`
- **Health check**: `GET /health` endpoint recommended

### CORS in Production

```javascript
app.use(cors({
  origin: [
    'http://localhost:5173',           // Local dev
    'https://autoops.vercel.app'       // Production
  ]
}));
```

---

## Performance Optimizations

### Caching Strategy

```typescript
// TanStack Query automatically caches for 5 minutes
// Customizable per query:

useQuery({
  queryKey: ['events'],
  queryFn: getEvents,
  staleTime: 30000,      // Data fresh for 30s
  cacheTime: 300000,     // Keep in cache for 5min
  refetchInterval: 30000 // Auto-refresh every 30s
});
```

### Pagination (Future Enhancement)

```typescript
// Backend: Add limit/offset params
GET /api/events?limit=50&offset=0

// Frontend: Use useInfiniteQuery
import { useInfiniteQuery } from '@tanstack/react-query';
```

---

## Security Considerations

### Authentication (Not Implemented)

For production, add:

1. **JWT tokens** in request headers
2. **Backend validation** on all endpoints
3. **Role-based access** (manager vs. viewer)

```typescript
// Example with auth
const res = await fetch(`${API}/events`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### Input Validation

```typescript
// Frontend validation
if (reason.length < 10) {
  throw new Error('Reason must be at least 10 characters');
}

// Backend validation (critical)
if (!req.body.reason || req.body.reason.length < 10) {
  return res.status(400).json({ error: 'Invalid reason' });
}
```

---

## Testing Checklist

### Backend Tests

- [ ] `GET /api/events` returns array
- [ ] `GET /api/events/:id` returns event + decision
- [ ] `POST /api/events/:id/override` updates database
- [ ] CORS headers present in all responses
- [ ] 404 handling for invalid IDs
- [ ] 400 handling for invalid override reasons

### Frontend Tests

- [ ] Events list loads and displays
- [ ] Clicking event shows details in center panel
- [ ] Explanation panel shows alternatives
- [ ] Override form requires 10+ character reason
- [ ] Override submission refreshes data
- [ ] Loading states display correctly
- [ ] Error states handled gracefully

### Integration Tests

```bash
# Start backend on :3000
# Start frontend on :5173
# Open browser to localhost:5173

# Should work:
✓ Events appear in left column
✓ Click event → details load
✓ Override → sends POST → UI updates
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **CORS errors** | Add `cors()` middleware to backend |
| **404 on API calls** | Check backend is running on port 3000 |
| **Data not refreshing** | Verify `queryClient.invalidateQueries()` calls |
| **TypeScript errors** | Ensure types match API contract |
| **Tailwind not working** | Check `tailwind.config.js` content paths |

---

## Future Enhancements

- **Real-time updates**: WebSocket connection for live event feed
- **Filtering**: Search by employee, date, status
- **Analytics**: Dashboard showing override rates, AI accuracy
- **Bulk actions**: Review multiple events at once
- **Export**: Download decision logs as CSV/PDF
- **Mobile**: Responsive design for tablet/phone approval

---

## Contact & Support

**Frontend Repository**: [Link to frontend repo]  
**Backend Repository**: [Link to backend repo]  
**Documentation**: This file  
**Demo Video**: [Link to demo]

---

**Built for hackathon judges by**: [Your Team Name]  
**Estimated integration time**: 30 minutes with working backend  
**Lines of code**: ~500 (frontend) + ~200 (backend)