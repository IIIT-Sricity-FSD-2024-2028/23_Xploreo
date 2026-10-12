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
    expect(await screen.findByText('Guests today')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /today.s schedule/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Upcoming bookings' })).toBeInTheDocument();
  });

  it('shows friendly empty states for a partner with no history', async () => {
    renderAs('exp-ker-1', '/experience/home');
    expect(await screen.findByText('No sessions today')).toBeInTheDocument();
    expect(screen.getByText('No upcoming bookings')).toBeInTheDocument();
    expect(screen.getByText('No reviews yet')).toBeInTheDocument();
  });
});

describe('catalog', () => {
  it('lists only this partner’s experiences and shows their locked region', async () => {
    renderAs('exp-goa-1', '/experience/catalog');
    expect(await card('Sunset Beach Photography Walk')).toBeInTheDocument();
    expect(screen.queryByText('Fontainhas Latin Quarter Tour')).not.toBeInTheDocument();
    expect(screen.getAllByText('Goa').length).toBeGreaterThan(0);
  });

  it('shows an empty state with a call to action when there are no experiences', async () => {
    renderAs('exp-ker-1', '/experience/catalog');
    expect(await screen.findByText('No experiences yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add your first experience' })).toBeInTheDocument();
  });

  it('validates the form, locks the region, then adds the experience', async () => {
    const user = userEvent.setup();
    renderAs('exp-goa-1', '/experience/catalog');
    await card('Sunset Beach Photography Walk');
    await user.click(screen.getByRole('button', { name: '+ Add experience' }));
    const dialog = await screen.findByRole('dialog', { name: 'Add new experience' });

    expect(within(dialog).getByLabelText('Region')).toBeDisabled();
    expect(within(dialog).getByLabelText('Region')).toHaveValue('Goa');

    await user.click(within(dialog).getByRole('button', { name: 'Save experience' }));
    expect(await within(dialog).findByText('Enter a name with at least 3 characters.')).toBeInTheDocument();
    expect(within(dialog).getByText('Enter a price greater than 0.')).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText('Experience name'), 'Fort Aguada Sunset Stroll');
    await user.type(within(dialog).getByLabelText('Price per guest (₹)'), '950');
    await user.type(within(dialog).getByLabelText('Duration (hours)'), '2');
    await user.type(within(dialog).getByLabelText('Default capacity per session'), '12');
    await user.type(within(dialog).getByLabelText('Description'), 'A relaxed evening walk around the old fort.');
    await user.click(within(dialog).getByRole('button', { name: 'Save experience' }));

    expect(await card('Fort Aguada Sunset Stroll')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('shows "not found" instead of another partner’s experience when the URL is tampered with', async () => {
    renderAs('exp-goa-1', '/experience/catalog');
    await card('Sunset Beach Photography Walk');
    // exp-goa-2's first experience id
    storeIdentity('exp-goa-2');
    const theirs = (await request('/experiences'))[0];
    storeIdentity('exp-goa-1');
    document.body.innerHTML = '';
    renderAs('exp-goa-1', `/experience/catalog?manage=${theirs.id}`);
    expect(await screen.findByText('Experience not found')).toBeInTheDocument();
  });
});

describe('slots', () => {
  async function openSlots(title) {
    const user = userEvent.setup();
    renderAs('exp-goa-1', '/experience/catalog');
    const article = await card(title);
    await user.click(within(article).getByRole('button', { name: 'Manage slots' }));
    await screen.findByRole('heading', { level: 1, name: title });
    return user;
  }

  it('adds a slot to an experience with none, then rejects a duplicate with a field error', async () => {
    const user = await openSlots('Night Market Food Trail');
    expect(screen.getByText('No sessions yet')).toBeInTheDocument();

    const add = async () => {
      const dialog = await screen.findByRole('dialog');
      fireEvent.change(within(dialog).getByLabelText('Date'), { target: { value: daysFromNow(14) } });
      fireEvent.change(within(dialog).getByLabelText('Start time'), { target: { value: '19:30' } });
      await user.click(within(dialog).getByRole('button', { name: 'Add slot' }));
      return dialog;
    };

    await user.click(screen.getByRole('button', { name: 'Add your first slot' }));
    await add();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByText('07:30 PM')).toBeInTheDocument();
    expect(screen.queryByText('No sessions yet')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '+ Add slot' }));
    const dialog = await add();
    expect(await within(dialog).findByText(/a session already exists/i)).toBeInTheDocument();
  });

  it('rejects past or same-day dates before calling the server', async () => {
    const user = await openSlots('Night Market Food Trail');
    await user.click(screen.getAllByRole('button', { name: /add (your first )?slot/i })[0]);
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Date'), { target: { value: daysFromNow(0) } });
    fireEvent.change(within(dialog).getByLabelText('Start time'), { target: { value: '10:00' } });
    await user.click(within(dialog).getByRole('button', { name: 'Add slot' }));
    expect(await within(dialog).findByText('Slots can only be created for tomorrow or later.')).toBeInTheDocument();
  });

  it('shows a full session as Full and does not allow it to be reopened or removed', async () => {
    await openSlots('Backwater Kayak Safari');
    expect((await screen.findAllByText('Full')).length).toBeGreaterThan(0);
    const fullRow = screen.getAllByText('Full')[0].closest('li');
    expect(within(fullRow).getByRole('switch')).toBeDisabled();
    expect(within(fullRow).getByRole('button', { name: 'Remove' })).toBeDisabled();
  });

  it('changes capacity through the server and shows the server’s answer', async () => {
    const user = await openSlots('Dolphin Spotting Boat Ride');
    const increase = await screen.findAllByRole('button', { name: 'Increase capacity' });
    const row = increase[0].closest('li');
    const before = Number(within(row).getByText(/^\d+$/).textContent);
    await user.click(increase[0]);
    await waitFor(() => expect(Number(within(screen.getAllByRole('group', { name: /capacity/i })[0]).getByText(/^\d+$/).textContent)).toBe(before + 1));
  });
});

