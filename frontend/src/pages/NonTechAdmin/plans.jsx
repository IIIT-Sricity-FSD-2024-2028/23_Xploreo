import { useState } from 'react';
import { useAuth } from '@/foundation';
import { PlanList, PlanForm } from '../../components/nta';
import '../../components/nta/nta.css';

/**
 * NonTechAdmin Plans & Package Management Page.
 * Strictly adheres to product requirement:
 * - Partner Hotel Stays + Curated Experiences ONLY.
 * - Zero flights. Zero transport.
 * 
 * @param {Object} props
 * @param {Object} [props.user] - User object passed via router / layout
 * @param {Object} [props.currentUser] - Alternative user prop naming
 */
export default function PlansPage({ user = null, currentUser = null, onNavigateDashboard = null }) {
  const { user: authUser } = useAuth();
  // Session resolution: props -> auth context -> default fallback
  const activeUser = currentUser || user || (authUser && authUser.role !== 'default' ? authUser : {
    userid: 'NTA-JAI-001',
    userId: 'NTA-JAI-001',
    role: 'nontechadmin',
    region: 'Jaipur',
  });

  // View state: 'list' | 'create' | 'edit'
  const [currentView, setCurrentView] = useState('list');
  const [editingPlan, setEditingPlan] = useState(null);
  const [feedbackNotice, setFeedbackNotice] = useState(null);

  // Switch to Create mode
  const handleStartCreate = () => {
    setEditingPlan(null);
    setCurrentView('create');
    setFeedbackNotice(null);
  };

  // Switch to Edit mode
  const handleStartEdit = (plan) => {
    setEditingPlan(plan);
    setCurrentView('edit');
    setFeedbackNotice(null);
  };

  // Back to List mode
  const handleBackToList = () => {
    setEditingPlan(null);
    setCurrentView('list');
  };

  // Handle successful form submission (the saved plan is already in the Redux collection)
  const handleFormSuccess = (savedPlan) => {
    setCurrentView('list');
    setEditingPlan(null);
    setFeedbackNotice({
      type: 'success',
      message: `Package "${savedPlan.title}" saved successfully!`,
    });
    // Auto-clear notice after 6 seconds
    setTimeout(() => {
      setFeedbackNotice(null);
    }, 6000);
  };

  return (
    <div className="nta-page-container">
      {/* Page Header */}
      <header className="nta-page-header">
        <div className="nta-page-header-text">
          <div className="nta-page-eyebrow">
            <span>Non-Tech Admin</span>
            {activeUser.region && (
              <span className="nta-page-region-tag">
                Region: {activeUser.region}
              </span>
            )}
          </div>
          <h1 className="nta-page-title">Travel Packages & Itinerary Management</h1>
          <p className="nta-page-subtitle">
            Curate and manage ground travel packages featuring partner hotel accommodations and curated daily experiences.
          </p>
        </div>

        <div className="nta-page-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {onNavigateDashboard && currentView === 'list' && (
            <button
              type="button"
              className="nta-form-btn-secondary"
              onClick={onNavigateDashboard}
            >
              &larr; Back to Dashboard
            </button>
          )}

          {currentView === 'list' ? (
            <button
              type="button"
              className="nta-form-btn-submit"
              onClick={handleStartCreate}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Create New Package
            </button>
          ) : (
            <button
              type="button"
              className="nta-form-btn-secondary"
              onClick={handleBackToList}
            >
              &larr; Back to Packages List
            </button>
          )}
        </div>
      </header>

      {/* Temporary feedback banner */}
      {feedbackNotice && (
        <div className="nta-form-alert-success" role="status" style={{ marginBottom: '24px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{feedbackNotice.message}</span>
        </div>
      )}

      {/* Main View Area */}
      <main className="nta-page-main">
        {currentView === 'list' ? (
          <PlanList
            onEditPlan={handleStartEdit}
            onCreateNew={handleStartCreate}
            currentUser={activeUser}
          />
        ) : (
          <PlanForm
            initialPlan={editingPlan}
            onSubmitSuccess={handleFormSuccess}
            onCancel={handleBackToList}
            currentUser={activeUser}
          />
        )}
      </main>
    </div>
  );
}
