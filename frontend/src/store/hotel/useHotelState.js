import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectSessionVersion } from '../sessionSlice.js';
import { clearField, setField } from './uiSlice.js';

// Each page field has the lifetime of its mounted component.
export function useHotelState(initialValue, enabled = true) {
  const key = useId();
  const version = useSelector(selectSessionVersion);
  const dispatch = useDispatch();
  const active = useRef(false);
  const value = useSelector((state) => enabled && Object.hasOwn(state.hotel.ui, key) ? state.hotel.ui[key] : initialValue);
  useEffect(() => {
    if (!enabled) return undefined;
    active.current = true;
    return () => {
      active.current = false;
      dispatch(clearField(key));
    };
  }, [dispatch, enabled, key]);

  const setValue = useCallback((next) => dispatch((send, getState) => {
    const state = getState();
    if (!active.current || selectSessionVersion(state) !== version) return;
    const previous = Object.hasOwn(state.hotel.ui, key) ? state.hotel.ui[key] : initialValue;
    send(setField({ key, value: typeof next === 'function' ? next(previous) : next }));
  }), [dispatch, initialValue, key, version]);

  return [value, setValue];
}

// Shared widgets keep their original state handling outside the hotel portal.
export function usePortalState(initialValue, hotelPartner) {
  const local = useState(initialValue);
  const hotel = useHotelState(initialValue, hotelPartner);
  return hotelPartner ? hotel : local;
}
