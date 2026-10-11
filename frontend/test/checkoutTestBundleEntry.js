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

export { DEFAULT_CHECKOUT_STEPS, DEFAULT_PAYMENT_METHODS };
