// Drives the real screens against the mock server, as each kind of partner would.
import { beforeAll, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, request } from '@/foundation';
import { AppRouter } from '@/dev-stubs/routing/AppRouter.jsx';
import { loadMocks } from '@/dev-stubs/mock/loadMocks.js';
import { storeIdentity } from '@/dev-stubs/auth/session.js';
import { experiencePortal } from '@/routes/experience.routes.jsx';
import { guidePortal } from '@/routes/guide.routes.jsx';
import { formatCurrency, toIsoDate } from '@/lib/datetime.js';

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

const card = (title) => screen.findByRole('article', { name: title });
const dialogOf = (name) => screen.findByRole('dialog', name ? { name } : undefined);
const daysFromNow = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return toIsoDate(d);
};

beforeAll(async () => {
  await loadMocks();
});

describe('route guard', () => {
  it('asks a signed-out visitor to sign in', async () => {
    renderAs('none', '/experience/home');
    expect(await screen.findByText('Not signed in')).toBeInTheDocument();
  });

  it('shows 403 to a guide who opens the experience portal', async () => {
    renderAs('guide-jpr-1', '/experience/home');
    expect(await screen.findByText(/not permitted \(403\)/i)).toBeInTheDocument();
  });
});

describe('home', () => {
  it('shows summary, today’s schedule and recent activity for a busy partner', async () => {
    renderAs('exp-goa-1', '/experience/home');
    expect(await screen.findByRole('heading', { name: 'Home' })).toBeInTheDocument();
    expect(await screen.findByText("Today's Bookings")).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Action Required' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: "Today's Schedule" })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Upcoming Bookings' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'What People Say' })).toBeInTheDocument();
  });

  it('shows friendly empty states for a partner with no history', async () => {
    renderAs('exp-ker-1', '/experience/home');
    expect(await screen.findByText('No sessions today')).toBeInTheDocument();
    expect(screen.getByText('No upcoming bookings')).toBeInTheDocument();
    expect(screen.getByText('No reviews yet')).toBeInTheDocument();
  });
});

describe('navbar', () => {
  it('keeps the original navigation and the profile dropdown', async () => {
    const user = userEvent.setup();
    renderAs('exp-goa-1', '/experience/home');
    await screen.findByRole('heading', { name: 'Home' });
    ['Home', 'Bookings', 'Experiences', 'Earnings'].forEach((label) => {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    });
    await user.click(screen.getByText('Coastal Trails Goa'));
    expect(await screen.findByRole('menuitem', { name: 'Profile' })).toHaveAttribute('href', '/experience/profile');
    expect(screen.getByRole('menuitem', { name: 'Logout' })).toBeInTheDocument();
  });
});

