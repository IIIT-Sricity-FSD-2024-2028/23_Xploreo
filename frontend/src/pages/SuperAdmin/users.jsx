import { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  SAMetricCard,
  SATable,
  SABadge,
} from '../../components/superadmin';
import {
  clearSuperAdminError,
  createUserThunk,
  deleteUserThunk,
  fetchUsersThunk,
  selectSuperAdminError,
  selectSuperAdminLoading,
  selectUsersList,
  selectUsersMetrics,
  updateUserStatusThunk,
  updateUserThunk,
} from '@/store/superadmin/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import '../../components/superadmin/superadmin.css';

const PHONE_PATTERN = /^(?:\+?91[\s-]?|0)?[6-9]\d{9}$/;
const PAGE_SIZE = 10;

const ROLE_TABS = [
  { id: 'guide', label: 'Guides', role: 'guide' },
  { id: 'traveller', label: 'Travelers', role: 'traveller' },
  { id: 'hotel', label: 'Hotel Partners', role: 'hotel' },
  { id: 'experience', label: 'Experience Partners', role: 'experience' },
];

/**
 * SuperAdmin Users & Partners Console.
 * 
 * @param {Object} props
 * @param {Object} [props.user] - Optional user identity from router
 */
export default function SuperAdminUsersPage({ user = null }) {
  const dispatch = useDispatch();
  const { user: authUser } = useAuth();
  const session = useMemo(() => user || authUser, [user, authUser]);
  // Tech Admin shares this page (see techadmin.routes.jsx) but only to view and suspend/restore
  // an account — creating and editing stay Super Admin-only. The server enforces this too; these
  // just keep the UI honest about what Tech Admin can actually do.
  const isSuperAdmin = session?.role === 'superadmin';

  const usersList = useSelector(selectUsersList);
  const metrics = useSelector(selectUsersMetrics);
  const isLoading = useSelector(selectSuperAdminLoading);
  const errorMessage = useSelector(selectSuperAdminError);

  const [activeTab, setActiveTab] = useState('guide');
  const [successMessage, setSuccessMessage] = useState(null);

  // Search, Filter & Pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'
  const [currentPage, setCurrentPage] = useState(1);

  // Modals state
  const [viewingUser, setViewingUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [confirmStatusUser, setConfirmStatusUser] = useState(null); // { user, nextStatus }
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Form states for Create
  const [createForm, setCreateForm] = useState({
    username: '',
    name: '',
    email: '',
    phone: '',
    password: '',
    location: '',
  });

  // Form states for Edit
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    role: 'traveller',
  });

  useEffect(() => {
    dispatch(fetchUsersThunk({ roleFilter: 'all', session }));
  }, [dispatch, session]);

  // Tab counts (reflects active statusFilter so counts match visible filtered records)
  const tabCounts = useMemo(() => {
    const counts = { guide: 0, traveller: 0, hotel: 0, experience: 0 };
    usersList.forEach((u) => {
      // Respect status filter if active or inactive is selected
      if (statusFilter !== 'all' && u.status !== statusFilter) {
        return;
      }
      const r = (u.role || '').toLowerCase();
      if (r === 'traveller' || r === 'traveler') counts.traveller++;
      else if (r === 'guide') counts.guide++;
      else if (r === 'hotel') counts.hotel++;
      else if (r === 'experience') counts.experience++;
    });
    return counts;
  }, [usersList, statusFilter]);

  // Total role counts irrespective of status filter (for tab baseline reference)
  const totalRoleCounts = useMemo(() => {
    const counts = { guide: 0, traveller: 0, hotel: 0, experience: 0 };
    usersList.forEach((u) => {
      const r = (u.role || '').toLowerCase();
      if (r === 'traveller' || r === 'traveler') counts.traveller++;
      else if (r === 'guide') counts.guide++;
      else if (r === 'hotel') counts.hotel++;
      else if (r === 'experience') counts.experience++;
    });
    return counts;
  }, [usersList]);

  // Filtered rows for active tab
  const currentTabUsers = useMemo(() => {
    return usersList.filter((u) => {
      const r = (u.role || '').toLowerCase();
      if (activeTab === 'traveller') return r === 'traveller' || r === 'traveler';
      return r === activeTab;
    });
  }, [usersList, activeTab]);

  const displayedUsers = useMemo(() => {
    return currentTabUsers.filter((u) => {
      // Status filter
      if (statusFilter !== 'all' && u.status !== statusFilter) {
        return false;
      }

      // Search query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchName = String(u.name || '').toLowerCase().includes(q);
      const matchEmail = String(u.email || '').toLowerCase().includes(q);
      const matchPhone = String(u.phone || '').toLowerCase().includes(q);
      const matchUsername = String(u.username || u.userId || '').toLowerCase().includes(q);
      const matchLocation = String(u.location || u.region || u.city || '').toLowerCase().includes(q);

      return matchName || matchEmail || matchPhone || matchUsername || matchLocation;
    });
  }, [currentTabUsers, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(displayedUsers.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedUsers = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return displayedUsers.slice(start, start + PAGE_SIZE);
  }, [displayedUsers, safePage]);

  // Handlers for Edit
  const handleOpenEdit = (userItem) => {
    setEditingUser(userItem);
    setEditForm({
      name: userItem.name || '',
      email: userItem.email || '',
      phone: userItem.phone || '',
      location: userItem.location || '',
      role: (userItem.role || activeTab).toLowerCase(),
    });
    setModalError(null);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingUser || modalSubmitting) return;
    setModalError(null);

    const trimmedName = editForm.name.trim();
    const trimmedEmail = editForm.email.trim();
    const trimmedPhone = editForm.phone.trim();
    if (!trimmedName) {
      setModalError('Full name is required.');
      return;
    }
    if (!trimmedEmail || !/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setModalError('A valid email address is required.');
      return;
    }
    if (trimmedPhone && !PHONE_PATTERN.test(trimmedPhone.replace(/[\s()-]/g, ''))) {
      setModalError('Phone must be a valid 10-digit mobile number.');
      return;
    }

    setModalSubmitting(true);
    try {
      await dispatch(
        updateUserThunk({
          userId: editingUser.userId || editingUser.username,
          data: {
            name: trimmedName,
            email: trimmedEmail,
            phone: trimmedPhone ? trimmedPhone.replace(/[\s()-]/g, '') : '',
            location: editForm.location.trim(),
            ...(isSuperAdmin && editForm.role ? { role: editForm.role } : {}),
          },
          session,
        })
      ).unwrap();

      setSuccessMessage(`Account "${trimmedName}" updated successfully.`);
      setEditingUser(null);
    } catch (err) {
      setModalError(typeof err === 'string' ? err : err?.message || 'Failed to update profile.');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Handlers for Create
  const handleOpenCreate = () => {
    setCreateForm({
      username: '',
      name: '',
      email: '',
      phone: '',
      password: '',
      location: '',
    });
    setModalError(null);
    setIsCreateModalOpen(true);
  };

  const handleSaveCreate = async (e) => {
    e.preventDefault();
    if (modalSubmitting) return;
    setModalError(null);

    const { username, name, email, phone, password, location } = createForm;
    if (!username.trim() || !name.trim() || !email.trim() || !password) {
      setModalError('Username, Full Name, Email, and Password are required.');
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
    const normalizedPhone = (phone.trim() || '9000000000').replace(/[\s()-]/g, '');
    if (!PHONE_PATTERN.test(normalizedPhone)) {
      setModalError('Phone must be a valid 10-digit mobile number.');
      return;
    }

    setModalSubmitting(true);
    try {
      await dispatch(
        createUserThunk({
          payload: {
            username: username.trim(),
            name: name.trim(),
            email: email.trim(),
            phone: normalizedPhone,
            password,
            role: activeTab,
            location: location.trim() || 'India',
          },
          session,
        })
      ).unwrap();

      setSuccessMessage(`New ${ROLE_TABS.find((t) => t.id === activeTab)?.label.slice(0, -1)} "${name}" registered successfully.`);
      setIsCreateModalOpen(false);
    } catch (err) {
      setModalError(typeof err === 'string' ? err : err?.message || 'Failed to create user account.');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Handlers for Restrict / Reactivate
  const handlePromptStatusChange = (userItem) => {
    const nextStatus = userItem.status === 'active' ? 'inactive' : 'active';
    setConfirmStatusUser({ user: userItem, nextStatus });
    setModalError(null);
  };

  const handleConfirmStatusChange = async () => {
    if (!confirmStatusUser || modalSubmitting) return;
    const { user: targetUser, nextStatus } = confirmStatusUser;
    setModalSubmitting(true);
    try {
      await dispatch(
        updateUserStatusThunk({
          userId: targetUser.userId || targetUser.username,
          nextStatus,
          session,
        })
      ).unwrap();

      const actionWord = nextStatus === 'active' ? 'reactivated' : 'restricted';
      setSuccessMessage(`Account "${targetUser.name}" has been ${actionWord}.`);
      setConfirmStatusUser(null);
    } catch (err) {
      setModalError(typeof err === 'string' ? err : err?.message || 'Failed to update account status.');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!confirmDeleteUser || modalSubmitting) return;
    setModalSubmitting(true);
    setModalError(null);
    try {
      await dispatch(
        deleteUserThunk({
          userId: confirmDeleteUser.userId || confirmDeleteUser.username,
          session,
        })
      ).unwrap();
      setSuccessMessage(`Account "${confirmDeleteUser.name}" has been deleted.`);
      setConfirmDeleteUser(null);
    } catch (err) {
      setModalError(typeof err === 'string' ? err : err?.message || 'Failed to delete account.');
    } finally {
      setModalSubmitting(false);
    }
  };

  // SATable column definitions
  const tableColumns = [
    {
      key: 'name',
      label: 'User / Partner',
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
        <div>
          <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#334155' }}>
            #{val || row.username}
          </span>
          {row.joinedAt && (
            <div style={{ fontSize: 10, color: '#94a3b8' }}>Since {row.joinedAt}</div>
          )}
        </div>
      ),
    },
    {
      key: 'phone',
      label: 'Phone',
      render: (val) => val || '—',
    },
    {
      key: 'location',
      label: 'Location',
      render: (val, row) => val || row?.location || row?.region || row?.city || 'Not specified',
    },
    {
      key: 'totalTripsOrBookings',
      label: 'Activity',
      align: 'center',
      render: (val, row) => {
        const count = typeof val === 'number' ? val : (typeof row.totalTripsOrBookings === 'number' ? row.totalTripsOrBookings : null);
        if (count === null || count === undefined) {
          return <span style={{ color: '#94a3b8' }}>—</span>;
        }
        const role = (row.role || '').toLowerCase();
        let unit = 'bookings';
        if (role === 'guide') unit = 'tours led';
        else if (role === 'traveller' || role === 'traveler') unit = 'trips';
        else if (role === 'hotel' || role === 'experience') unit = 'bookings';

        return (
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontWeight: 700, color: '#0f172a' }}>{count}</span>
            <span style={{ fontSize: 11, color: '#64748b', marginLeft: 4 }}>{unit}</span>
          </div>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      align: 'center',
      render: (val) => (
        <SABadge status={val === 'active' ? 'Active' : 'Restricted'} />
      ),
    },
  ];

  const currentTabLabel = ROLE_TABS.find((t) => t.id === activeTab)?.label || 'Users';

  return (
    <div className="sa-users-page">
      {/* Page Title & Subtitle */}
      <div className="sa-users-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div className="sa-users-title-group">
            <h1 className="sa-users-title">Users & Partner Management</h1>
            <p className="sa-users-subtitle">
              Manage accounts, verify profiles, and control platform access permissions across all user roles.
            </p>
          </div>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="sa-users-metrics-grid">
        <SAMetricCard
          title="Total Accounts"
          value={metrics.total}
          subtitle="Platform registered users"
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
          title="Active Guides"
          value={metrics.guides}
          subtitle="Regional verified guides"
          variant="success"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
            </svg>
          }
        />

        <SAMetricCard
          title="Partner Properties"
          value={metrics.properties}
          subtitle="Hotels & Experience organizers"
          variant="purple"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="4" y="2" width="16" height="20" rx="2" />
              <line x1="9" y1="22" x2="9" y2="22.01" />
              <line x1="15" y1="22" x2="15" y2="22.01" />
              <line x1="9" y1="6" x2="9" y2="6.01" />
              <line x1="15" y1="6" x2="15" y2="6.01" />
            </svg>
          }
        />

        <SAMetricCard
          title="Restricted Accounts"
          value={metrics.restricted}
          subtitle="Suspended or inactive users"
          variant="warning"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
          }
        />
      </div>

      {/* Global Alerts */}
      {successMessage && (
        <div className="sa-users-alert sa-users-alert-success" role="status">
          <span>✓ {successMessage}</span>
          <button
            type="button"
            className="sa-users-alert-close"
            onClick={() => setSuccessMessage(null)}
          >
            ✕
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="sa-users-alert sa-users-alert-error" role="alert">
          <span>⚠️ {errorMessage}</span>
          <button
            type="button"
            className="sa-users-alert-close"
            onClick={() => dispatch(clearSuperAdminError())}
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="sa-users-tabs-container">
        {ROLE_TABS.map((tab) => {
          const filteredCount = tabCounts[tab.id] || 0;
          const totalCount = totalRoleCounts[tab.id] || 0;
          const isFiltered = statusFilter !== 'all' && filteredCount !== totalCount;

          return (
            <button
              key={tab.id}
              type="button"
              className={`sa-users-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(tab.id);
                setSearchQuery('');
                setStatusFilter('all');
                setCurrentPage(1);
              }}
            >
              <span>{tab.label}</span>
              <span className="sa-users-tab-count" title={isFiltered ? `${filteredCount} of ${totalCount} accounts shown` : `${totalCount} total accounts`}>
                {isFiltered ? `${filteredCount} / ${totalCount}` : filteredCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* Toolbar: Search, Status Filter, Active Records Counter, Add User Action */}
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
              placeholder={`Search ${currentTabLabel.toLowerCase()} by name, email, phone...`}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              aria-label={`Search ${currentTabLabel}`}
            />
            {searchQuery && (
              <button
                type="button"
                className="sa-users-search-clear"
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <select
            className="sa-users-status-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Filter by status"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Restricted (Inactive)</option>
          </select>

          <span className="sa-users-table-meta">
            Showing <strong>{displayedUsers.length}</strong> of <strong>{currentTabUsers.length}</strong> {currentTabLabel.toLowerCase()}
          </span>
        </div>

        {isSuperAdmin && (
          <div className="sa-users-toolbar-right">
            <button
              type="button"
              className="sa-btn-primary"
              onClick={handleOpenCreate}
            >
              <span>+</span> Add {currentTabLabel.slice(0, -1)}
            </button>
          </div>
        )}
      </div>

      {/* Data Table */}
      <SATable
        columns={tableColumns}
        data={paginatedUsers}
        keyField="userId"
        isLoading={isLoading}
        emptyTitle={`No ${currentTabLabel} Found`}
        emptyMessage={
          searchQuery || statusFilter !== 'all'
            ? `No ${currentTabLabel.toLowerCase()} match your current filters. Try resetting search query.`
            : `There are currently no registered accounts under the ${currentTabLabel} category.`
        }
        actions={(row) => (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
            <button
              type="button"
              className="sa-table-btn-action"
              onClick={() => setViewingUser(row)}
              title="View user details"
            >
              View
            </button>

            {isSuperAdmin && (
              <button
                type="button"
                className="sa-table-btn-action"
                onClick={() => handleOpenEdit(row)}
              >
                Edit
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

            {isSuperAdmin && (row.role || '').toLowerCase() !== 'superadmin' && (
              <button
                type="button"
                className="sa-table-btn-action"
                style={{ color: '#b91c1c', borderColor: '#fecaca' }}
                onClick={() => {
                  setModalError(null);
                  setConfirmDeleteUser(row);
                }}
                title="Delete user account"
              >
                Delete
              </button>
            )}
          </div>
        )}
      />

      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, flexWrap: 'wrap', gap: 10 }}>
          <span className="sa-users-table-meta">
            Page <strong>{safePage}</strong> of <strong>{totalPages}</strong> ({displayedUsers.length} total)
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="sa-btn-secondary"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              className="sa-btn-secondary"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {viewingUser && (
        <div className="sa-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="sa-view-title">
          <div className="sa-modal-card" style={{ maxWidth: 480 }}>
            <div className="sa-modal-header">
              <h3 id="sa-view-title" className="sa-modal-title">
                Account Details — {viewingUser.name}
              </h3>
              <button
                type="button"
                className="sa-modal-close-btn"
                onClick={() => setViewingUser(null)}
              >
                ✕
              </button>
            </div>
            <div className="sa-modal-body" style={{ display: 'grid', gap: 10, fontSize: 14 }}>
              <div><strong>User ID:</strong> #{viewingUser.userId || viewingUser.username}</div>
              <div><strong>Username:</strong> {viewingUser.username}</div>
              <div><strong>Full Name:</strong> {viewingUser.name}</div>
              <div><strong>Email:</strong> {viewingUser.email}</div>
              <div><strong>Phone:</strong> {viewingUser.phone || '—'}</div>
              <div><strong>Role:</strong> {viewingUser.role}</div>
              <div><strong>Location / Region:</strong> {viewingUser.location || viewingUser.region || '—'}</div>
              <div><strong>Status:</strong> {viewingUser.status === 'active' ? 'Active' : 'Restricted (Inactive)'}</div>
              <div><strong>Joined:</strong> {viewingUser.joinedAt || '—'}</div>
            </div>
            <div className="sa-modal-footer">
              <button type="button" className="sa-btn-secondary" onClick={() => setViewingUser(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingUser && (
        <div className="sa-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="sa-edit-title">
          <div className="sa-modal-card">
            <div className="sa-modal-header">
              <h3 id="sa-edit-title" className="sa-modal-title">
                Edit {editingUser.name}
              </h3>
              <button
                type="button"
                className="sa-modal-close-btn"
                onClick={() => setEditingUser(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="sa-modal-body">
                {modalError && (
                  <div className="sa-form-error" role="alert">
                    ⚠️ {modalError}
                  </div>
                )}

                <div className="sa-form-group">
                  <label className="sa-form-label" htmlFor="edit-username">
                    <span>Username / ID</span>
                  </label>
                  <input
                    id="edit-username"
                    type="text"
                    className="sa-form-input"
                    value={editingUser.username || editingUser.userId}
                    disabled
                  />
                  <span className="sa-form-hint">Username cannot be changed.</span>
                </div>

                <div className="sa-form-group">
                  <label className="sa-form-label" htmlFor="edit-name">
                    <span>Full Name *</span>
                  </label>
                  <input
                    id="edit-name"
                    type="text"
                    className="sa-form-input"
                    value={editForm.name}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                    disabled={modalSubmitting}
                    required
                  />
                </div>

                <div className="sa-form-group">
                  <label className="sa-form-label" htmlFor="edit-email">
                    <span>Email Address *</span>
                  </label>
                  <input
                    id="edit-email"
                    type="email"
                    className="sa-form-input"
                    value={editForm.email}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                    disabled={modalSubmitting}
                    required
                  />
                </div>

                <div className="sa-form-group">
                  <label className="sa-form-label" htmlFor="edit-phone">
                    <span>Phone Number</span>
                  </label>
                  <input
                    id="edit-phone"
                    type="tel"
                    className="sa-form-input"
                    value={editForm.phone}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                    disabled={modalSubmitting}
                  />
                </div>

                <div className="sa-form-group">
                  <label className="sa-form-label" htmlFor="edit-location">
                    <span>Location / Base City</span>
                  </label>
                  <input
                    id="edit-location"
                    type="text"
                    className="sa-form-input"
                    value={editForm.location}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, location: e.target.value }))}
                    disabled={modalSubmitting}
                    placeholder="e.g. Jaipur, Delhi, Mumbai"
                  />
                </div>

                {isSuperAdmin && (
                  <div className="sa-form-group">
                    <label className="sa-form-label" htmlFor="edit-role">
                      <span>Role</span>
                    </label>
                    <select
                      id="edit-role"
                      className="sa-form-input"
                      value={editForm.role}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, role: e.target.value }))}
                      disabled={modalSubmitting}
                    >
                      <option value="traveller">Traveller</option>
                      <option value="guide">Guide</option>
                      <option value="hotel">Hotel Partner</option>
                      <option value="experience">Experience Partner</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="sa-modal-footer">
                <button
                  type="button"
                  className="sa-btn-secondary"
                  onClick={() => setEditingUser(null)}
                  disabled={modalSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="sa-btn-primary"
                  disabled={modalSubmitting}
                >
                  {modalSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE ACCOUNT MODAL */}
      {isCreateModalOpen && (
        <div className="sa-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="sa-create-title">
          <div className="sa-modal-card">
            <div className="sa-modal-header">
              <h3 id="sa-create-title" className="sa-modal-title">
                Add New {currentTabLabel.slice(0, -1)}
              </h3>
              <button
                type="button"
                className="sa-modal-close-btn"
                onClick={() => setIsCreateModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCreate}>
              <div className="sa-modal-body">
                {modalError && (
                  <div className="sa-form-error" role="alert">
                    ⚠️ {modalError}
                  </div>
                )}

                <div className="sa-form-group">
                  <label className="sa-form-label" htmlFor="create-role">
                    <span>Assigned Role</span>
                  </label>
                  <input
                    id="create-role"
                    type="text"
                    className="sa-form-input"
                    value={currentTabLabel}
                    disabled
                  />
                </div>

                <div className="sa-form-group">
                  <label className="sa-form-label" htmlFor="create-username">
                    <span>Username *</span>
                  </label>
                  <input
                    id="create-username"
                    type="text"
                    className="sa-form-input"
                    placeholder="e.g. guide_rahul or hp_jaipur"
                    value={createForm.username}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, username: e.target.value }))}
                    disabled={modalSubmitting}
                    required
                  />
                </div>

                <div className="sa-form-group">
                  <label className="sa-form-label" htmlFor="create-name">
                    <span>Full Name / Entity Name *</span>
                  </label>
                  <input
                    id="create-name"
                    type="text"
                    className="sa-form-input"
                    placeholder="e.g. Rahul Sharma"
                    value={createForm.name}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                    disabled={modalSubmitting}
                    required
                  />
                </div>

                <div className="sa-form-group">
                  <label className="sa-form-label" htmlFor="create-email">
                    <span>Email Address *</span>
                  </label>
                  <input
                    id="create-email"
                    type="email"
                    className="sa-form-input"
                    placeholder="e.g. rahul@xploreo.com"
                    value={createForm.email}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                    disabled={modalSubmitting}
                    required
                  />
                </div>

                <div className="sa-form-group">
                  <label className="sa-form-label" htmlFor="create-phone">
                    <span>Phone Number</span>
                  </label>
                  <input
                    id="create-phone"
                    type="tel"
                    className="sa-form-input"
                    placeholder="e.g. 9876543210"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, phone: e.target.value }))}
                    disabled={modalSubmitting}
                  />
                </div>

                <div className="sa-form-group">
                  <label className="sa-form-label" htmlFor="create-password">
                    <span>Temporary Password *</span>
                    <span className="sa-form-hint">Min 6 characters</span>
                  </label>
                  <input
                    id="create-password"
                    type="password"
                    className="sa-form-input"
                    placeholder="••••••••"
                    value={createForm.password}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
                    disabled={modalSubmitting}
                    required
                  />
                </div>

                <div className="sa-form-group">
                  <label className="sa-form-label" htmlFor="create-location">
                    <span>Location / Base City</span>
                  </label>
                  <input
                    id="create-location"
                    type="text"
                    className="sa-form-input"
                    placeholder="e.g. Jaipur"
                    value={createForm.location}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, location: e.target.value }))}
                    disabled={modalSubmitting}
                  />
                </div>
              </div>

              <div className="sa-modal-footer">
                <button
                  type="button"
                  className="sa-btn-secondary"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={modalSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="sa-btn-primary"
                  disabled={modalSubmitting}
                >
                  {modalSubmitting ? 'Registering...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESTRICT / REACTIVATE CONFIRMATION DIALOG */}
      {confirmStatusUser && (
        <div className="sa-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="sa-confirm-title">
          <div className="sa-modal-card" style={{ maxWidth: 440 }}>
            <div className="sa-modal-header">
              <h3 id="sa-confirm-title" className="sa-modal-title">
                {confirmStatusUser.nextStatus === 'inactive'
                  ? 'Restrict Account Access'
                  : 'Reactivate Account Access'}
              </h3>
              <button
                type="button"
                className="sa-modal-close-btn"
                onClick={() => setConfirmStatusUser(null)}
              >
                ✕
              </button>
            </div>

            <div className="sa-modal-body">
              {modalError && (
                <div className="sa-form-error" role="alert">
                  ⚠️ {modalError}
                </div>
              )}

              <p style={{ margin: 0, fontSize: 14, color: '#334155', lineHeight: 1.5 }}>
                {confirmStatusUser.nextStatus === 'inactive' ? (
                  <>
                    Are you sure you want to <strong>restrict</strong> account access for{' '}
                    <strong>{confirmStatusUser.user.name}</strong> (#{confirmStatusUser.user.userId || confirmStatusUser.user.username})?
                    The user will be immediately barred from logging into Xploreo until reactivated.
                  </>
                ) : (
                  <>
                    Are you sure you want to <strong>reactivate</strong> account access for{' '}
                    <strong>{confirmStatusUser.user.name}</strong> (#{confirmStatusUser.user.userId || confirmStatusUser.user.username})?
                    The account status will be restored to active.
                  </>
                )}
              </p>
            </div>

            <div className="sa-modal-footer">
              <button
                type="button"
                className="sa-btn-secondary"
                onClick={() => setConfirmStatusUser(null)}
                disabled={modalSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className={confirmStatusUser.nextStatus === 'inactive' ? 'sa-btn-danger' : 'sa-btn-primary'}
                onClick={handleConfirmStatusChange}
                disabled={modalSubmitting}
              >
                {modalSubmitting
                  ? 'Updating...'
                  : confirmStatusUser.nextStatus === 'inactive'
                    ? 'Yes, Restrict Account'
                    : 'Yes, Reactivate Account'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* DELETE CONFIRMATION DIALOG */}
      {confirmDeleteUser && (
        <div className="sa-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="sa-delete-title">
          <div className="sa-modal-card" style={{ maxWidth: 440 }}>
            <div className="sa-modal-header">
              <h3 id="sa-delete-title" className="sa-modal-title">
                Delete User Account
              </h3>
              <button
                type="button"
                className="sa-modal-close-btn"
                onClick={() => setConfirmDeleteUser(null)}
              >
                ✕
              </button>
            </div>

            <div className="sa-modal-body">
              {modalError && (
                <div className="sa-form-error" role="alert">
                  ⚠️ {modalError}
                </div>
              )}
              <p style={{ margin: 0, fontSize: 14, color: '#334155', lineHeight: 1.5 }}>
                Are you sure you want to permanently delete{' '}
                <strong>{confirmDeleteUser.name}</strong> (#{confirmDeleteUser.userId || confirmDeleteUser.username})?
                This action cannot be undone.
              </p>
            </div>

            <div className="sa-modal-footer">
              <button
                type="button"
                className="sa-btn-secondary"
                onClick={() => setConfirmDeleteUser(null)}
                disabled={modalSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="sa-btn-danger"
                onClick={handleConfirmDeleteUser}
                disabled={modalSubmitting}
              >
                {modalSubmitting ? 'Deleting...' : 'Yes, Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
