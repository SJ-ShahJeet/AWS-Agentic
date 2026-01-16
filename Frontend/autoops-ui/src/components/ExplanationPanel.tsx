import { useState } from 'react';
import { useEventDetail } from '../hooks/useEventDetail';
import type { Alternative } from '../lib/api';

interface ExplanationPanelProps {
    eventId: string | null;
}

export function ExplanationPanel({ eventId }: ExplanationPanelProps) {
    const { data, isLoading } = useEventDetail(eventId);
    const [showJson, setShowJson] = useState(false);

    if (!eventId) {
        return (
            <div className="bg-[#fafafa] border-l border-[#e5e7eb] p-4 overflow-y-auto">
                <div className="section">
                    <h2 className="text-xs uppercase tracking-wide text-[#6b7280] font-semibold mb-2.5">
                        Explanation / Evidence
                    </h2>
                    <div className="p-3.5 border border-dashed border-[#d1d5db] rounded-lg bg-white text-[#6b7280] text-sm">
                        Select an event to view explanation.
                    </div>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="bg-[#fafafa] border-l border-[#e5e7eb] p-4 overflow-y-auto">
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-32 mb-2.5"></div>
                    <div className="bg-white border border-[#e5e7eb] rounded-lg p-3.5">
                        <div className="space-y-2">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-4 bg-gray-100 rounded"></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!data?.decision) {
        return (
            <div className="bg-[#fafafa] border-l border-[#e5e7eb] p-4 overflow-y-auto">
                <div className="section">
                    <h2 className="text-xs uppercase tracking-wide text-[#6b7280] font-semibold mb-2.5">
                        Explanation / Evidence
                    </h2>
                    <div className="p-3.5 border border-dashed border-[#d1d5db] rounded-lg bg-white text-[#6b7280] text-sm">
                        No explanation available (missing agent_decisions row).
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#fafafa] border-l border-[#e5e7eb] p-4 overflow-y-auto">
            <div className="section">
                <h2 className="text-xs uppercase tracking-wide text-[#6b7280] font-semibold mb-2.5">
                    Explanation / Evidence
                </h2>

                <div className="bg-white border border-[#e5e7eb] rounded-lg p-3.5">
                    {/* Key-Value section */}
                    <div className="grid grid-cols-[140px_1fr] gap-y-1.5 gap-x-2.5 text-sm mb-4">
                        <div className="text-[#6b7280]">Policy</div>
                        <div className="text-[#111827]">
                            <code className="text-xs bg-[#f3f4f6] px-1.5 py-0.5 rounded font-mono">
                                {data.decision.policy || 'shift_coverage_v1.2'}
                            </code>
                        </div>

                        <div className="text-[#6b7280]">Selected</div>
                        <div className="text-[#111827]">{data.decision.selected || 'N/A'}</div>

                        <div className="text-[#6b7280]">Inputs</div>
                        <div className="text-[#111827]">
                            <code className="text-xs bg-[#f3f4f6] px-1.5 py-0.5 rounded font-mono">shift_id={data.decision.shift_id || 'N/A'}</code>
                            {data.decision.role && <span> • {data.decision.role}</span>}
                        </div>
                    </div>

                    {/* Reasoning */}
                    <div className="mt-2.5">
                        <p className="text-sm">
                            <strong className="text-[#111827]">Reasoning</strong><br />
                            <span className="text-[#374151]">{data.decision.reason}</span>
                        </p>
                    </div>

                    {/* Alternatives Table */}
                    {data.decision.alternatives && data.decision.alternatives.length > 0 && (
                        <div className="mt-4">
                            <p className="text-sm font-semibold text-[#111827] mb-2">Alternatives considered</p>
                            <table className="w-full border-collapse text-[13px]">
                                <thead>
                                    <tr className="border-b border-[#e5e7eb]">
                                        <th className="text-left py-1.5 px-2 text-[#6b7280] font-semibold">Candidate</th>
                                        <th className="text-left py-1.5 px-2 text-[#6b7280] font-semibold">Score</th>
                                        <th className="text-left py-1.5 px-2 text-[#6b7280] font-semibold">Reasons</th>
                                        <th className="text-left py-1.5 px-2 text-[#6b7280] font-semibold">Excluded</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.decision.alternatives.map((alt: Alternative) => (
                                        <tr key={alt.id} className="border-b border-[#e5e7eb]">
                                            <td className="py-1.5 px-2 text-[#111827]">{alt.name}</td>
                                            <td className="py-1.5 px-2 text-[#111827]">{alt.score}</td>
                                            <td className="py-1.5 px-2 text-[#111827]">
                                                {alt.selected ? alt.reasons.join(', ') : '—'}
                                            </td>
                                            <td className="py-1.5 px-2 text-[#111827]">
                                                {!alt.selected ? alt.reasons.join(', ') : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* JSON Toggle */}
                <button
                    onClick={() => setShowJson(!showJson)}
                    className="mt-2.5 inline-flex items-center gap-2 text-[13px] font-semibold text-[#1d4ed8] cursor-pointer select-none hover:underline"
                >
                    {showJson ? '▼' : '▶'} View decision_output JSON
                </button>

                {showJson && (
                    <div className="mt-2.5 bg-[#0b1020] text-[#d1d5db] rounded-lg p-3 text-xs font-mono leading-relaxed border border-[#111827] overflow-x-auto">
                        <pre className="whitespace-pre-wrap break-words">
                            {JSON.stringify(data.decision, null, 2)}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
}
