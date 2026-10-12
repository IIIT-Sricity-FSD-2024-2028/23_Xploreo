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
import TravellerReviewsList from '../src/pages/Traveller/TravellerReviewsList.jsx';
import ReviewSubmissionForm from '../src/pages/Traveller/ReviewSubmissionForm.jsx';
import TravellerReviewsPage from '../src/pages/Traveller/TravellerReviewsPage.jsx';

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

export function renderReviewsList(props) {
  return renderToStaticMarkup(React.createElement(TravellerReviewsList, props));
}

export function renderReviewForm(props) {
  return renderToStaticMarkup(React.createElement(ReviewSubmissionForm, props));
}

export function renderReviewsPage(props) {
  return renderToStaticMarkup(React.createElement(TravellerReviewsPage, props));
}

export { DEFAULT_CHECKOUT_STEPS, DEFAULT_PAYMENT_METHODS };
