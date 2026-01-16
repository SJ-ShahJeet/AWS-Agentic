import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OpsInbox } from './components/OpsInbox';
import { EventPanel } from './components/EventPanel';
import { ExplanationPanel } from './components/ExplanationPanel';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
    },
  },
});

function AppContent() {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-[#f6f7f9]">
      {/* Header */}
      <header className="px-5 py-3 bg-[#111827] text-white flex justify-between items-center">
        <div>
          <span className="font-semibold">AutoOps ▸ Manager Console</span>
          <div className="text-[13px] text-white/80 font-medium">
            Schema-backed UI (employees, shifts, callouts, onboarding, feedback, payouts, agent_decisions)
          </div>
        </div>
        <div className="text-[13px] text-white/80 font-medium">
          Live data • Backend connected
        </div>
      </header>

      {/* Main Content Grid */}
      <div className="grid grid-cols-[320px_1fr_440px] h-[calc(100vh-52px)]">
        <OpsInbox selectedId={selectedEventId} onSelect={setSelectedEventId} />
        <EventPanel eventId={selectedEventId} />
        <ExplanationPanel eventId={selectedEventId} />
      </div>
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
