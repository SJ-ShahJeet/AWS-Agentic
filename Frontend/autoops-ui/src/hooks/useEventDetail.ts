import { useQuery } from '@tanstack/react-query';
import { getEventDetail } from '../lib/api';
import type { EventDetail } from '../lib/api';

export function useEventDetail(id: string | null) {
    return useQuery<EventDetail>({
        queryKey: ['event', id],
        queryFn: () => getEventDetail(id!),
        enabled: !!id,
    });
}
