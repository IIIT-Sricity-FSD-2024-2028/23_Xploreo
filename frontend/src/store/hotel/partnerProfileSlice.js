import { getPartnerProfile, updatePartnerProfile } from '@/services/hotels.api.js';
import { createReadThunk, createRepositorySlice, createWriteThunk } from './resource.js';

export const fetchPartnerProfile = createReadThunk('profile', async () => [await getPartnerProfile()]);
export const partnerProfileSlice = createRepositorySlice('profile', fetchPartnerProfile, () => 'profile');

export const savePartnerProfile = createWriteThunk('profile/save', ({ values }) => updatePartnerProfile(values),
  (record, _args, dispatch) => {
    dispatch(partnerProfileSlice.actions.update({ record, replace: true, fetchedAt: Date.now() }));
  });
