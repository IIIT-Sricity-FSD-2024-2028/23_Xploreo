import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectSessionVersion } from '../sessionSlice.js';
import { fetchExperienceBookings, selectExperienceBookings } from './bookingsSlice.js';

export function useExperienceBookings() {
  const dispatch = useDispatch();
  const sessionVersion = useSelector(selectSessionVersion);
  const { data, error, requestId } = useSelector(selectExperienceBookings);

  useEffect(() => {
    dispatch(fetchExperienceBookings());
  }, [dispatch, sessionVersion]);

  return {
    data,
    error,
    loading: Boolean(requestId) || (data === null && !error),
    reload: () => dispatch(fetchExperienceBookings({ force: true })),
  };
}
