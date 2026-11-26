import { createSelector } from '@reduxjs/toolkit';

export const selectSuperAdminState = (state) => state.superadmin;

// Dashboard
export const selectDashboardMetrics = (state) => state.superadmin.dashboardMetrics;
export const selectVelocityData = (state) => state.superadmin.velocityData;
export const selectRecentBookings = (state) => state.superadmin.recentBookings;
export const selectVelocityLoading = (state) => state.superadmin.velocityLoading;

// Users & Partners
export const selectUsersList = (state) => state.superadmin.users;

export const selectUsersMetrics = createSelector([selectUsersList], (usersList) => {
  const total = usersList.length;
  const guides = usersList.filter(
    (u) => (u.role || '').toLowerCase() === 'guide' && u.status === 'active'
  ).length;
  const properties = usersList.filter((u) => {
    const r = (u.role || '').toLowerCase();
    return r === 'hotel' || r === 'experience';
  }).length;
  const restricted = usersList.filter((u) => u.status === 'inactive').length;
  return { total, guides, properties, restricted };
});

// Staff / Admin Management
export const selectStaffList = (state) => state.superadmin.staff;

export const selectStaffMetrics = createSelector([selectStaffList], (staffList) => {
  const regional = staffList.filter((u) => u.role === 'nontechadmin').length;
  const tech = staffList.filter((u) => u.role === 'techadmin').length;
  const restricted = staffList.filter((u) => u.status === 'inactive').length;
  const regionsCovered = new Set(
    staffList.filter((u) => u.role === 'nontechadmin' && u.region).map((u) => u.region)
  ).size;
  return { total: staffList.length, regional, tech, restricted, regionsCovered };
});

// Finance
export const selectFinanceMetrics = (state) => state.superadmin.financeMetrics;
export const selectEarningsSeries = (state) => state.superadmin.earningsSeries;
export const selectPayoutsList = (state) => state.superadmin.payouts;
export const selectEarningsLoading = (state) => state.superadmin.earningsLoading;

// Operations
export const selectOperationsMetrics = (state) => state.superadmin.operationsMetrics;
export const selectLedgerList = (state) => state.superadmin.ledger;
export const selectRefundsList = (state) => state.superadmin.refunds;
export const selectDisputesList = (state) => state.superadmin.disputes;

// Shared UI
export const selectSuperAdminLoading = (state) => state.superadmin.loading;
export const selectSuperAdminActionBusy = (state) => state.superadmin.actionBusy;
export const selectSuperAdminError = (state) => state.superadmin.error;
export const selectSuperAdminSuccess = (state) => state.superadmin.successMessage;