describe('bookings', () => {
  it('shows an empty state when there are no bookings at all', async () => {
    renderAs('exp-ker-1', '/experience/bookings');
    expect(await screen.findByText('No bookings yet')).toBeInTheDocument();
  });

  it('shows a single booking for the one-booking partner', async () => {
    renderAs('exp-del-1', '/experience/bookings');
    expect(await screen.findByText(/1 booking$/)).toBeInTheDocument();
  });

  it('checks a guest in and updates the row, then pages with Show more', async () => {
    const user = userEvent.setup();
    renderAs('exp-goa-1', '/experience/bookings');
    const buttons = await screen.findAllByRole('button', { name: 'Mark check-in' });
    const before = buttons.length;
    expect(screen.getByRole('button', { name: /show more/i })).toBeInTheDocument();
    await user.click(buttons[0]);
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Mark check-in' })).toHaveLength(before - 1));
    expect(screen.getAllByText('Checked in').length).toBeGreaterThan(0);
  });

  it('filters by status and shows the empty-filter message', async () => {
    const user = userEvent.setup();
    renderAs('exp-del-1', '/experience/bookings');
    await screen.findByText(/1 booking$/);
    await user.selectOptions(screen.getByLabelText('Status'), 'completed');
    expect(await screen.findByText('No bookings match these filters')).toBeInTheDocument();
  });

  it('opens booking details', async () => {
    const user = userEvent.setup();
    renderAs('exp-del-1', '/experience/bookings');
    await user.click(await screen.findByRole('button', { name: 'View details' }));
    const dialog = await screen.findByRole('dialog', { name: 'Booking details' });
    expect(within(dialog).getByText('Booking total')).toBeInTheDocument();
  });
});

describe('earnings', () => {
  it('displays exactly what the server calculated (the app never computes money)', async () => {
    renderAs('exp-goa-1', '/experience/earnings');
    const server = await request('/experience-bookings/earnings', { params: { days: '30' } });
    expect(await screen.findByText('Net earnings')).toBeInTheDocument();
    expect(screen.getAllByText(formatCurrency(server.summary.net)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(formatCurrency(server.summary.pending)).length).toBeGreaterThan(0);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('shows an empty state for a partner with no bookings', async () => {
    renderAs('exp-ker-1', '/experience/earnings');
    expect(await screen.findByText('No earnings yet')).toBeInTheDocument();
  });
});

describe('shared partner profile', () => {
  it('shows a business name field to an experience partner but not to a guide', async () => {
    renderAs('exp-goa-1', '/experience/profile');
    expect(await screen.findByLabelText('Business name')).toBeInTheDocument();
    document.body.innerHTML = '';
    renderAs('guide-jpr-1', '/guide/profile');
    expect(await screen.findByRole('heading', { name: 'Guide profile' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Business name')).not.toBeInTheDocument();
  });

  it('validates, then saves, and never offers role or region as editable', async () => {
    const user = userEvent.setup();
    renderAs('exp-goa-1', '/experience/profile');
    const email = await screen.findByLabelText('Email');
    expect(screen.queryByLabelText('Region')).not.toBeInTheDocument();
    await user.clear(email);
    await user.type(email, 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
    await user.clear(email);
    await user.type(email, 'new@coastaltrails.example');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Profile saved.')).toBeInTheDocument();
  });
});
