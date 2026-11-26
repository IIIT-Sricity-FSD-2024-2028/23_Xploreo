import { createSlice } from '@reduxjs/toolkit';
import {
  createStaffThunk,
  createUserThunk,
  deleteUserThunk,
  fetchBookingVelocityThunk,
  fetchDashboardDataThunk,
  fetchEarningsSeriesThunk,
  fetchFinanceDataThunk,
  fetchOperationsDataThunk,
  fetchStaffThunk,
  fetchUsersThunk,
  processPayoutThunk,
  processRefundThunk,
  resolveDisputeThunk,
  updateStaffRegionThunk,
  updateStaffStatusThunk,
  updateUserStatusThunk,
  updateUserThunk,
} from './superadminThunks.js';

const initialState = {
  // Dashboard
  dashboardMetrics: null,
  velocityData: [],
  recentBookings: [],
  velocityLoading: false,

  // Users & Partners
  users: [],

  // Admin Management (Staff)
  staff: [],

  // Finance
  financeMetrics: null,
  earningsSeries: [],
  payouts: [],
  earningsLoading: false,

  // Operations & Ledger
  operationsMetrics: null,
  ledger: [],
  refunds: [],
  disputes: [],

  // Shared UI Flags
  loading: false,
  actionBusy: false,
  error: null,
  successMessage: null,
};

export const superadminSlice = createSlice({
  name: 'superadmin',
  initialState,
  reducers: {
    clearSuperAdminState: () => initialState,
    clearSuperAdminError: (state) => {
      state.error = null;
    },
    clearSuperAdminSuccess: (state) => {
      state.successMessage = null;
    },
  },
  extraReducers: (builder) => {
    // Dashboard
    builder
      .addCase(fetchDashboardDataThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardDataThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.dashboardMetrics = action.payload.metrics;
        state.velocityData = action.payload.velocity;
        state.recentBookings = action.payload.recentBookings;
      })
      .addCase(fetchDashboardDataThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchBookingVelocityThunk.pending, (state) => {
        state.velocityLoading = true;
      })
      .addCase(fetchBookingVelocityThunk.fulfilled, (state, action) => {
        state.velocityLoading = false;
        state.velocityData = action.payload;
      })
      .addCase(fetchBookingVelocityThunk.rejected, (state) => {
        state.velocityLoading = false;
      });

    // Users & Partners
    builder
      .addCase(fetchUsersThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsersThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload;
      })
      .addCase(fetchUsersThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createUserThunk.pending, (state) => {
        state.actionBusy = true;
      })
      .addCase(createUserThunk.fulfilled, (state) => {
        state.actionBusy = false;
      })
      .addCase(createUserThunk.rejected, (state) => {
        state.actionBusy = false;
      })
      .addCase(updateUserThunk.pending, (state) => {
        state.actionBusy = true;
      })
      .addCase(updateUserThunk.fulfilled, (state) => {
        state.actionBusy = false;
      })
      .addCase(updateUserThunk.rejected, (state) => {
        state.actionBusy = false;
      })
      .addCase(updateUserStatusThunk.pending, (state) => {
        state.actionBusy = true;
      })
      .addCase(updateUserStatusThunk.fulfilled, (state) => {
        state.actionBusy = false;
      })
      .addCase(updateUserStatusThunk.rejected, (state) => {
        state.actionBusy = false;
      })
      .addCase(deleteUserThunk.pending, (state) => {
        state.actionBusy = true;
      })
      .addCase(deleteUserThunk.fulfilled, (state) => {
        state.actionBusy = false;
      })
      .addCase(deleteUserThunk.rejected, (state) => {
        state.actionBusy = false;
      });

    // Staff / Admin Management
    builder
      .addCase(fetchStaffThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStaffThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.staff = action.payload;
      })
      .addCase(fetchStaffThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createStaffThunk.pending, (state) => {
        state.actionBusy = true;
      })
      .addCase(createStaffThunk.fulfilled, (state) => {
        state.actionBusy = false;
      })
      .addCase(createStaffThunk.rejected, (state) => {
        state.actionBusy = false;
      })
      .addCase(updateStaffStatusThunk.pending, (state) => {
        state.actionBusy = true;
      })
      .addCase(updateStaffStatusThunk.fulfilled, (state) => {
        state.actionBusy = false;
      })
      .addCase(updateStaffStatusThunk.rejected, (state) => {
        state.actionBusy = false;
      })
      .addCase(updateStaffRegionThunk.pending, (state) => {
        state.actionBusy = true;
      })
      .addCase(updateStaffRegionThunk.fulfilled, (state) => {
        state.actionBusy = false;
      })
      .addCase(updateStaffRegionThunk.rejected, (state) => {
        state.actionBusy = false;
      });

    // Finance
    builder
      .addCase(fetchFinanceDataThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFinanceDataThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.financeMetrics = action.payload.metrics;
        state.earningsSeries = action.payload.earningsSeries;
        state.payouts = action.payload.payouts;
      })
      .addCase(fetchFinanceDataThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchEarningsSeriesThunk.pending, (state) => {
        state.earningsLoading = true;
      })
      .addCase(fetchEarningsSeriesThunk.fulfilled, (state, action) => {
        state.earningsLoading = false;
        state.earningsSeries = action.payload;
      })
      .addCase(fetchEarningsSeriesThunk.rejected, (state) => {
        state.earningsLoading = false;
      })
      .addCase(processPayoutThunk.pending, (state) => {
        state.actionBusy = true;
      })
      .addCase(processPayoutThunk.fulfilled, (state, action) => {
        state.actionBusy = false;
        const updated = action.payload;
        state.payouts = state.payouts.map((p) => (p.payoutId === updated.payoutId ? updated : p));
      })
      .addCase(processPayoutThunk.rejected, (state) => {
        state.actionBusy = false;
      });

    // Operations & Ledger
    builder
      .addCase(fetchOperationsDataThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOperationsDataThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.operationsMetrics = action.payload.metrics;
        state.ledger = action.payload.ledger;
        state.refunds = action.payload.refunds;
        state.disputes = action.payload.disputes;
      })
      .addCase(fetchOperationsDataThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(processRefundThunk.pending, (state) => {
        state.actionBusy = true;
      })
      .addCase(processRefundThunk.fulfilled, (state, action) => {
        state.actionBusy = false;
        const { updated, ledger } = action.payload;
        state.refunds = state.refunds.map((r) => (r.refundId === updated.refundId ? updated : r));
        if (Array.isArray(ledger)) {
          state.ledger = ledger;
        }
      })
      .addCase(processRefundThunk.rejected, (state) => {
        state.actionBusy = false;
      })
      .addCase(resolveDisputeThunk.pending, (state) => {
        state.actionBusy = true;
      })
      .addCase(resolveDisputeThunk.fulfilled, (state, action) => {
        state.actionBusy = false;
        const updated = action.payload;
        state.disputes = state.disputes.map((d) =>
          d.disputeId === updated.disputeId ? updated : d
        );
      })
      .addCase(resolveDisputeThunk.rejected, (state) => {
        state.actionBusy = false;
      });
  },
});

export const {
  clearSuperAdminState,
  clearSuperAdminError,
  clearSuperAdminSuccess,
} = superadminSlice.actions;

export default superadminSlice.reducer;
