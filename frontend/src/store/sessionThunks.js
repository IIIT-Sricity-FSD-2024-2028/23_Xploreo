import { authApi } from '@/services/api.js';
import { updatePartnerProfile } from '@/services/hotels.api.js';
import { setSessionToken } from '@/services/session.js';
import { profileUpdated, selectUser, sessionEnded, sessionStarted } from './sessionSlice.js';

function readRegion(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload)).region;
  } catch {
    return undefined;
  }
}

const ntaRegions = { NTA001: 'Jaipur', NTA002: 'Goa', NTA003: 'Delhi', NTA004: 'Mumbai', NTA005: 'Kerala' };

function startSession(request, values) {
  return async (dispatch) => {
    const result = await request(values);
    const { token: userToken, ...account } = result.user ?? result;
    const token = result.token ?? userToken;
    const region = account.region || account.location || account.destination || readRegion(token)
      || (account.role === 'experience' ? 'Kerala' : ntaRegions[account.userId] ?? ntaRegions[account.username]);
    const user = {
      ...account,
      id: account.id ?? account.userId ?? account.username,
      partnerType: account.role,
      region: region ?? account.region,
      location: region ?? account.location,
    };
    setSessionToken(token);
    dispatch(sessionStarted(user));
    return user;
  };
}

export const signIn = (values) => startSession(authApi.login, values);
export const registerAccount = (values) => startSession(authApi.register, values);

export const signOut = () => (dispatch) => {
  setSessionToken(null);
  dispatch(sessionEnded());
};

export const saveExperiencePartnerProfile = (userId, body) => async (dispatch, getState) => {
  const result = await updatePartnerProfile(userId, body);
  const currentUser = selectUser(getState());
  const updatedUser = {
    ...currentUser,
    ...(result?.user ?? result ?? {}),
    name: body.name || result?.name || currentUser.name,
    email: body.email || result?.email || currentUser.email,
    phone: body.phone || result?.phone || currentUser.phone,
    location: body.location || result?.location || currentUser.location,
    businessName: body.businessName || result?.businessName || currentUser.businessName,
  };
  dispatch(profileUpdated(updatedUser));
  return result;
};