describe('catalog', () => {
  it('lists only this partner’s experiences and shows their locked region', async () => {
    renderAs('exp-goa-1', '/experience/catalog');
    expect(await card('Sunset Beach Photography Walk')).toBeInTheDocument();
    expect(screen.queryByText('Fontainhas Latin Quarter Tour')).not.toBeInTheDocument();
    expect(screen.getAllByText('Goa').length).toBeGreaterThan(0);
  });

  it('shows an empty state when there are no experiences', async () => {
    renderAs('exp-ker-1', '/experience/catalog');
    expect(await screen.findByText('No experiences right now')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Add Experience' })).toBeInTheDocument();
  });

  it('validates the form, locks the location, then adds the experience', async () => {
    const user = userEvent.setup();
    renderAs('exp-goa-1', '/experience/catalog');
    await card('Sunset Beach Photography Walk');
    await user.click(screen.getByRole('button', { name: '+ Add Experience' }));
    const dialog = await dialogOf('Add New Experience');

    expect(within(dialog).getByLabelText('Assigned Location (Fixed)')).toBeDisabled();
    expect(within(dialog).getByLabelText('Assigned Location (Fixed)')).toHaveValue('Goa');

    await user.click(within(dialog).getByRole('button', { name: 'Save Experience' }));
    expect(await within(dialog).findByText('Enter a name with at least 3 characters.')).toBeInTheDocument();
    expect(within(dialog).getByText('Enter a valid price greater than 0.')).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText(/^Experience Name/), 'Fort Aguada Sunset Stroll');
    expect(await within(dialog).findByText('Select a category.')).toBeInTheDocument();
    await user.selectOptions(within(dialog).getByLabelText(/^Category/), within(dialog).getAllByRole('option')[1]);
    await user.type(within(dialog).getByLabelText(/^Price per Person/), '950');
    await user.type(within(dialog).getByLabelText(/^Duration \(hours\)/), '2');
    await user.type(within(dialog).getByLabelText(/^Capacity per Slot/), '12');
    await user.type(within(dialog).getByLabelText(/^Short Description/), 'A relaxed evening walk around the old fort.');
    await user.click(within(dialog).getByRole('button', { name: 'Save Experience' }));

    expect(await card('Fort Aguada Sunset Stroll')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('edits an experience from the edit modal', async () => {
    const user = userEvent.setup();
    renderAs('exp-goa-1', '/experience/catalog');
    const article = await card('Sunset Beach Photography Walk');
    await user.click(within(article).getByRole('button', { name: 'Edit' }));
    const dialog = await dialogOf('Edit Experience');
    const name = within(dialog).getByLabelText('Experience Name');
    await user.clear(name);
    await user.type(name, 'Sunset Beach Photo Walk');
    await user.click(within(dialog).getByRole('button', { name: 'Save Changes' }));
    const renamed = await card('Sunset Beach Photo Walk');
    // put the name back so the other tests keep their fixtures
    await user.click(within(renamed).getByRole('button', { name: 'Edit' }));
    const again = await dialogOf('Edit Experience');
    const field = within(again).getByLabelText('Experience Name');
    await user.clear(field);
    await user.type(field, 'Sunset Beach Photography Walk');
    await user.click(within(again).getByRole('button', { name: 'Save Changes' }));
    expect(await card('Sunset Beach Photography Walk')).toBeInTheDocument();
  });

  it('shows "not in your catalog" instead of another partner’s experience when the URL is tampered with', async () => {
    renderAs('exp-goa-1', '/experience/catalog');
    await card('Sunset Beach Photography Walk');
    storeIdentity('exp-goa-2');
    const theirs = (await request('/experiences'))[0];
    storeIdentity('exp-goa-1');
    document.body.innerHTML = '';
    renderAs('exp-goa-1', `/experience/catalog?manage=${theirs.id}`);
    expect(await screen.findByText('That experience is not in your catalog.')).toBeInTheDocument();
  });
});

describe('slots', () => {
  async function openSlots(title) {
    const user = userEvent.setup();
    renderAs('exp-goa-1', '/experience/catalog');
    const article = await card(title);
    await user.click(within(article).getByRole('button', { name: 'Manage Slots' }));
    await screen.findByRole('heading', { level: 1, name: title });
    return user;
  }

  it('adds a slot to an experience with none, then rejects a duplicate with a field error', async () => {
    const user = await openSlots('Night Market Food Trail');
    expect(screen.getByText('No slots created yet')).toBeInTheDocument();

    const add = async () => {
      const dialog = await dialogOf('Add New Slot');
      fireEvent.change(within(dialog).getByLabelText('Session Date'), { target: { value: daysFromNow(14) } });
      fireEvent.change(within(dialog).getByLabelText('Session Time'), { target: { value: '19:30' } });
      await user.click(within(dialog).getByRole('button', { name: 'Add Slot' }));
      return dialog;
    };

    await user.click(screen.getByRole('button', { name: '+ Add Slot' }));
    await add();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByText('07:30 PM')).toBeInTheDocument();
    expect(screen.queryByText('No slots created yet')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '+ Add Slot' }));
    const dialog = await add();
    expect(await within(dialog).findByText(/a session already exists/i)).toBeInTheDocument();
  });

  it('rejects past or same-day dates before calling the server', async () => {
    const user = await openSlots('Night Market Food Trail');
    await user.click(screen.getByRole('button', { name: '+ Add Slot' }));
    const dialog = await dialogOf('Add New Slot');
    fireEvent.change(within(dialog).getByLabelText('Session Date'), { target: { value: daysFromNow(0) } });
    fireEvent.change(within(dialog).getByLabelText('Session Time'), { target: { value: '10:00' } });
    await user.click(within(dialog).getByRole('button', { name: 'Add Slot' }));
    expect(await within(dialog).findByText('Slots can only be created for tomorrow or later.')).toBeInTheDocument();
  });

  it('shows a full session as Full and does not allow it to be reopened or removed', async () => {
    await openSlots('Backwater Kayak Safari');
    const pill = (await screen.findAllByText('Full'))[0];
    const slotCard = pill.closest('.slot-card');
    expect(within(slotCard).getByRole('switch')).toBeDisabled();
    expect(within(slotCard).getByRole('button', { name: 'Delete' })).toBeDisabled();
  });

  it('changes capacity through the server and shows the server’s answer', async () => {
    await openSlots('Dolphin Spotting Boat Ride');
    const increase = await screen.findAllByRole('button', { name: 'Increase capacity' });
    const group = increase[0].closest('[role="group"]');
    const before = Number(within(group).getByText(/^\d+$/).textContent);
    await userEvent.setup().click(increase[0]);
    await waitFor(() => expect(Number(within(screen.getAllByRole('group', { name: /capacity for/i })[0]).getByText(/^\d+$/).textContent)).toBe(before + 1));
  });
});

