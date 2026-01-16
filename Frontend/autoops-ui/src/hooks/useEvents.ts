import { useQuery } from '@tanstack/react-query';
import { getEvents } from '../lib/api';
import type { EventsResponse } from '../lib/api';

export function useEvents() {
    return useQuery<EventsResponse>({
        queryKey: ['events'],
        queryFn: getEvents,
        refetchInterval: 30000, // Auto-refresh every 30s
    });
}
