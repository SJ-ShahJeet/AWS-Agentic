# AutoOps Frontend - Vibe Code Spec

Build a clean ops console for reviewing autonomous supervisor decisions.

---

## What This Is

A **3-column dashboard** where managers review what an AI supervisor decided:
- Left: Event feed (what happened)
- Center: Decision details (what AI did)
- Right: Explanation (why AI did it)

**Vibe**: Incident management console (like PagerDuty), not HR software.

---

## Design Style

### Colors
- Background: `bg-gray-50`
- Cards: `bg-white` with `border border-gray-200`
- Status pills:
  - Resolved: `bg-green-100 text-green-800`
  - Pending: `bg-yellow-100 text-yellow-800`
  - Needs Review: `bg-red-100 text-red-800`

### Typography
- Headers: `font-semibold text-gray-900`
- Body: `text-gray-700`
- Labels: `text-xs uppercase text-gray-500`
- Monospace IDs: `font-mono text-sm`

### Layout
- Desktop: 3 fixed columns (`grid grid-cols-[320px_1fr_400px]`)
- Mobile: Stack vertically (not priority for hackathon)

---

## API Integration

### Base Setup

```typescript
// src/lib/api.ts
const API = 'http://localhost:3000/api';

export async function getEvents() {
  const res = await fetch(`${API}/events`);
  return res.json();
}

export async function getEventDetail(id: string) {
  const res = await fetch(`${API}/events/${id}`);
  return res.json();
}

export async function overrideDecision(id: string, reason: string, newSelection?: number) {
  const res = await fetch(`${API}/events/${id}/override`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason, new_selection: newSelection }),
  });
  return res.json();
}
```

### Data Hooks (React Query)

```typescript
// src/hooks/useEvents.ts
import { useQuery } from '@tanstack/react-query';
import { getEvents } from '@/lib/api';

export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: getEvents,
    refetchInterval: 30000, // Auto-refresh every 30s
  });
}

// src/hooks/useEventDetail.ts
import { useQuery } from '@tanstack/react-query';
import { getEventDetail } from '@/lib/api';

export function useEventDetail(id: string | null) {
  return useQuery({
    queryKey: ['event', id],
    queryFn: () => getEventDetail(id!),
    enabled: !!id,
  });
}
```

---

## Component Structure

```
App
├── OpsInbox (left column)
├── EventPanel (center column)
└── ExplanationPanel (right column)
```

---

## Components

### 1. OpsInbox (Left Column)

**Purpose**: Show event feed