describe('bookings', () => {
  it('shows an empty state when there are no bookings at all', async () => {
    renderAs('exp-ker-1', '/experience/bookings');
    expect(await screen.findByText('No bookings found')).toBeInTheDocument();
  });

  it('shows a single booking for the one-booking partner', async () => {
    renderAs('exp-del-1', '/experience/bookings');
    expect(await screen.findByText('1 bookings')).toBeInTheDocument();
  });

  it('checks a guest in and updates the row', async () => {
    const user = userEvent.setup();
    renderAs('exp-goa-1', '/experience/bookings');
    const buttons = await screen.findAllByRole('button', { name: 'Mark Check-in' });
    const before = buttons.length;
    await user.click(buttons[0]);
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Mark Check-in' })).toHaveLength(before - 1));
    expect(screen.getAllByText('Checked-In').length).toBeGreaterThan(0);
  });

  it('filters by status and shows the empty-filter message', async () => {
    const user = userEvent.setup();
    renderAs('exp-del-1', '/experience/bookings');
    await screen.findByText('1 bookings');
    await user.selectOptions(screen.getByLabelText('Status'), 'completed');
    expect(await screen.findByText('No bookings found')).toBeInTheDocument();
    expect(screen.getByText('Try changing your filters.')).toBeInTheDocument();
  });

  it('opens booking details with the server’s total', async () => {
    const user = userEvent.setup();
    renderAs('exp-del-1', '/experience/bookings');
    await user.click(await screen.findByRole('button', { name: 'View Details' }));
    const dialog = await dialogOf();
    expect(within(dialog).getByText('Total Amount')).toBeInTheDocument();
    expect(within(dialog).getByText('Customer Information')).toBeInTheDocument();
  });
});

describe('earnings', () => {
  it('displays exactly what the server calculated (the app never computes money)', async () => {
    renderAs('exp-goa-1', '/experience/earnings');
    const server = await request('/experience-bookings/earnings', { params: { days: '90' } });
    expect(await screen.findByText('Total Revenue', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getAllByText(formatCurrency(server.summary.gross)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(formatCurrency(server.summary.net)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(formatCurrency(server.summary.refunded)).length).toBeGreaterThan(0);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('shows an empty transactions table for a partner with no bookings', async () => {
    renderAs('exp-ker-1', '/experience/earnings');
    expect(await screen.findByText('No transactions for this period.')).toBeInTheDocument();
  });
});

describe('shared partner profile', () => {
  it('shows Business Details to an experience partner and Professional Details to a guide', async () => {
    renderAs('exp-goa-1', '/experience/profile');
    expect(await screen.findByLabelText('Business Name')).toBeInTheDocument();
    expect(screen.queryByLabelText('Years of Experience')).not.toBeInTheDocument();
    document.body.innerHTML = '';
    renderAs('guide-jpr-1', '/guide/profile');
    expect(await screen.findByLabelText('Years of Experience')).toBeInTheDocument();
    expect(screen.getByLabelText('Languages')).toBeInTheDocument();
    expect(screen.getByLabelText('Bio')).toBeInTheDocument();
    expect(screen.queryByLabelText('Business Name')).not.toBeInTheDocument();
  });

  it('validates, then saves, and never offers role or location as editable', async () => {
    const user = userEvent.setup();
    renderAs('exp-goa-1', '/experience/profile');
    const email = await screen.findByLabelText('Email Address');
    expect(screen.getByLabelText('Location')).toBeDisabled();
    expect(email).toBeDisabled();
    await user.click(document.getElementById('editPersonal'));
    expect(email).toBeEnabled();
    expect(screen.getByLabelText('Location')).toBeDisabled();
    await user.clear(email);
    await user.type(email, 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
    await user.clear(email);
    await user.type(email, 'new@coastaltrails.example');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(await screen.findByText('Profile updated successfully.')).toBeInTheDocument();
  });

  it('saves a guide’s professional details through /guide/:id', async () => {
    const user = userEvent.setup();
    renderAs('guide-jpr-1', '/guide/profile');
    const bio = await screen.findByLabelText('Bio');
    await user.click(document.getElementById('editProfessional'));
    await user.clear(bio);
    await user.type(bio, 'Heritage walks across old Jaipur.');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(await screen.findByText('Profile updated successfully.')).toBeInTheDocument();
    const saved = await request('/guide/guide-jpr-1');
    expect(saved.bio).toBe('Heritage walks across old Jaipur.');
  });
});
