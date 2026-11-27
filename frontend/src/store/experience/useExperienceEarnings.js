import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectSessionVersion } from '../sessionSlice.js';
import { selectExperienceEarningsRevision } from './bookingsSlice.js';
import {
  fetchExperienceEarnings,
  selectExperienceEarningsState,
} from './earningsSlice.js';

export function useExperienceEarnings(days = '90') {
  const dispatch = useDispatch();
  const sessionVersion = useSelector(selectSessionVersion);
  const earningsRevision = useSelector(selectExperienceEarningsRevision);
  const { byDays, loading, error } = useSelector(selectExperienceEarningsState);

  const data = byDays?.[String(days)] ?? null;

  // Auto-refresh when days changes, session changes, or a booking updates (earningsRevision increments)
  useEffect(() => {
    dispatch(fetchExperienceEarnings({ days }));
  }, [dispatch, days, sessionVersion, earningsRevision]);

  return {
    data,
    error,
    loading: loading && !data,
    reload: () => dispatch(fetchExperienceEarnings({ days })),
  };
}