```typescript
import { useEvents } from '@/hooks/useEvents';

export function OpsInbox({ 
  selectedId, 
  onSelect 
}: { 
  selectedId: string | null; 
  onSelect: (id: string) => void;
}) {
  const { data, isLoading } = useEvents();

  if (isLoading) {
    return <div className="p-4">Loading events...</div>;
  }

  return (
    <div className="h-screen overflow-y-auto bg-gray-50 border-r">
      <div className="p-4 border-b bg-white">
        <h2 className="font-semibold text-lg">Ops Inbox</h2>
        <p className="text-sm text-gray-500">{data.events.length} events</p>
      </div>
      
      <div className="p-2 space-y-2">
        {data.events.map((event: any) => (
          <button
            key={event.id}
            onClick={() => onSelect(event.id)}
            className={`w-full text-left p-3 rounded border transition ${
              selectedId === event.id 
                ? 'bg-blue-50 border-blue-300' 
                : 'bg-white border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="font-medium text-sm">{event.summary}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded text-xs ${
                event.status === 'resolved' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {event.status}
              </span>
              <span className="text-xs text-gray-500">
                {new Date(event.timestamp).toLocaleString()}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
```

---

### 2. EventPanel (Center Column)

**Purpose**: Show what happened + what AI decided

```typescript
import { useEventDetail } from '@/hooks/useEventDetail';
import { useState } from 'react';
import { overrideDecision } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';

export function EventPanel({ eventId }: { eventId: string | null }) {
  const { data, isLoading } = useEventDetail(eventId);
  const [showOverride, setShowOverride] = useState(false);
  const [reason, setReason] = useState('');
  const queryClient = useQueryClient();

  if (!eventId) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400">
        Select an event to view details
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  const handleOverride = async () => {
    if (reason.length < 10) {
      alert('Reason must be at least 10 characters');
      return;
    }
    
    await overrideDecision(eventId, reason);
    queryClient.invalidateQueries(['events']);
    queryClient.invalidateQueries(['event', eventId]);
    setShowOverride(false);
    setReason('');
  };

  return (
    <div className="h-screen overflow-y-auto p-8">
      {/* Event Info */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <h3 className="text-xs uppercase text-gray-500 mb-2">Event</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Employee</span>
            <span className="font-medium">{data.event.employee}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Shift</span>
            <span className="font-medium">
              {data.event.shift_date} {data.event.shift_time}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Event ID</span>
            <span className="font-mono text-sm text-gray-500">{eventId}</span>
          </div>
        </div>
      </div>

      {/* Decision */}
      {data.decision && (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-xs uppercase text-gray-500 mb-2">Decision</h3>
          <p className="text-lg font-semibold text-gray-900 mb-4">
            {data.decision.action}
          </p>
          
          <div className="flex gap-3">
            <button
              onClick={() => setShowOverride(!showOverride)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium transition"
            >
              Override Decision
            </button>
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition">
              Mark Reviewed
            </button>
          </div>

          {/* Override Form */}
          {showOverride && (
            <div className="mt-4 p-4 bg-gray-50 rounded border">
              <label className="block text-sm font-medium mb-2">
                Reason for override
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full p-2 border rounded text-sm"
                rows={3}
                placeholder="Explain why you're overriding this decision..."
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleOverride}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                >
                  Confirm Override
                </button>
                <button
                  onClick={() => setShowOverride(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

---

### 3. ExplanationPanel (Right Column)

**Purpose**: Show WHY the AI made this decision

```typescript
import { useEventDetail } from '@/hooks/useEventDetail';

export function ExplanationPanel({ eventId }: { eventId: string | null }) {
  const { data, isLoading } = useEventDetail(eventId);

  if (!eventId || isLoading || !data?.decision) {
    return null;
  }

  return (
    <div className="h-screen overflow-y-auto bg-gray-50 border-l p-6">
      <h3 className="text-xs uppercase text-gray-500 mb-4">Explanation</h3>

      {/* Reasoning */}
      <div className="bg-white border rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-sm mb-2">Why this decision?</h4>
        <p className="text-sm text-gray-700 leading-relaxed">
          {data.decision.reason}
        </p>
      </div>

      {/* Alternatives Table */}
      <div className="bg-white border rounded-lg p-4">
        <h4 className="font-semibold text-sm mb-3">Candidates Considered</h4>
        <div className="space-y-3">
          {data.decision.alternatives.map((alt: any) => (
            <div
              key={alt.id}
              className={`p-3 rounded border-l-4 ${
                alt.selected 
                  ? 'border-green-500 bg-green-50' 
                  : 'border-gray-300 bg-gray-50'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="font-medium">{alt.name}</span>
                <span className={`text-sm font-semibold ${
                  alt.selected ? 'text-green-700' : 'text-gray-600'
                }`}>
                  Score: {alt.score}
                </span>
              </div>
              
              <ul className="space-y-1">
                {alt.reasons.map((reason: string, i: number) => (
                  <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className={alt.selected ? 'text-green-600' : 'text-gray-400'}>
                      •
                    </span>
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

### 4. Main App Layout

```typescript
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OpsInbox } from './components/OpsInbox';
import { EventPanel } from './components/EventPanel';
import { ExplanationPanel } from './components/ExplanationPanel';

const queryClient = new QueryClient();

function AppContent() {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-[320px_1fr_400px] h-screen">
      <OpsInbox 
        selectedId={selectedEventId} 
        onSelect={setSelectedEventId} 
      />
      <EventPanel eventId={selectedEventId} />
      <ExplanationPanel eventId={selectedEventId} />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
```

---

## Backend Connection Checklist

### Environment Setup
```bash
# .env
VITE_API_URL=http://localhost:3000/api
```

### CORS (Backend needs this)
```javascript
app.use(require('cors')());
```

### Test Endpoints Work
```bash
curl http://localhost:3000/api/events
curl http://localhost:3000/api/events/9001
```

---

## Package Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@tanstack/react-query": "^5.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.4.0"
  }
}
```

---

## Start Coding

1. **Setup**: `npm create vite@latest autoops-ui -- --template react-ts`
2. **Install**: `npm install @tanstack/react-query`
3. **Copy**: Paste components above into `src/components/`
4. **API**: Create `src/lib/api.ts` with fetch functions
5. **Run**: `npm run dev`

**Backend must be running on :3000 first!**

---

## Success Criteria

- [ ] Events load in left column
- [ ] Clicking event shows details in center
- [ ] Explanation panel shows alternatives
- [ ] Override button opens form
- [ ] Submitting override refreshes data
- [ ] No console errors

---

**Time to build**: 1-2 hours if backend is ready