import { uploadSingle } from '@/services/upload.api.js';
import { selectHotelAccountId, selectSessionVersion } from '../sessionSlice.js';

export function uploadPartnerImage(file, onProgress) {
  return async (_dispatch, getState) => {
    const state = getState();
    const version = selectSessionVersion(state);
    if (!selectHotelAccountId(state)) throw new Error('Sign in as a hotel partner to upload an image.');
    const result = await uploadSingle(file, onProgress);
    if (selectSessionVersion(getState()) !== version) throw new Error('The hotel session changed during upload.');
    return result;
  };
}
