import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { SAMetricCard, SATable, SABadge } from '../../components/superadmin';
import {
  clearSuperAdminError,
  createStaffThunk,
  fetchStaffThunk,
  selectStaffList,
  selectStaffMetrics,
  selectSuperAdminError,
  selectSuperAdminLoading,
  updateStaffRegionThunk,
  updateStaffStatusThunk,
} from '@/store/superadmin/index.js';
import '../../components/superadmin/superadmin.css';

const ROLE_TABS = [
  { id: 'nontechadmin', label: 'Regional Admins', role: 'nontechadmin' },
  { id: 'techadmin', label: 'Tech Admins', role: 'techadmin' },
];

/**
 * SuperAdmin Admin Management Console.
 * Manages Regional (NonTechAdmin) and Tech Admin accounts — Super Admin accounts are never
 * listed, created, or edited here (see backend/src/auth/auth.service.ts for why).
 */
export default function SuperAdminAdminsPage() {
  const dispatch = useDispatch();
  const staffList = useSelector(selectStaffList);
  const metrics = useSelector(selectStaffMetrics);
  const isLoading = useSelector(selectSuperAdminLoading);
  const errorMessage = useSelector(selectSuperAdminError);

  const [activeTab, setActiveTab] = useState('nontechadmin');
  const [successMessage, setSuccessMessage] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [confirmStatusUser, setConfirmStatusUser] = useState(null);
  const [regionTarget, setRegionTarget] = useState(null);
  const [regionInput, setRegionInput] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);

  const [createForm, setCreateForm] = useState({
    username: '', name: '', email: '', phone: '', password: '', region: '',
  });

  const loadStaff = useCallback(() => {
    dispatch(fetchStaffThunk());
  }, [dispatch]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const currentTabLabel = ROLE_TABS.find((t) => t.id === activeTab)?.label || 'Admins';

  const currentTabStaff = useMemo(
    () => staffList.filter((u) => (u.role || '').toLowerCase() === activeTab),
    [staffList, activeTab],
  );

  const displayedStaff = useMemo(() => {
    return currentTabStaff.filter((u) => {
      if (statusFilter !== 'all' && u.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return [u.name, u.email, u.phone, u.username || u.userId, u.region]
        .some((field) => String(field || '').toLowerCase().includes(q));
    });
  }, [currentTabStaff, statusFilter, searchQuery]);

  // ── Create ──
  const handleOpenCreate = () => {
    setCreateForm({ username: '', name: '', email: '', phone: '', password: '', region: '' });
    setModalError(null);
    setIsCreateModalOpen(true);
  };

  const handleSaveCreate = async (e) => {
    e.preventDefault();
    setModalError(null);
    const { username, name, email, phone, password, region } = createForm;
    if (!username.trim() || !name.trim() || !email.trim() || !password || !phone.trim()) {
      setModalError('Username, Full Name, Email, Phone, and Password are required.');
      return;
    }
    if (password.length < 6) {
      setModalError('Password must be at least 6 characters long.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setModalError('Please enter a valid email address.');
      return;
    }
    if (activeTab === 'nontechadmin' && !region.trim()) {
      setModalError('A regional admin needs a region to be assigned (e.g. Kerala).');
      return;
    }

    setModalSubmitting(true);
    try {
      await dispatch(
        createStaffThunk({
          username: username.trim(),
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
          role: activeTab,
          region: activeTab === 'nontechadmin' ? region.trim() : undefined,
        })
      ).unwrap();
      setSuccessMessage(`New ${currentTabLabel.slice(0, -1)} "${name}" created successfully.`);
      setIsCreateModalOpen(false);
    } catch (err) {
      setModalError(typeof err === 'string' ? err : err?.message || 'Failed to create admin account.');
    } finally {
      setModalSubmitting(false);
    }
  };

  // ── Status ──
  const handlePromptStatusChange = (userItem) => {
    setConfirmStatusUser({ user: userItem, nextStatus: userItem.status === 'active' ? 'inactive' : 'active' });
    setModalError(null);
  };

  const handleConfirmStatusChange = async () => {
    if (!confirmStatusUser) return;
    const { user: targetUser, nextStatus } = confirmStatusUser;
    setModalSubmitting(true);
    try {
      await dispatch(
        updateStaffStatusThunk({
          userId: targetUser.userId || targetUser.username,
          nextStatus,
        })
      ).unwrap();
      setSuccessMessage(`Account "${targetUser.name}" has been ${nextStatus === 'active' ? 'reactivated' : 'restricted'}.`);
      setConfirmStatusUser(null);
    } catch (err) {
      setModalError(typeof err === 'string' ? err : err?.message || 'Failed to update account status.');
    } finally {
      setModalSubmitting(false);
    }
  };

  // ── Region reassignment (regional admins only) ──
  const handleOpenRegion = (userItem) => {
    setRegionTarget(userItem);
    setRegionInput(userItem.region || '');
    setModalError(null);
  };

  const handleSaveRegion = async (e) => {
    e.preventDefault();
    if (!regionTarget) return;
    if (!regionInput.trim()) {
      setModalError('A region is required.');
      return;
    }
    setModalSubmitting(true);
    try {
      await dispatch(
        updateStaffRegionThunk({
          userId: regionTarget.userId || regionTarget.username,
          region: regionInput.trim(),
        })
      ).unwrap();
      setSuccessMessage(`${regionTarget.name}'s region was changed to "${regionInput.trim()}".`);
      setRegionTarget(null);
    } catch (err) {
      setModalError(typeof err === 'string' ? err : err?.message || 'Failed to change region.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const tableColumns = [
    {
      key: 'name',
      label: 'Admin',
      render: (val, row) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0f172a' }}>{val}</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>{row.email}</div>
        </div>
      ),
    },
    {
      key: 'userId',
      label: 'ID / Username',
      width: '130px',
      render: (val, row) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#334155' }}>#{val || row.username}</span>
      ),
    },
    { key: 'phone', label: 'Phone', render: (val) => val || '—' },
    ...(activeTab === 'nontechadmin'
      ? [{ key: 'region', label: 'Region', render: (val) => val || <span style={{ color: '#94a3b8' }}>Unassigned</span> }]
      : []),
    {
      key: 'status',
      label: 'Status',
      align: 'center',
      render: (val) => <SABadge status={val === 'active' ? 'Active' : 'Restricted'} />,
    },
  ];

  return (
    <div className="sa-users-page">
      <div className="sa-users-header">
        <div className="sa-users-title-group">
          <h1 className="sa-users-title">Admin Management</h1>
          <p className="sa-users-subtitle">
            Create and manage Regional and Tech Admin accounts, and assign the region each Regional Admin
            oversees. Super Admin accounts aren't managed here.
          </p>
        </div>
      </div>

      <div className="sa-users-metrics-grid">
        <SAMetricCard
          title="Total Staff"
          value={metrics.total}
          subtitle="Regional + Tech Admin accounts"
          variant="primary"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />
        <SAMetricCard
          title="Regional Admins"
          value={metrics.regional}
          subtitle={`Covering ${metrics.regionsCovered} region(s)`}
          variant="success"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          }
        />
        <SAMetricCard
          title="Tech Admins"
          value={metrics.tech}
          subtitle="Support desk operators"
          variant="purple"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          }
        />
        <SAMetricCard
          title="Restricted"
          value={metrics.restricted}
          subtitle="Suspended admin accounts"
          variant="warning"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
          }
        />
      </div>

      {successMessage && (
        <div className="sa-users-alert sa-users-alert-success" role="status">
          <span>✓ {successMessage}</span>
          <button type="button" className="sa-users-alert-close" onClick={() => setSuccessMessage(null)}>✕</button>
        </div>
      )}
      {errorMessage && (
        <div className="sa-users-alert sa-users-alert-error" role="alert">
          <span>⚠️ {errorMessage}</span>
          <button type="button" className="sa-users-alert-close" onClick={() => dispatch(clearSuperAdminError())}>✕</button>
        </div>
      )}

      <div className="sa-users-tabs-container">
        {ROLE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`sa-users-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => { setActiveTab(tab.id); setSearchQuery(''); setStatusFilter('all'); }}
          >
            <span>{tab.label}</span>
            <span className="sa-users-tab-count">
              {staffList.filter((u) => (u.role || '').toLowerCase() === tab.id).length}
            </span>
          </button>
        ))}
      </div>

      <div className="sa-users-toolbar">
        <div className="sa-users-toolbar-left">
          <div className="sa-users-search-box">
            <span className="sa-users-search-icon" aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              className="sa-users-search-input"
              placeholder={`Search ${currentTabLabel.toLowerCase()} by name, email, phone, region...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label={`Search ${currentTabLabel}`}
            />
            {searchQuery && (
              <button type="button" className="sa-users-search-clear" onClick={() => setSearchQuery('')} aria-label="Clear search">✕</button>
            )}
          </div>

          <select
            className="sa-users-status-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Restricted (Inactive)</option>
          </select>

          <span className="sa-users-table-meta">
            Showing <strong>{displayedStaff.length}</strong> of <strong>{currentTabStaff.length}</strong> {currentTabLabel.toLowerCase()}
          </span>
        </div>

        <div className="sa-users-toolbar-right">
          <button type="button" className="sa-btn-primary" onClick={handleOpenCreate}>
            <span>+</span> Add {currentTabLabel.slice(0, -1)}
          </button>
        </div>
      </div>

      <SATable
        columns={tableColumns}
        data={displayedStaff}
        keyField="userId"
        isLoading={isLoading}
        emptyTitle={`No ${currentTabLabel} Found`}
        emptyMessage={
          searchQuery || statusFilter !== 'all'
            ? `No ${currentTabLabel.toLowerCase()} match your current filters. Try resetting search query.`
            : `There are currently no ${currentTabLabel.toLowerCase()} accounts.`
        }
        actions={(row) => (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
            {activeTab === 'nontechadmin' && (
              <button type="button" className="sa-table-btn-action" onClick={() => handleOpenRegion(row)}>
                Change Region
              </button>
            )}
            {row.status === 'active' ? (
              <button
                type="button"
                className="sa-table-btn-action"
                style={{ color: '#dc2626', borderColor: '#fecaca' }}
                onClick={() => handlePromptStatusChange(row)}
                title="Restrict account access"
              >
                Restrict
              </button>
            ) : (
              <button
                type="button"
                className="sa-table-btn-action"
                style={{ color: '#059669', borderColor: '#a7f3d0' }}
                onClick={() => handlePromptStatusChange(row)}
                title="Reactivate account access"
              >
                Reactivate
              </button>
            )}
          </div>
        )}
      />

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
        <div className="sa-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="sa-admin-create-title">
          <div className="sa-modal-card">
            <div className="sa-modal-header">
              <h3 id="sa-admin-create-title" className="sa-modal-title">Add New {currentTabLabel.slice(0, -1)}</h3>
              <button type="button" className="sa-modal-close-btn" onClick={() => setIsCreateModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveCreate}>
              <div className="sa-modal-body">
                {modalError && <div className="sa-form-error" role="alert">⚠️ {modalError}</div>}

                <div className="sa-form-group">
                  <label className="sa-form-label" htmlFor="admin-create-role"><span>Assigned Role</span></label>
                  <input id="admin-create-role" type="text" className="sa-form-input" value={currentTabLabel} disabled />
                </div>
                <div className="sa-form-group">
                  <label className="sa-form-label" htmlFor="admin-create-username"><span>Username *</span></label>
                  <input
                    id="admin-create-username" type="text" className="sa-form-input"
                    placeholder="e.g. nta_kochi"
                    value={createForm.username}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, username: e.target.value }))}
                    disabled={modalSubmitting} required
                  />
                </div>
                <div className="sa-form-group">
                  <label className="sa-form-label" htmlFor="admin-create-name"><span>Full Name *</span></label>
                  <input
                    id="admin-create-name" type="text" className="sa-form-input"
                    placeholder="e.g. Vikram Nair"
                    value={createForm.name}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                    disabled={modalSubmitting} required
                  />
                </div>
                <div className="sa-form-group">
                  <label className="sa-form-label" htmlFor="admin-create-email"><span>Email Address *</span></label>
                  <input
                    id="admin-create-email" type="email" className="sa-form-input"
                    placeholder="e.g. vikram.nair@xploreo.com"
                    value={createForm.email}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                    disabled={modalSubmitting} required
                  />
                </div>
                <div className="sa-form-group">
                  <label className="sa-form-label" htmlFor="admin-create-phone"><span>Phone Number *</span></label>
                  <input
                    id="admin-create-phone" type="tel" className="sa-form-input"
                    placeholder="e.g. 9123456780"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, phone: e.target.value }))}
                    disabled={modalSubmitting} required
                  />
                </div>
                <div className="sa-form-group">
                  <label className="sa-form-label" htmlFor="admin-create-password">
                    <span>Temporary Password *</span>
                    <span className="sa-form-hint">Min 6 characters</span>
                  </label>
                  <input
                    id="admin-create-password" type="password" className="sa-form-input"
                    placeholder="••••••••"
                    value={createForm.password}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
                    disabled={modalSubmitting} required
                  />
                </div>
                {activeTab === 'nontechadmin' && (
                  <div className="sa-form-group">
                    <label className="sa-form-label" htmlFor="admin-create-region">
                      <span>Region *</span>
                      <span className="sa-form-hint">The city/state this admin oversees</span>
                    </label>
                    <input
                      id="admin-create-region" type="text" className="sa-form-input"
                      placeholder="e.g. Kerala"
                      value={createForm.region}
                      onChange={(e) => setCreateForm((prev) => ({ ...prev, region: e.target.value }))}
                      disabled={modalSubmitting} required
                    />
                  </div>
                )}
              </div>
              <div className="sa-modal-footer">
                <button type="button" className="sa-btn-secondary" onClick={() => setIsCreateModalOpen(false)} disabled={modalSubmitting}>Cancel</button>
                <button type="submit" className="sa-btn-primary" disabled={modalSubmitting}>
                  {modalSubmitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REGION MODAL */}
      {regionTarget && (
        <div className="sa-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="sa-admin-region-title">
          <div className="sa-modal-card" style={{ maxWidth: 440 }}>
            <div className="sa-modal-header">
              <h3 id="sa-admin-region-title" className="sa-modal-title">Change Region — {regionTarget.name}</h3>
              <button type="button" className="sa-modal-close-btn" onClick={() => setRegionTarget(null)}>✕</button>
            </div>
            <form onSubmit={handleSaveRegion}>
              <div className="sa-modal-body">
                {modalError && <div className="sa-form-error" role="alert">⚠️ {modalError}</div>}
                <div className="sa-form-group">
                  <label className="sa-form-label" htmlFor="admin-region-input"><span>Region *</span></label>
                  <input
                    id="admin-region-input" type="text" className="sa-form-input"
                    placeholder="e.g. Kerala"
                    value={regionInput}
                    onChange={(e) => setRegionInput(e.target.value)}
                    disabled={modalSubmitting} required
                  />
                  <span className="sa-form-hint">
                    This admin will see and manage plans, trips, and bookings for this region only.
                  </span>
                </div>
              </div>
              <div className="sa-modal-footer">
                <button type="button" className="sa-btn-secondary" onClick={() => setRegionTarget(null)} disabled={modalSubmitting}>Cancel</button>
                <button type="submit" className="sa-btn-primary" disabled={modalSubmitting}>
                  {modalSubmitting ? 'Saving...' : 'Save Region'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STATUS CONFIRM */}
      {confirmStatusUser && (
        <div className="sa-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="sa-admin-confirm-title">
          <div className="sa-modal-card" style={{ maxWidth: 440 }}>
            <div className="sa-modal-header">
              <h3 id="sa-admin-confirm-title" className="sa-modal-title">
                {confirmStatusUser.nextStatus === 'inactive' ? 'Restrict Admin Access' : 'Reactivate Admin Access'}
              </h3>
              <button type="button" className="sa-modal-close-btn" onClick={() => setConfirmStatusUser(null)}>✕</button>
            </div>
            <div className="sa-modal-body">
              {modalError && <div className="sa-form-error" role="alert">⚠️ {modalError}</div>}
              <p style={{ margin: 0, fontSize: 14, color: '#334155', lineHeight: 1.5 }}>
                {confirmStatusUser.nextStatus === 'inactive' ? (
                  <>Are you sure you want to <strong>restrict</strong> access for <strong>{confirmStatusUser.user.name}</strong> (#{confirmStatusUser.user.userId || confirmStatusUser.user.username})? They will be immediately barred from logging in until reactivated.</>
                ) : (
                  <>Are you sure you want to <strong>reactivate</strong> access for <strong>{confirmStatusUser.user.name}</strong> (#{confirmStatusUser.user.userId || confirmStatusUser.user.username})?</>
                )}
              </p>
            </div>
            <div className="sa-modal-footer">
              <button type="button" className="sa-btn-secondary" onClick={() => setConfirmStatusUser(null)} disabled={modalSubmitting}>Cancel</button>
              <button
                type="button"
                className={confirmStatusUser.nextStatus === 'inactive' ? 'sa-btn-danger' : 'sa-btn-primary'}
                onClick={handleConfirmStatusChange}
                disabled={modalSubmitting}
              >
                {modalSubmitting ? 'Updating...' : confirmStatusUser.nextStatus === 'inactive' ? 'Yes, Restrict Account' : 'Yes, Reactivate Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
