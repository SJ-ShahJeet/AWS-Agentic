import { useState } from 'react';
import { useEvents } from '../hooks/useEvents';
import type { Event } from '../lib/api';

interface OpsInboxProps {
    selectedId: string | null;
    onSelect: (id: string) => void;
}

const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'shift_coverage', label: 'Coverage' },
    { key: 'payout_approval', label: 'Payout' },
    { key: 'onboarding', label: 'Onboarding' },
    { key: 'feedback_processing', label: 'Feedback' },
];

export function OpsInbox({ selectedId, onSelect }: OpsInboxProps) {
    const { data, isLoading, error } = useEvents();
    const [activeFilter, setActiveFilter] = useState('all');

    if (isLoading) {
        return (
            <aside className="bg-white border-r border-[#e5e7eb] p-3 overflow-y-auto">
                <div className="animate-pulse space-y-3">
                    <div className="flex gap-2 flex-wrap mb-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-7 w-16 bg-gray-200 rounded-full"></div>
                        ))}
                    </div>
                    <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-20 bg-gray-100 rounded-lg"></div>
                    ))}
                </div>
            </aside>
        );
    }

    if (error) {
        return (
            <aside className="bg-white border-r border-[#e5e7eb] p-3 overflow-y-auto">
                <div className="bg-red-50 text-red-600 p-3 rounded-lg border border-red-200 text-sm">
                    Failed to load events. Is the backend running?
                </div>
            </aside>
        );
    }

    // Filter events based on active filter
    const filteredEvents = data?.events.filter((event: Event) =>
        activeFilter === 'all' ? true : event.type === activeFilter
    ) || [];

    return (
        <aside className="bg-white border-r border-[#e5e7eb] p-3 overflow-y-auto">
            {/* Filter Chips */}
            <div className="flex gap-2 flex-wrap mb-3">
                {FILTERS.map((filter) => (
                    <button
                        key={filter.key}
                        onClick={() => setActiveFilter(filter.key)}
                        className={`text-xs px-2.5 py-1.5 rounded-full border cursor-pointer select-none transition-colors ${activeFilter === filter.key
                                ? 'border-[#2563eb] bg-[#eff6ff] text-[#1d4ed8]'
                                : 'border-[#d1d5db] bg-white text-[#374151] hover:bg-gray-50'
                            }`}
                    >
                        {filter.label}
                    </button>
                ))}
            </div>

            {/* Section Header */}
            <h2 className="text-xs uppercase tracking-wide text-[#6b7280] font-semibold mb-2.5">
                Ops Inbox
            </h2>

            {/* Event List */}
            <div className="space-y-2">
                {filteredEvents.length === 0 ? (
                    <div className="p-3.5 border border-dashed border-[#d1d5db] rounded-lg bg-white text-[#6b7280] text-sm">
                        No events for this filter.
                    </div>
                ) : (
                    filteredEvents.map((event: Event) => (
                        <button
                            key={event.id}
                            onClick={() => onSelect(event.id)}
                            className={`w-full text-left p-2.5 rounded-lg border cursor-pointer transition-colors ${selectedId === event.id
                                    ? 'border-[#2563eb] bg-[#eff6ff]'
                                    : 'border-[#e5e7eb] bg-white hover:bg-gray-50'
                                }`}
                        >
                            <div className="flex justify-between items-center gap-2.5">
                                <span className="font-semibold text-sm text-[#111827]">{event.summary}</span>
                                <StatusPill status={event.status} />
                            </div>
                            <div className="text-[13px] text-[#6b7280] mt-0.5">
                                {event.employee} • Shift #{event.shift_id || 'N/A'}
                            </div>
                            <div className="text-[13px] text-[#6b7280]">
                                {new Date(event.timestamp).toLocaleString()}
                            </div>
                        </button>
                    ))
                )}
            </div>
        </aside>
    );
}

function StatusPill({ status }: { status: Event['status'] }) {
    const styles = {
        resolved: 'bg-[#dcfce7] text-[#166534]',
        pending: 'bg-[#fef9c3] text-[#854d0e]',
        needs_review: 'bg-[#fee2e2] text-[#991b1b]',
    };

    const labels = {
        resolved: 'Resolved',
        pending: 'Pending',
        needs_review: 'Needs Review',
    };

    return (
        <span className={`inline-block text-xs px-2 py-0.5 rounded-full whitespace-nowrap font-medium ${styles[status]}`}>
            {labels[status]}
        </span>
    );
}
