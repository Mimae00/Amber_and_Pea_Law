import { useEffect, useId, useState } from 'react';
import { api } from '../../api/client';
import type { Availability, BookingConfig, Slot } from '../../api/types';
import { businessDates, formatDayShort, formatTime, zoneLabel } from '../../lib/datetime';

interface SlotPickerProps {
  config: BookingConfig;
  date: string | null;
  slot: Slot | null;
  onDateChange: (date: string) => void;
  onSlotChange: (slot: Slot) => void;
  /** Increment to force a reload of the slots (e.g. after a 409 conflict). */
  reloadKey?: number;
}

type SlotState = { status: 'idle' } | { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: Availability };

/**
 * Date and time selection built from native radio groups: arrow keys move within a group,
 * and screen readers announce the group label and position.
 */
export function SlotPicker({ config, date, slot, onDateChange, onSlotChange, reloadKey = 0 }: SlotPickerProps) {
  const uid = useId();
  const dates = businessDates(config.minDate, config.maxDate, config.businessDays);
  const [state, setState] = useState<SlotState>({ status: 'idle' });

  useEffect(() => {
    if (!date) return;
    const controller = new AbortController();
    setState({ status: 'loading' });
    api
      .availability(date, controller.signal)
      .then((data) => setState({ status: 'ready', data }))
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: 'error' });
      });
    return () => controller.abort();
  }, [date, reloadKey]);

  const tz = zoneLabel(config.timezone);

  return (
    <div className="slot-picker">
      <fieldset className="slot-picker__group">
        <legend>1. Choose a date</legend>
        <div className="date-list" role="presentation">
          {dates.map((d) => {
            const f = formatDayShort(d);
            return (
              <label key={d} className="date-option">
                <input
                  type="radio"
                  name={`${uid}-date`}
                  value={d}
                  checked={date === d}
                  onChange={() => onDateChange(d)}
                  className="visually-hidden"
                />
                <span className="date-option__box" aria-hidden="true">
                  <span className="date-option__weekday">{f.weekday}</span>
                  <span className="date-option__day">{f.day}</span>
                  <span className="date-option__month">{f.month}</span>
                </span>
                <span className="visually-hidden">{f.full}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="slot-picker__group" disabled={!date}>
        <legend>2. Choose a time</legend>
        <p className="field__hint">
          {config.slotMinutes}-minute free consultation. Times are shown in {tz}.
        </p>
        <div aria-live="polite">
          {!date && <p className="status-message">Pick a date to see available times.</p>}
          {state.status === 'loading' && (
            <p className="status-message" role="status">
              Loading available times…
            </p>
          )}
          {state.status === 'error' && (
            <p className="alert alert--error" role="alert">
              We couldn’t load times for this date. Please try again or call us.
            </p>
          )}
          {state.status === 'ready' && date && state.data.slots.length === 0 && (
            <p className="status-message">No times left on {formatDayShort(date).full}. Please pick another date.</p>
          )}
        </div>
        {state.status === 'ready' && state.data.slots.length > 0 && (
          <div className="time-list">
            {state.data.slots.map((s) => (
              <label key={s.startAt} className="time-option">
                <input
                  type="radio"
                  name={`${uid}-time`}
                  value={s.startAt}
                  checked={slot?.startAt === s.startAt}
                  onChange={() => onSlotChange(s)}
                  className="visually-hidden"
                />
                <span className="time-option__box">{formatTime(s.startAt, config.timezone)}</span>
              </label>
            ))}
          </div>
        )}
      </fieldset>
    </div>
  );
}
