// Drives the six guide screens against the mock server, as a busy guide and as a brand-new one.
import { beforeAll, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, request } from '@/foundation';
import { AppRouter } from '@/dev-stubs/routing/AppRouter.jsx';
import { loadMocks } from '@/dev-stubs/mock/loadMocks.js';
import { storeIdentity } from '@/dev-stubs/auth/session.js';
import { experiencePortal } from '@/routes/experience.routes.jsx';
import { guidePortal } from '@/routes/guide.routes.jsx';

const portals = [experiencePortal, guidePortal];

function renderAs(identity, path) {
  storeIdentity(identity);
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <AppRouter portals={portals} />
      </MemoryRouter>
    </AuthProvider>,
  );
}

beforeAll(async () => {
  await loadMocks();
});

describe('guide portal shell', () => {
  it('opens on the dashboard and shows the navigation and profile menu', async () => {
    const user = userEvent.setup();
    renderAs('guide-jpr-1', '/guide');
    expect(await screen.findByRole('heading', { name: /Welcome, Aarav Sharma/ })).toBeInTheDocument();
    ['Dashboard', 'Tours', 'Schedule', 'Earnings', 'Reviews'].forEach((label) => {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    });
    await user.click(screen.getByText('Aarav Sharma (Guide)', { selector: '.navbar *, nav *, header *' }));
    expect(await screen.findByRole('menuitem', { name: /Support/ })).toHaveAttribute('href', '/guide/support');
    expect(screen.getByRole('menuitem', { name: 'Profile' })).toHaveAttribute('href', '/guide/profile');
  });

  it('keeps an experience partner out of the guide pages', async () => {
    renderAs('exp-goa-1', '/guide/dashboard');
    expect(await screen.findByText(/not permitted \(403\)/i)).toBeInTheDocument();
  });
});

