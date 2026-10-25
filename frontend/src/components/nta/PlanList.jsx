import { useState, useEffect, useCallback, useMemo } from 'react';
import { getPlans, deletePlan } from '../../services/plans.api.js';
import PlanCard from './PlanCard.jsx';
import PlanDetailsModal from './PlanDetailsModal.jsx';
import './nta.css';

const SUPPORTED_DESTINATIONS = ['All', 'Jaipur', 'Goa', 'Delhi', 'Mumbai', 'Kerala'];

const STATUS_FILTERS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'available', label: 'Available' },
  { value: 'sold_out', label: 'Sold Out' },
  { value: 'draft', label: 'Draft' },
  { value: 'unavailable', label: 'Unavailable' },
];

/**
 * Reusable Package List Component for NTA & SuperAdmin views.
 * Strictly adheres to product requirement:
 * - Partner Hotel Stays + Curated Experiences ONLY.
 * - Zero flights. Zero transport.
 * 
 * @param {Object} props
 * @param {Function} [props.onEditPlan] - Callback to edit a plan: (plan) => void
 * @param {Function} [props.onCreateNew] - Callback to create a new plan: () => void
 * @param {Object} [props.currentUser] - Session user { userId, role, region }
 * @param {number|string} [props.refreshTrigger] - Incremental prop to trigger list reload
 * @param {string} [props.className] - Additional CSS class name
 */
