const API = 'http://localhost:3000/api';

export interface Event {
    id: string;
    summary: string;
    status: 'resolved' | 'pending' | 'needs_review';
    timestamp: string;
    employee: string;
    shift_date: string;
    shift_time: string;
}

export interface Alternative {
    id: string;
    name: string;
    score: number;
    selected: boolean;
    reasons: string[];
}

export interface Decision {
    action: string;
    reason: string;
    alternatives: Alternative[];
}

export interface EventDetail {
    event: Event;
    decision: Decision;
}

export interface EventsResponse {
    events: Event[];
}

export async function getEvents(): Promise<EventsResponse> {
    const res = await fetch(`${API}/events`);
    if (!res.ok) throw new Error('Failed to fetch events');
    return res.json();
}

export async function getEventDetail(id: string): Promise<EventDetail> {
    const res = await fetch(`${API}/events/${id}`);
    if (!res.ok) throw new Error('Failed to fetch event detail');
    return res.json();
}

export async function overrideDecision(
    id: string,
    reason: string,
    newSelection?: number
): Promise<{ success: boolean; event_id: string; overridden_at: string }> {
    const res = await fetch(`${API}/events/${id}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, new_selection: newSelection }),
    });
    if (!res.ok) throw new Error('Failed to override decision');
    return res.json();
}
