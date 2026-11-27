import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  createUserOrPartner,
  deleteUserOrPartner,
  getBookingVelocity,
  getDashboardMetrics,
  getDisputes,
  getEarningsSeries,
  getFinanceMetrics,
  getLedgerTransactions,
  getOperationsMetrics,
  getPayouts,
  getRecentBookings,
  getRefundRequests,
  getUsersAndPartners,
  isSuperAdminMockMode,
  processPayoutAction,
  processRefundAction,
  resolveDisputeAction,
  updateUserProfile,
  updateUserStatus,
} from '@/services/superadmin.api.js';
import {
  createStaffAccount,
  listStaff,
  setStaffRegion,
  setStaffStatus,
} from '@/services/adminManagement.api.js';

// ============================================================================
// 1. DASHBOARD THUNKS
// ============================================================================

export const fetchDashboardDataThunk = createAsyncThunk(
  'superadmin/fetchDashboardData',
  async ({ timeframe = 'weekly', session } = {}, { rejectWithValue }) => {
    try {
      const [metrics, velocity, recentBookings] = await Promise.all([
        getDashboardMetrics(session),
        getBookingVelocity(timeframe, session),
        getRecentBookings(10, session),
      ]);
      return {
        metrics,
        velocity: Array.isArray(velocity) ? velocity : [],
        recentBookings: Array.isArray(recentBookings) ? recentBookings : [],
      };
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to load executive dashboard data.');
    }
  }
);

export const fetchBookingVelocityThunk = createAsyncThunk(
  'superadmin/fetchBookingVelocity',
  async ({ timeframe = 'weekly', session } = {}, { rejectWithValue }) => {
    try {
      const data = await getBookingVelocity(timeframe, session);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to load booking velocity.');
    }
  }
);

// ============================================================================
// 2. USERS & PARTNERS THUNKS
// ============================================================================

export const fetchUsersThunk = createAsyncThunk(
  'superadmin/fetchUsers',
  async ({ roleFilter = 'all', session } = {}, { rejectWithValue }) => {
    try {
      const data = await getUsersAndPartners(roleFilter, session);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to load users and partners.');
    }
  }
);

export const createUserThunk = createAsyncThunk(
  'superadmin/createUser',
  async ({ payload, session }, { dispatch, rejectWithValue }) => {
    try {
      const created = await createUserOrPartner(payload, session);
      await dispatch(fetchUsersThunk({ roleFilter: 'all', session }));
      return created;
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to create user account.');
    }
  }
);

export const updateUserThunk = createAsyncThunk(
  'superadmin/updateUser',
  async ({ userId, data, session }, { dispatch, rejectWithValue }) => {
    try {
      const updated = await updateUserProfile(userId, data, session);
      await dispatch(fetchUsersThunk({ roleFilter: 'all', session }));
      return updated;
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to update profile.');
    }
  }
);

export const updateUserStatusThunk = createAsyncThunk(
  'superadmin/updateUserStatus',
  async ({ userId, nextStatus, session }, { dispatch, rejectWithValue }) => {
    try {
      const updated = await updateUserStatus(userId, nextStatus, session);
      await dispatch(fetchUsersThunk({ roleFilter: 'all', session }));
      return updated;
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to update account status.');
    }
  }
);

export const deleteUserThunk = createAsyncThunk(
  'superadmin/deleteUser',
  async ({ userId, session }, { dispatch, rejectWithValue }) => {
    try {
      const res = await deleteUserOrPartner(userId, session);
      await dispatch(fetchUsersThunk({ roleFilter: 'all', session }));
      return { userId, res };
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to delete account.');
    }
  }
);

// ============================================================================
// 3. ADMIN MANAGEMENT (STAFF) THUNKS
// ============================================================================

export const fetchStaffThunk = createAsyncThunk(
  'superadmin/fetchStaff',
  async (_, { rejectWithValue }) => {
    try {
      const data = await listStaff();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to load admin accounts.');
    }
  }
);

export const createStaffThunk = createAsyncThunk(
  'superadmin/createStaff',
  async (payload, { dispatch, rejectWithValue }) => {
    try {
      const created = await createStaffAccount(payload);
      await dispatch(fetchStaffThunk());
      return created;
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to create admin account.');
    }
  }
);

export const updateStaffStatusThunk = createAsyncThunk(
  'superadmin/updateStaffStatus',
  async ({ userId, nextStatus }, { dispatch, rejectWithValue }) => {
    try {
      const updated = await setStaffStatus(userId, nextStatus);
      await dispatch(fetchStaffThunk());
      return updated;
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to update account status.');
    }
  }
);

export const updateStaffRegionThunk = createAsyncThunk(
  'superadmin/updateStaffRegion',
  async ({ userId, region }, { dispatch, rejectWithValue }) => {
    try {
      const updated = await setStaffRegion(userId, region);
      await dispatch(fetchStaffThunk());
      return updated;
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to change region.');
    }
  }
);

// ============================================================================
// 4. FINANCE THUNKS
// ============================================================================

export const fetchFinanceDataThunk = createAsyncThunk(
  'superadmin/fetchFinanceData',
  async ({ timeframe = 'weekly', session } = {}, { rejectWithValue }) => {
    try {
      const [metrics, earningsSeries, payouts] = await Promise.all([
        getFinanceMetrics(session),
        getEarningsSeries(timeframe, session),
        getPayouts({}, session),
      ]);
      return {
        metrics,
        earningsSeries: Array.isArray(earningsSeries) ? earningsSeries : [],
        payouts: Array.isArray(payouts) ? payouts : [],
      };
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to load financial telemetry.');
    }
  }
);

export const fetchEarningsSeriesThunk = createAsyncThunk(
  'superadmin/fetchEarningsSeries',
  async ({ timeframe = 'weekly', session } = {}, { rejectWithValue }) => {
    try {
      const data = await getEarningsSeries(timeframe, session);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to load earnings series.');
    }
  }
);

export const processPayoutThunk = createAsyncThunk(
  'superadmin/processPayout',
  async ({ payoutId, action, session }, { rejectWithValue }) => {
    try {
      return await processPayoutAction(payoutId, action, session);
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to process payout authorization.');
    }
  }
);

// ============================================================================
// 5. OPERATIONS & LEDGER THUNKS
// ============================================================================

export const fetchOperationsDataThunk = createAsyncThunk(
  'superadmin/fetchOperationsData',
  async ({ session } = {}, { rejectWithValue }) => {
    try {
      const [metrics, ledger, refunds, disputes] = await Promise.all([
        getOperationsMetrics(session),
        getLedgerTransactions({}, session),
        getRefundRequests(session),
        getDisputes(session),
      ]);
      return {
        metrics,
        ledger: Array.isArray(ledger) ? ledger : [],
        refunds: Array.isArray(refunds) ? refunds : [],
        disputes: Array.isArray(disputes) ? disputes : [],
      };
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to load operations & bookings data.');
    }
  }
);

export const processRefundThunk = createAsyncThunk(
  'superadmin/processRefund',
  async ({ refundId, action, notes, session }, { rejectWithValue }) => {
    try {
      const updated = await processRefundAction(refundId, action, notes, session);
      const ledger = action === 'approve' ? await getLedgerTransactions({}, session) : null;
      return { updated, ledger, mockMode: isSuperAdminMockMode() };
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to process refund authorization.');
    }
  }
);

export const resolveDisputeThunk = createAsyncThunk(
  'superadmin/resolveDispute',
  async ({ disputeId, summary, session }, { rejectWithValue }) => {
    try {
      return await resolveDisputeAction(disputeId, summary, session);
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to resolve dispute.');
    }
  }
);
