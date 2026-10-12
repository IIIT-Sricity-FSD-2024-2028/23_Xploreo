import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  BookingSummaryCard,
  TravellerDetailsForm,
  PaymentMethodSelector,
  CheckoutStepper,
  DEFAULT_CHECKOUT_STEPS,
  DEFAULT_PAYMENT_METHODS,
} from '../src/components/checkout/index.js';
import TravellerBookingsList from '../src/pages/Traveller/TravellerBookingsList.jsx';
import BookingDetailsView from '../src/pages/Traveller/BookingDetailsView.jsx';
import TravellerTripsList from '../src/pages/Traveller/TravellerTripsList.jsx';
import TravellerTripDetailsView from '../src/pages/Traveller/TravellerTripDetailsView.jsx';
import TripLiveTrackerWidget from '../src/pages/Traveller/TripLiveTrackerWidget.jsx';

export function renderSummaryCard(props) {
  return renderToStaticMarkup(React.createElement(BookingSummaryCard, props));
}

export function renderTravellerForm(props) {
  return renderToStaticMarkup(React.createElement(TravellerDetailsForm, props));
}

export function renderPaymentSelector(props) {
  return renderToStaticMarkup(React.createElement(PaymentMethodSelector, props));
}

export function renderStepper(props) {
  return renderToStaticMarkup(React.createElement(CheckoutStepper, props));
}

export function renderBookingsList(props) {
  return renderToStaticMarkup(React.createElement(TravellerBookingsList, props));
}

export function renderBookingDetails(props) {
  return renderToStaticMarkup(React.createElement(BookingDetailsView, props));
}

export function renderTripsList(props) {
  return renderToStaticMarkup(React.createElement(TravellerTripsList, props));
}

export function renderTripDetails(props) {
  return renderToStaticMarkup(React.createElement(TravellerTripDetailsView, props));
}

export function renderTrackerWidget(props) {
  return renderToStaticMarkup(React.createElement(TripLiveTrackerWidget, props));
}

export { DEFAULT_CHECKOUT_STEPS, DEFAULT_PAYMENT_METHODS };
