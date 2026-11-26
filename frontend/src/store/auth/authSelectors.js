import { createSelector } from '@reduxjs/toolkit';

export const selectAuthState = (state) => state.auth;
export const selectAuthUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthLoading = (state) => state.auth.loading;
export const selectAuthError = (state) => state.auth.error;
export const selectAuthResetMessage = (state) => state.auth.resetMessage;

export const selectAuthRole = createSelector([selectAuthUser, selectIsAuthenticated], (user, isAuth) =>
  isAuth ? user.role : null
);

export const selectAuthRegion = createSelector([selectAuthUser], (user) =>
  user?.region ?? user?.location ?? user?.destination ?? null
);
