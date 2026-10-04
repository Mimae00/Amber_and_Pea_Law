import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import { LeadForm, validateLead, type LeadFormValues } from './LeadForm';

// Each test sets its own implementation. Note: resetting this mock in beforeEach made Vitest 5
// re-raise the rejected ApiError from the server-error test, so assertions use "last call" instead.
const { createLead } = vi.hoisted(() => ({ createLead: vi.fn() }));

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      createLead,
      practiceAreas: vi.fn().mockResolvedValue([
        { id: 1, slug: 'divorce', name: 'Divorce', summary: '', description: '', sortOrder: 1, active: true },
      ]),
    },
  };
});

const valid: LeadFormValues = {
  fullName: 'Jane Sample',
  email: 'jane@example.com',
  phone: '',
  practiceAreaSlug: '',
  message: '',
  consent: true,
  website: '',
};

describe('validateLead', () => {
  it('accepts a valid lead', () => {
    expect(validateLead(valid, false)).toEqual({});
  });

  it('flags each invalid field', () => {
    const errors = validateLead({ ...valid, fullName: ' ', email: 'nope', phone: 'abc', consent: false }, true);
    expect(Object.keys(errors).sort()).toEqual(['consent', 'email', 'fullName', 'message', 'phone']);
  });
});

function renderForm() {
  return render(
    <MemoryRouter>
      <LeadForm source="CONTACT_FORM" heading="Send us a message" requireMessage />
    </MemoryRouter>,
  );
}

describe('LeadForm', () => {


  it('shows errors, marks fields invalid and focuses the first one', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole('button', { name: 'Request free consultation' }));

    const name = screen.getByLabelText(/Full name/);
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveAccessibleDescription('Please enter your name.');
    expect(name).toHaveFocus();
    expect(screen.getByText('Please confirm we may contact you.')).toBeInTheDocument();
    expect(createLead).not.toHaveBeenCalled();
  });

  it('submits trimmed values with the source and an empty honeypot', async () => {
    createLead.mockResolvedValue({ status: 'received' });
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/Full name/), '  Jane Sample ');
    await user.type(screen.getByLabelText(/^Email/), 'jane@example.com');
    await user.selectOptions(await screen.findByLabelText('Type of matter'), 'divorce');
    await user.type(screen.getByLabelText(/How can we help/), 'Question about fees');
    await user.click(screen.getByRole('checkbox', { name: /may contact me/ }));
    await user.click(screen.getByRole('button', { name: 'Request free consultation' }));

    await waitFor(() => expect(createLead).toHaveBeenCalled());
    expect(createLead).toHaveBeenLastCalledWith({
      fullName: 'Jane Sample',
      email: 'jane@example.com',
      phone: undefined,
      message: 'Question about fees',
      practiceAreaSlug: 'divorce',
      source: 'CONTACT_FORM',
      consent: true,
      website: '',
    });
    expect(await screen.findByRole('status')).toHaveTextContent('We received your request');
  });

  it('shows server-side field errors', async () => {
    createLead.mockImplementation(() => {
      const p = Promise.reject(new ApiError(400, 'Validation failed', { errors: { email: 'Please enter a valid email' } }));
      p.catch(() => {}); // the form handles it; mark handled so the runner doesn't flag the rejection
      return p;
    });
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/Full name/), 'Jane');
    await user.type(screen.getByLabelText(/^Email/), 'jane@example.com');
    await user.type(screen.getByLabelText(/How can we help/), 'Hi');
    await user.click(screen.getByRole('checkbox', { name: /may contact me/ }));
    await user.click(screen.getByRole('button', { name: 'Request free consultation' }));

    expect(await screen.findByText('Please enter a valid email')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Please check the highlighted fields.');
  });

  it('keeps the honeypot out of the tab order and hidden from assistive tech', () => {
    const { container } = renderForm();
    const honeypot = container.querySelector('input[name="website"]');
    expect(honeypot).toHaveAttribute('tabindex', '-1');
    expect(honeypot?.closest('[aria-hidden="true"]')).not.toBeNull();
  });
});
