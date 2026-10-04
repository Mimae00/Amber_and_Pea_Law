import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { BookingConfig } from '../../api/types';
import { businessDates } from '../../lib/datetime';
import { SlotPicker } from './SlotPicker';

const { availability } = vi.hoisted(() => ({ availability: vi.fn() }));
vi.mock('../../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/client')>();
  return { ...actual, api: { ...actual.api, availability } };
});

const config: BookingConfig = {
  timezone: 'America/Chicago',
  slotMinutes: 30,
  businessDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
  open: '09:00',
  close: '17:00',
  minDate: '2030-01-04', // Friday
  maxDate: '2030-01-10', // Thursday
};

describe('businessDates', () => {
  it('lists only business days in the window', () => {
    expect(businessDates(config.minDate, config.maxDate, config.businessDays)).toEqual([
      '2030-01-04', '2030-01-07', '2030-01-08', '2030-01-09', '2030-01-10',
    ]);
  });
});

describe('SlotPicker', () => {
  it('renders dates and times as labelled radio groups in the firm timezone', async () => {
    availability.mockResolvedValue({
      date: '2030-01-07',
      timezone: 'America/Chicago',
      slotMinutes: 30,
      businessDay: true,
      slots: [
        { startAt: '2030-01-07T15:00:00Z', endAt: '2030-01-07T15:30:00Z' },
        { startAt: '2030-01-07T15:30:00Z', endAt: '2030-01-07T16:00:00Z' },
      ],
    });
    const onDateChange = vi.fn();
    const onSlotChange = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <SlotPicker config={config} date={null} slot={null} onDateChange={onDateChange} onSlotChange={onSlotChange} />,
    );

    const dates = screen.getByRole('group', { name: '1. Choose a date' });
    expect(within(dates).getAllByRole('radio')).toHaveLength(5);
    expect(screen.getByRole('group', { name: '2. Choose a time' })).toBeDisabled();

    await user.click(within(dates).getByRole('radio', { name: /Monday, January 7, 2030/ }));
    expect(onDateChange).toHaveBeenCalledWith('2030-01-07');

    rerender(<SlotPicker config={config} date="2030-01-07" slot={null} onDateChange={onDateChange} onSlotChange={onSlotChange} />);
    const nine = await screen.findByRole('radio', { name: '9:00 AM' });
    expect(screen.getByRole('radio', { name: '9:30 AM' })).toBeInTheDocument();
    expect(availability).toHaveBeenCalledWith('2030-01-07', expect.any(AbortSignal));

    await user.click(nine);
    expect(onSlotChange).toHaveBeenCalledWith({ startAt: '2030-01-07T15:00:00Z', endAt: '2030-01-07T15:30:00Z' });
  });

  it('says so when a date has no times left', async () => {
    availability.mockResolvedValue({ date: '2030-01-08', timezone: 'America/Chicago', slotMinutes: 30, businessDay: true, slots: [] });
    render(<SlotPicker config={config} date="2030-01-08" slot={null} onDateChange={() => {}} onSlotChange={() => {}} />);
    expect(await screen.findByText(/No times left on Tuesday, January 8, 2030/)).toBeInTheDocument();
  });
});
