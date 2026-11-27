import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectSessionVersion } from '../sessionSlice.js';
import {
  fetchExperienceReviews,
  selectExperienceReviewStats,
  selectExperienceReviewsState,
} from './reviewsSlice.js';

export function useExperienceReviews() {
  const dispatch = useDispatch();
  const sessionVersion = useSelector(selectSessionVersion);
  const { data, loading, error } = useSelector(selectExperienceReviewsState);
  const stats = useSelector(selectExperienceReviewStats);

  useEffect(() => {
    dispatch(fetchExperienceReviews());
  }, [dispatch, sessionVersion]);

  return {
    data,
    loading: loading && data === null,
    error,
    stats,
    reload: () => dispatch(fetchExperienceReviews()),
  };
}
