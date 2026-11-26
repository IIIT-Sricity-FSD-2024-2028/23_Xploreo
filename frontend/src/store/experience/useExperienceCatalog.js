import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectSessionVersion } from '../sessionSlice.js';
import { fetchExperiences, selectExperienceCatalog } from './experiencesSlice.js';

export function useExperienceCatalog() {
  const dispatch = useDispatch();
  const sessionVersion = useSelector(selectSessionVersion);
  const { data, error, requestId } = useSelector(selectExperienceCatalog);

  useEffect(() => {
    dispatch(fetchExperiences());
  }, [dispatch, sessionVersion]);

  return {
    data,
    error,
    loading: Boolean(requestId) || (data === null && !error),
    reload: () => dispatch(fetchExperiences({ force: true })),
  };
}
