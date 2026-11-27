import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import TicketList from '../../components/tickets/TicketList.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { MOCK_TICKETS } from '../../mocks/tickets/tickets.fixture.js';
import {
  fetchTickets,
  resolveTicketThunk,
  selectTaTickets,
  selectTaTicketsError,
  selectTaTicketsLoading,
} from '../../store/techadmin/index.js';
import '../../components/tickets/tickets.css';

/**
 * Tech Admin Tickets Page.
 * Mounts the production TicketList component with real ticket loading and resolution flows.
 * Tickets come from the shared Redux store (state.techadmin.tickets), the same collection the
 * TA dashboard shows. Also supports isolated previews with previewMockData prop.
 *
 * @param {Object} props
 * @param {boolean} [props.previewMockData=false] - When true, runs in isolated preview mode with mock tickets
 */
export default function TechAdminTicketsPage({ previewMockData = false }) {
  const { user } = useAuth();
  const session = useMemo(() => {
    return user || { userId: 'TA001', role: 'techadmin' };
  }, [user]);

  const dispatch = useDispatch();
  const storeTickets = useSelector(selectTaTickets);
  const storeLoading = useSelector(selectTaTicketsLoading);
  const storeError = useSelector(selectTaTicketsError);

  // Isolated development preview: fixture tickets kept only in this page, never written to the
  // shared store and never sent to the network. null = still "loading" the preview.
  const [previewTickets, setPreviewTickets] = useState(null);

  useEffect(() => {
    // If explicit mock preview requested, load mock fixture directly without network calls
    if (previewMockData) {
      const timer = setTimeout(() => setPreviewTickets(MOCK_TICKETS), 100);
      return () => clearTimeout(timer);
    }
    // Loads once per session; tickets already in the store are reused when navigating back here.
    dispatch(fetchTickets());
    return undefined;
  }, [dispatch, previewMockData]);

  const tickets = previewMockData ? previewTickets ?? [] : storeTickets;
  const isLoading = previewMockData ? previewTickets === null : storeLoading;
  const errorMessage = previewMockData ? null : storeError?.message ?? null;

  const handleResolveTicket = async (ticketId, resolution) => {
    if (previewMockData) {
      setPreviewTickets((prev) =>
        (prev ?? []).map((t) =>
          t.id === ticketId
            ? {
                ...t,
                status: 'RESOLVED',
                resolvedAt: new Date().toISOString(),
                resolvedBy: session?.userId || 'TA001',
                resolution: resolution || 'Resolved in preview mode',
              }
            : t
        )
      );
      return;
    }

    try {
      // The slice updates this ticket in place from the server response — no list refetch.
      // unwrap() makes a failed resolve (e.g. 400 already resolved) throw, as TicketDetailsModal expects.
      await dispatch(resolveTicketThunk({ ticketId, resolution })).unwrap();
    } catch (err) {
      throw new Error(err?.message || 'Failed to resolve ticket.', { cause: err });
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
          Support Tickets Queue
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: '6px' }}>
          Inspect, prioritize, and resolve traveller and system support requests.
        </p>
      </div>

      <TicketList
        tickets={tickets}
        isLoading={isLoading}
        error={errorMessage}
        onResolveTicket={handleResolveTicket}
      />
    </div>
  );
}
