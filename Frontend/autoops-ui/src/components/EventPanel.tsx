import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useEventDetail } from '../hooks/useEventDetail';
import { overrideDecision } from '../lib/api';

interface EventPanelProps {
    eventId: string | null;
}

export function EventPanel({ eventId }: EventPanelProps) {
    const { data, isLoading, error } = useEventDetail(eventId);
    const [showOverride, setShowOverride] = useState(false);
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const queryClient = useQueryClient();

    if (!eventId) {
        return (
            <main className="p-4 overflow-y-auto bg-[#f6f7f9]">
                <div className="section mb-4">
                    <h2 className="text-xs uppercase tracking-wide text-[#6b7280] font-semibold mb-2.5">Event</h2>
                    <div className="p-3.5 border border-dashed border-[#d1d5db] rounded-lg bg-white text-[#6b7280] text-sm">
                        Select an event from the inbox.
                    </div>
                </div>
                <div className="section">
                    <h2 className="text-xs uppercase tracking-wide text-[#6b7280] font-semibold mb-2.5">Decision</h2>
                    <div className="p-3.5 border border-dashed border-[#d1d5db] rounded-lg bg-white text-[#6b7280] text-sm">
                        Select an event to view decision.
                    </div>
                </div>
            </main>
        );
    }

    if (isLoading) {
        return (
            <main className="p-4 overflow-y-auto bg-[#f6f7f9]">
                <div className="animate-pulse space-y-4">
                    <div>
                        <div className="h-4 bg-gray-200 rounded w-16 mb-2.5"></div>
                        <div className="bg-white border border-[#e5e7eb] rounded-lg p-3.5">
                            <div className="space-y-2">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="grid grid-cols-[140px_1fr] gap-2.5">
                                        <div className="h-4 bg-gray-200 rounded"></div>
                                        <div className="h-4 bg-gray-100 rounded"></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div>
                        <div className="h-4 bg-gray-200 rounded w-20 mb-2.5"></div>
                        <div className="bg-white border border-[#e5e7eb] rounded-lg p-3.5">
                            <div className="h-5 bg-gray-200 rounded w-1/2 mb-3"></div>
                            <div className="h-4 bg-gray-100 rounded w-3/4"></div>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    if (error || !data) {
        return (
            <main className="p-4 overflow-y-auto bg-[#f6f7f9]">
                <div className="bg-red-50 text-red-600 p-3 rounded-lg border border-red-200 text-sm">
                    Failed to load event details.
                </div>
            </main>
        );
    }

    const handleOverride = async () => {
        if (reason.length < 10) {
            alert('Reason must be at least 10 characters');
            return;
        }

        setIsSubmitting(true);
        try {
            await overrideDecision(eventId, reason);
            queryClient.invalidateQueries({ queryKey: ['events'] });
            queryClient.invalidateQueries({ queryKey: ['event', eventId] });
            setShowOverride(false);
            setReason('');
        } catch (err) {
            alert('Failed to submit override');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="p-4 overflow-y-auto bg-[#f6f7f9]">
            {/* Event Card */}
            <div className="section mb-4">
                <h2 className="text-xs uppercase tracking-wide text-[#6b7280] font-semibold mb-2.5">Event</h2>
                <div className="bg-white border border-[#e5e7eb] rounded-lg p-3.5">
                    <div className="grid grid-cols-[140px_1fr] gap-y-1.5 gap-x-2.5 text-sm">
                        <div className="text-[#6b7280]">Event type</div>
                        <div className="text-[#111827]">{data.event.type || 'shift_callouts'}</div>

                        <div className="text-[#6b7280]">Event ID</div>
                        <div className="text-[#111827]">
                            <code className="text-xs bg-[#f3f4f6] px-1.5 py-0.5 rounded font-mono">{eventId}</code>
                        </div>

                        <div className="text-[#6b7280]">Employee</div>
                        <div className="text-[#111827]">
                            {data.event.employee} (<code className="text-xs bg-[#f3f4f6] px-1.5 py-0.5 rounded font-mono">employees.id={data.event.employee_id || 1}</code>)
                        </div>

                        <div className="text-[#6b7280]">Shift</div>
                        <div className="text-[#111827]">
                            #{data.event.shift_id || 'N/A'} (<code className="text-xs bg-[#f3f4f6] px-1.5 py-0.5 rounded font-mono">shifts.id={data.event.shift_id || 'N/A'}</code>)
                        </div>

                        <div className="text-[#6b7280]">Scheduled</div>
                        <div className="text-[#111827]">{data.event.shift_date} {data.event.shift_time}</div>
                    </div>
                </div>
            </div>

            {/* Decision Card */}
            <div className="section">
                <h2 className="text-xs uppercase tracking-wide text-[#6b7280] font-semibold mb-2.5">Decision</h2>
                {data.decision ? (
                    <div className="bg-white border border-[#e5e7eb] rounded-lg p-3.5">
                        <h3 className="text-base font-semibold text-[#111827] mb-2">{data.decision.action}</h3>
                        <div className="text-[13px] text-[#6b7280] mb-3">
                            Decision record: <code className="text-xs bg-[#f3f4f6] px-1.5 py-0.5 rounded font-mono">agent_decisions.id={data.decision.id || 50001}</code> • {new Date().toLocaleString()}
                        </div>

                        <ul className="list-disc pl-4 my-2 space-y-1 text-sm text-[#111827]">
                            <li>Applied policy <code className="text-xs bg-[#f3f4f6] px-1.5 py-0.5 rounded font-mono">{data.decision.policy || 'shift_coverage_v1.2'}</code></li>
                            <li>Updated related records and resolved status</li>
                            <li>Logged decision for audit</li>
                        </ul>

                        <div className="flex gap-2 mt-3 flex-wrap">
                            <button
                                onClick={() => setShowOverride(!showOverride)}
                                className="px-3 py-2 rounded-lg border border-[#fecaca] bg-white text-[#991b1b] text-[13px] font-semibold cursor-pointer hover:bg-red-50 transition-colors"
                            >
                                Override decision
                            </button>
                            <button className="px-3 py-2 rounded-lg border border-[#2563eb] bg-[#2563eb] text-white text-[13px] font-semibold cursor-pointer hover:bg-[#1d4ed8] transition-colors">
                                Mark reviewed
                            </button>
                        </div>

                        {/* Override Form */}
                        {showOverride && (
                            <div className="mt-3 p-3.5 bg-[#f9fafb] rounded-lg border border-[#e5e7eb]">
                                <label className="block text-sm font-medium text-[#374151] mb-2">
                                    Reason for override
                                </label>
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="w-full p-2.5 border border-[#d1d5db] rounded-lg text-sm focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb] outline-none transition-all resize-none"
                                    rows={3}
                                    placeholder="Explain why you're overriding this decision..."
                                />
                                <div className="flex items-center justify-between mt-2">
                                    <span className={`text-xs ${reason.length >= 10 ? 'text-green-600' : 'text-[#6b7280]'}`}>
                                        {reason.length}/10 minimum characters
                                    </span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setShowOverride(false);
                                                setReason('');
                                            }}
                                            className="px-3 py-1.5 rounded-lg border border-[#d1d5db] bg-white text-[#374151] text-[13px] font-medium cursor-pointer hover:bg-gray-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleOverride}
                                            disabled={isSubmitting || reason.length < 10}
                                            className="px-3 py-1.5 rounded-lg border border-[#dc2626] bg-[#dc2626] text-white text-[13px] font-medium cursor-pointer hover:bg-[#b91c1c] disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isSubmitting ? 'Submitting...' : 'Confirm Override'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-3.5 border border-dashed border-[#d1d5db] rounded-lg bg-white text-[#6b7280] text-sm">
                        No agent_decisions record found for this event.
                    </div>
                )}
            </div>
        </main>
    );
}