describe('dashboard', () => {
  it('lists the plans in the guide’s own region with their application state', async () => {
    renderAs('guide-jpr-1', '/guide/dashboard');
    expect(await screen.findByText('Pink City Heritage Escape')).toBeInTheDocument();
    expect(screen.getByText('Jaipur Food & Bazaar Weekender')).toBeInTheDocument();
    expect(screen.queryByText('Goa Beach & Spice Retreat')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pending Review' })).toBeDisabled();
    expect(screen.getAllByRole('button', { name: '✓ Accepted' })).toHaveLength(2);
    expect(screen.getByText('Plans Available').previousSibling).toHaveTextContent('3');
  });

  it('filters plans by the search box', async () => {
    const user = userEvent.setup();
    renderAs('guide-jpr-1', '/guide/dashboard');
    await screen.findByText('Pink City Heritage Escape');
    await user.type(screen.getByLabelText('Search plans'), 'food');
    expect(screen.queryByText('Pink City Heritage Escape')).not.toBeInTheDocument();
    expect(screen.getByText('Jaipur Food & Bazaar Weekender')).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Search plans'));
    await user.type(screen.getByLabelText('Search plans'), 'zzz');
    expect(screen.getByText('No plans available at the moment.')).toBeInTheDocument();
  });

  it('validates the price, then applies and shows what the server decided', async () => {
    const user = userEvent.setup();
    renderAs('guide-goa-1', '/guide/dashboard');
    await screen.findByText('Goa Beach & Spice Retreat');
    const apply = screen.getAllByRole('button', { name: 'Apply to Guide' });
    await user.click(apply[0]);
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Submit Application' }));
    expect(await within(dialog).findByText('Please enter a valid price.')).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText(/Your Price Per Person/), '-4');
    await user.click(within(dialog).getByRole('button', { name: 'Submit Application' }));
    expect(await within(dialog).findByText('Please enter a valid price.')).toBeInTheDocument();
    await user.clear(within(dialog).getByLabelText(/Your Price Per Person/));
    await user.type(within(dialog).getByLabelText(/Your Price Per Person/), '1800');
    await user.click(within(dialog).getByRole('button', { name: 'Submit Application' }));
    expect(await screen.findByText(/Application accepted/)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByRole('button', { name: '✓ Accepted' })).toHaveLength(1));
    await user.click(screen.getByRole('tab', { name: /My Applications/ }));
    expect(await screen.findByText(/Auto-accepted: Guide location 'Goa'/)).toBeInTheDocument();
  });

  it('shows empty states to a guide with no jobs', async () => {
    const user = userEvent.setup();
    renderAs('guide-goa-1', '/guide/dashboard');
    await user.click(await screen.findByRole('tab', { name: /My Jobs/ }));
    expect(await screen.findByText('No jobs found for this filter.')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /My Applications/ }));
    await user.click(screen.getByRole('button', { name: 'Pending' }));
    expect(screen.getByText('No applications found.')).toBeInTheDocument();
  });

  it('confirms a job, rejects another after a confirmation, and opens the details', async () => {
    const user = userEvent.setup();
    renderAs('guide-jpr-1', '/guide/dashboard');
    await user.click(await screen.findByRole('tab', { name: /My Jobs/ }));
    expect(await screen.findAllByRole('button', { name: '✓ Confirm Available' })).toHaveLength(2);

    await user.click(screen.getAllByRole('button', { name: '✓ Confirm Available' })[0]);
    expect(await screen.findByText(/Traveller has been notified/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByRole('button', { name: '✓ Confirm Available' })).toHaveLength(1));

    await user.click(screen.getByRole('button', { name: '✗ Not Available' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '✗ Not Available' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Reject Job' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: '✗ Not Available' })).not.toBeInTheDocument());

    await user.click(screen.getAllByRole('button', { name: 'View Details' })[0]);
    const details = await screen.findByRole('dialog');
    expect(await within(details).findByText(/Sneha Kulkarni|Ananya Rao|Vikram Bhatia/)).toBeInTheDocument();
    expect(within(details).getByText(/Total Expected/)).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('tours', () => {
  it('sorts trips into the three tabs and shows an empty state for a new guide', async () => {
    const user = userEvent.setup();
    renderAs('guide-jpr-1', '/guide/tours');
    expect(await screen.findByText('Royal Rajasthan Fort Trail')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Upcoming (1)' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Ongoing (1)' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Completed (1)' })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /Completed/ }));
    expect(screen.getByText('Jaipur Food & Bazaar Weekender')).toBeInTheDocument();
  });

  it('shows empty tabs to a guide with no trips', async () => {
    const user = userEvent.setup();
    renderAs('guide-goa-1', '/guide/tours');
    expect(await screen.findByText('No upcoming tours assigned for you right now.')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /Ongoing/ }));
    expect(screen.getByText("You don't have any tours in progress right now.")).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /Completed/ }));
    expect(screen.getByText('No completed tours yet!')).toBeInTheDocument();
  });

  it('starts a tour, walks its stops and finishes it', async () => {
    const user = userEvent.setup();
    renderAs('guide-jpr-1', '/guide/tours');
    await user.click(await screen.findByRole('button', { name: 'Start' }));
    expect(await screen.findByText('Tour started.')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /Ongoing/ }));
    expect(await screen.findAllByText(/In Progress/)).toHaveLength(2);

    // the ongoing trips each advance one stop per click until "Finish Tour"
    for (let guard = 0; guard < 20; guard += 1) {
      const finish = screen.queryAllByRole('button', { name: 'Finish Tour' });
      if (finish.length) await user.click(finish[0]);
      else {
        const next = screen.queryAllByRole('button', { name: 'Complete' });
        if (!next.length) break;
        await user.click(next[0]);
      }
      await waitFor(() => expect(screen.queryByRole('button', { name: /Working/ })).not.toBeInTheDocument());
    }
    await user.click(screen.getByRole('tab', { name: /Completed/ }));
    expect((await screen.findAllByText('View Details')).length).toBeGreaterThanOrEqual(2);
  });

  it('opens the itinerary details for a trip', async () => {
    const user = userEvent.setup();
    renderAs('guide-jpr-1', '/guide/tours');
    await user.click(await screen.findByRole('tab', { name: /Completed/ }));
    const completed = (await screen.findByText('Jaipur Food & Bazaar Weekender')).closest('.completed-tour-card');
    await user.click(within(completed).getByRole('button', { name: 'View Details' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Itinerary' })).toBeInTheDocument();
    expect(within(dialog).getByText('Kachori Breakfast Crawl')).toBeInTheDocument();
    await user.click(within(dialog).getAllByRole('button', { name: 'Close' })[1]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('earnings', () => {
  it('adds up the server’s amounts and filters by status', async () => {
    const user = userEvent.setup();
    renderAs('guide-jpr-1', '/guide/earnings');
    expect(await screen.findByText('Trip Earnings Breakdown')).toBeInTheDocument();
    // the page shows the sum of what the server recorded for the confirmed jobs
    const jobs = await request('/guide-assignments/guide/guide-jpr-1');
    const confirmed = jobs.filter((j) => j.status === 'confirmed').reduce((sum, j) => sum + j.paidAmount, 0);
    expect(screen.getByText(`₹${confirmed.toLocaleString('en-IN')}`, { selector: '.earn-stat-num' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancelled' }));
    expect(screen.getAllByText('🚫 Cancelled')).toHaveLength(jobs.filter((j) => j.status === 'cancelled').length);
    await user.click(screen.getByRole('button', { name: 'Rejected' }));
    expect(screen.getAllByText('❌ Rejected')).toHaveLength(jobs.filter((j) => j.status === 'rejected_by_guide').length);
  });

  it('shows an empty list for a guide with no jobs', async () => {
    renderAs('guide-goa-1', '/guide/earnings');
    expect(await screen.findByText('No trips found for this filter.')).toBeInTheDocument();
    expect(screen.getAllByText('₹0').length).toBeGreaterThan(0);
  });
});

describe('reviews', () => {
  it('shows the average and only this guide’s reviews', async () => {
    renderAs('guide-jpr-1', '/guide/reviews');
    expect(await screen.findByText('4.4')).toBeInTheDocument();
    expect(screen.getByText('5 reviews')).toBeInTheDocument();
    expect(screen.getByText(/Aarav made the forts come alive/)).toBeInTheDocument();
    expect(screen.queryByText('Late and unprepared.')).not.toBeInTheDocument();
  });

  it('shows the empty message to a guide with none', async () => {
    renderAs('guide-goa-1', '/guide/reviews');
    expect(await screen.findByText('No reviews yet')).toBeInTheDocument();
    expect(screen.getByText(/Reviews will appear here after travellers complete trips/)).toBeInTheDocument();
  });
});

describe('schedule', () => {
  it('locks the guide id, lists own items only, and adds, edits and deletes one', async () => {
    const user = userEvent.setup();
    renderAs('guide-jpr-1', '/guide/schedule');
    expect(await screen.findByText('Heritage Walk: Amber Fort')).toBeInTheDocument();
    expect(screen.queryByText('Chandni Chowk Walk')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Guide ID')).toHaveAttribute('readonly');

    await user.type(screen.getByLabelText('Title'), 'Evening Lake Walk');
    await user.type(screen.getByLabelText('Date'), '2031-02-03');
    await user.type(screen.getByLabelText('Start time'), '17:00');
    await user.type(screen.getByLabelText('End time'), '19:00');
    await user.type(screen.getByLabelText('Location'), 'Man Sagar Lake');
    await user.click(screen.getByRole('button', { name: 'Save Schedule' }));
    expect(await screen.findByText('Schedule saved successfully.')).toBeInTheDocument();
    const added = (await screen.findByText('Evening Lake Walk')).closest('article');
    expect(added).not.toBeNull();

    await user.click(within(added).getByRole('button', { name: 'Edit' }));
    expect(screen.getByRole('heading', { name: /Edit Schedule/ })).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Title'));
    await user.type(screen.getByLabelText('Title'), 'Sunset Lake Walk');
    await user.click(screen.getByRole('button', { name: 'Save Schedule' }));
    const renamed = (await screen.findByText('Sunset Lake Walk')).closest('article');

    await user.click(within(renamed).getByRole('button', { name: 'Delete' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(screen.queryByText('Sunset Lake Walk')).not.toBeInTheDocument());
    expect(screen.getByText('Schedule deleted successfully.')).toBeInTheDocument();
  });

  it('shows the server’s field messages and an empty state', async () => {
    const user = userEvent.setup();
    renderAs('guide-goa-1', '/guide/schedule');
    expect(await screen.findByText('No schedule items found.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save Schedule' }));
    expect(await screen.findByText('title should not be empty', { selector: 'small' })).toBeInTheDocument();
    expect(screen.getByText('location should not be empty', { selector: 'small' })).toBeInTheDocument();
  });
});

describe('support', () => {
  it('lists own tickets with the resolution, and files a new one', async () => {
    const user = userEvent.setup();
    renderAs('guide-jpr-1', '/guide/support');
    expect(await screen.findByText('Payout for last month not received')).toBeInTheDocument();
    expect(screen.getByText(/The payout was delayed by the bank holiday/)).toBeInTheDocument();
    expect(screen.queryByText('Profile photo will not upload')).not.toBeInTheDocument();
    expect(screen.getByText('2 Tickets')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Subject'), 'Need a receipt');
    await user.type(screen.getByLabelText('Detailed Message'), 'Please send the receipt for my last tour.');
    await user.click(screen.getByRole('button', { name: /Submit Ticket/ }));
    expect(await screen.findByText(/submitted successfully/)).toBeInTheDocument();
    expect(await screen.findByText('Need a receipt')).toBeInTheDocument();
    expect(screen.getByText('3 Tickets')).toBeInTheDocument();
  });

  it('asks for the required fields, shows the server’s message and the empty state', async () => {
    const user = userEvent.setup();
    renderAs('guide-goa-1', '/guide/support');
    expect(await screen.findByText('No support tickets raised yet')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Submit Ticket/ }));
    expect(screen.getByText('Please fill in all required fields.')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Subject'), 'Hi');
    await user.type(screen.getByLabelText('Detailed Message'), 'short');
    await user.click(screen.getByRole('button', { name: /Submit Ticket/ }));
    expect(await screen.findByText('subject must be between 3 and 140 characters', { selector: 'small' })).toBeInTheDocument();
  });

  it('opens one FAQ at a time', async () => {
    const user = userEvent.setup();
    renderAs('guide-goa-1', '/guide/support');
    const first = await screen.findByRole('button', { name: /How do I report a technical bug/ });
    const second = screen.getByRole('button', { name: /How long does it take/ });
    await user.click(first);
    expect(first).toHaveAttribute('aria-expanded', 'true');
    await user.click(second);
    expect(first).toHaveAttribute('aria-expanded', 'false');
    expect(second).toHaveAttribute('aria-expanded', 'true');
  });
});