export default function PlanList({
  onEditPlan,
  onCreateNew,
  onDeletePlan,
  currentUser = null,
  refreshTrigger = 0,
  className = '',
}) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const assignedRegion = currentUser?.region || '';
  const userRole = (currentUser?.role || '').toLowerCase();
  const isSuperAdmin = userRole === 'superadmin';
  const canDelete = isSuperAdmin;

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDestination, setSelectedDestination] = useState(assignedRegion || 'All');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modal view for plan details
  const [activeDetailsPlan, setActiveDetailsPlan] = useState(null);

  // SuperAdmin deletion state
  const [planToDelete, setPlanToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Keep selectedDestination in sync with assignedRegion
  useEffect(() => {
    if (assignedRegion) {
      setSelectedDestination(assignedRegion);
    }
    // Clear details modal if region changed to prevent stale modal
    setActiveDetailsPlan(null);
    setPlanToDelete(null);
  }, [assignedRegion]);

  // Asynchronous data fetching
  useEffect(() => {
    let ignore = false;
    getPlans({}, currentUser)
      .then((response) => {
        if (!ignore) {
          const data = Array.isArray(response?.data)
            ? response.data
            : Array.isArray(response)
            ? response
            : [];
          setPlans(data);
          setError(null);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err.message || 'Failed to retrieve travel packages.');
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [currentUser, refreshTrigger]);

  // Manual retry handler
  const handleRetry = useCallback(() => {
    setLoading(true);
    setError(null);
    getPlans({}, currentUser)
      .then((response) => {
        const data = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
          ? response
          : [];
        setPlans(data);
      })
      .catch((err) => {
        setError(err.message || 'Failed to retrieve travel packages.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [currentUser]);

  // Custom deletion callback or default deletion confirmation
  const handleDeleteConfirm = async () => {
    if (!planToDelete) return;
    if (onDeletePlan) {
      setIsDeleting(true);
      try {
        await onDeletePlan(planToDelete);
        setPlans((prev) => prev.filter((p) => p.id !== planToDelete.id));
        setPlanToDelete(null);
      } catch (err) {
        setDeleteError(err.message || 'Failed to delete package.');
      } finally {
        setIsDeleting(false);
      }
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deletePlan(planToDelete.id, currentUser);
      setPlans((prev) => prev.filter((p) => p.id !== planToDelete.id));
      setPlanToDelete(null);
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete package.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter plans based on search query, destination pill, and status
  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      // If user has an assigned region, strictly scope to that region
      if (assignedRegion && plan.destination?.toLowerCase() !== assignedRegion.toLowerCase()) {
        return false;
      }

      // Destination filter (for superadmin or all-view)
      if (
        !assignedRegion &&
        selectedDestination !== 'All' &&
        plan.destination?.toLowerCase() !== selectedDestination.toLowerCase()
      ) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'all') {
        const pStatus = (plan.status || 'available').toLowerCase();
        if (pStatus !== selectedStatus) {
          return false;
        }
      }

      // Search term filter (title, destination, tags)
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesTitle = plan.title?.toLowerCase().includes(q);
        const matchesDest = plan.destination?.toLowerCase().includes(q);
        const matchesTags = Array.isArray(plan.tags) && plan.tags.some((t) => t.toLowerCase().includes(q));

        if (!matchesTitle && !matchesDest && !matchesTags) {
          return false;
        }
      }

      return true;
    });
  }, [plans, assignedRegion, selectedDestination, selectedStatus, searchTerm]);

  return (
    <div className={`nta-plan-list-container ${className}`}>
      {/* Search & Filter Toolbar */}
      <div className="nta-filter-toolbar">
        <div className="nta-search-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="nta-search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={assignedRegion ? `Search ${assignedRegion} packages by name or tags...` : "Search by package name, destination, or tags..."}
            aria-label="Search travel packages"
          />
          {searchTerm && (
            <button
              type="button"
              className="nta-search-clear-btn"
              onClick={() => setSearchTerm('')}
              aria-label="Clear search query"
            >
              &times;
            </button>
          )}
        </div>

        <div className="nta-filter-controls">
          {/* Destination Pills */}
          <div className="nta-destination-pills" role="tablist" aria-label="Destination filter">
            {assignedRegion ? (
              <button
                type="button"
                className="nta-dest-pill active assigned"
                role="tab"
                aria-selected={true}
                disabled
              >
                📍 {assignedRegion}
                <span className="nta-dest-pill-dot" title="Assigned Region" />
              </button>
            ) : (
              SUPPORTED_DESTINATIONS.map((dest) => {
                const isSelected = selectedDestination.toLowerCase() === dest.toLowerCase();
                return (
                  <button
                    key={dest}
                    type="button"
                    className={`nta-dest-pill ${isSelected ? 'active' : ''}`}
                    onClick={() => setSelectedDestination(dest)}
                    role="tab"
                    aria-selected={isSelected}
                  >
                    {dest}
                  </button>
                );
              })
            )}
          </div>

          {/* Status Dropdown */}
          <div className="nta-status-select-wrapper">
            <select
              className="nta-status-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              aria-label="Filter by publication status"
            >
              {STATUS_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Region notice for NTA */}
      {assignedRegion && (
        <div className="nta-region-info-banner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span>
            You are managing packages as a Non-Tech Admin for <strong>{assignedRegion}</strong>. You have edit access for packages in your assigned territory.
          </span>
        </div>
      )}

      {/* Main Content Areas */}
      {loading ? (
        <div className="nta-list-loading">
          <svg
            style={{ animation: 'spin 1s linear infinite' }}
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#2563eb"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" strokeDasharray="30" strokeDashoffset="10" />
          </svg>
          <p>Loading curated travel packages...</p>
        </div>
      ) : error ? (
        <div className="nta-list-error-state" role="alert">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="error-title">Unable to load packages</p>
          <p className="error-message">{error}</p>
          <button type="button" className="nta-btn-retry" onClick={handleRetry}>
            Try Again
          </button>
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="nta-list-empty-state">
          <div className="nta-empty-icon-circle">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
          </div>
          <h4>No travel packages found</h4>
          <p>
            {searchTerm || selectedDestination !== 'All' || selectedStatus !== 'all'
              ? 'Try adjusting your search terms or filters to find matching packages.'
              : 'No packages have been created yet. Start by crafting a new hotel and experience package.'}
          </p>
          {onCreateNew && (
            <button
              type="button"
              className="nta-form-btn-submit"
              onClick={onCreateNew}
              style={{ marginTop: '12px' }}
            >
              + Create New Package
            </button>
          )}
        </div>
      ) : (
        <div className="nta-plans-grid">
          {filteredPlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onViewDetails={(p) => setActiveDetailsPlan(p)}
              onEdit={onEditPlan}
              onDelete={canDelete ? (p) => setPlanToDelete(p) : undefined}
              currentUser={currentUser}
            />
          ))}
        </div>
      )}

      {/* Plan Details Modal */}
      {activeDetailsPlan && (
        <PlanDetailsModal
          plan={activeDetailsPlan}
          onClose={() => setActiveDetailsPlan(null)}
          onEdit={onEditPlan}
          currentUser={currentUser}
        />
      )}

      {/* Delete Confirmation Modal */}
      {planToDelete && (
        <div className="nta-modal-backdrop" role="presentation">
          <div className="nta-modal-card" style={{ maxWidth: '440px' }} role="dialog">
            <div className="nta-modal-header">
              <h3 className="nta-modal-title" style={{ color: '#b91c1c' }}>
                Confirm Package Deletion
              </h3>
              <button
                type="button"
                className="nta-modal-close-btn"
                onClick={() => setPlanToDelete(null)}
                disabled={isDeleting}
              >
                &times;
              </button>
            </div>
            <div className="nta-modal-body">
              <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.5 }}>
                Are you sure you want to permanently delete the travel package{' '}
                <strong>"{planToDelete.title}"</strong> ({planToDelete.destination})? This action cannot be undone.
              </p>
              {deleteError && (
                <div className="nta-form-alert-error" style={{ marginTop: '12px' }}>
                  <span>{deleteError}</span>
                </div>
              )}
            </div>
            <div className="nta-modal-footer">
              <button
                type="button"
                className="nta-form-btn-secondary"
                onClick={() => setPlanToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="nta-card-btn-delete"
                style={{ padding: '9px 18px', fontSize: '13px' }}
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Package'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
