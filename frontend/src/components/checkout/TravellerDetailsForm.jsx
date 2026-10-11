import { useState } from 'react';
import { validateTravellerForm } from '../../utils/checkoutUtils.js';
import './checkout.css';

/**
 * TravellerDetailsForm
 * Collects and validates traveller contact information.
 * Fully controlled or prefillable via props.
 * Does not make external network requests or implement custom auth.
 */
export default function TravellerDetailsForm({
  initialValues = {},
  onSubmit,
  isSubmitting = false,
  submitLabel = 'Proceed to Payment',
}) {
  const [formData, setFormData] = useState({
    firstName: initialValues.firstName || '',
    lastName: initialValues.lastName || '',
    email: initialValues.email || '',
    phone: initialValues.phone || '',
    specialRequests: initialValues.specialRequests || '',
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...formData, [name]: value };
    setFormData(updated);

    // Live validation if already touched
    if (touched[name]) {
      const validation = validateTravellerForm(updated);
      setErrors((prev) => ({
        ...prev,
        [name]: validation.errors[name] || '',
      }));
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const validation = validateTravellerForm(formData);
    setErrors((prev) => ({
      ...prev,
      [name]: validation.errors[name] || '',
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validation = validateTravellerForm(formData);
    setErrors(validation.errors);
    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    });

    if (validation.isValid && onSubmit) {
      onSubmit(formData);
    }
  };

  return (
    <div className="trav-form-container" data-testid="traveller-details-form-container">
      <div className="trav-form-header">
        <h3 className="trav-form-title">Lead Traveller Details</h3>
        <p className="trav-form-description">
          Please enter your contact details. Booking confirmation and tickets will be sent to this email.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="trav-form-row">
          <div className="trav-form-field">
            <label htmlFor="trav-first-name" className="trav-form-label">
              First Name<span className="trav-required-star" aria-hidden="true">*</span>
            </label>
            <input
              id="trav-first-name"
              name="firstName"
              type="text"
              autoComplete="given-name"
              required
              disabled={isSubmitting}
              className={`trav-input ${errors.firstName ? 'has-error' : ''}`}
              placeholder="e.g. Rahul"
              value={formData.firstName}
              onChange={handleChange}
              onBlur={handleBlur}
              aria-invalid={!!errors.firstName}
              aria-describedby={errors.firstName ? 'trav-first-name-error' : undefined}
            />
            {errors.firstName && (
              <span id="trav-first-name-error" className="trav-error-text" role="alert">
                {errors.firstName}
              </span>
            )}
          </div>

          <div className="trav-form-field">
            <label htmlFor="trav-last-name" className="trav-form-label">
              Last Name<span className="trav-required-star" aria-hidden="true">*</span>
            </label>
            <input
              id="trav-last-name"
              name="lastName"
              type="text"
              autoComplete="family-name"
              required
              disabled={isSubmitting}
              className={`trav-input ${errors.lastName ? 'has-error' : ''}`}
              placeholder="e.g. Sharma"
              value={formData.lastName}
              onChange={handleChange}
              onBlur={handleBlur}
              aria-invalid={!!errors.lastName}
              aria-describedby={errors.lastName ? 'trav-last-name-error' : undefined}
            />
            {errors.lastName && (
              <span id="trav-last-name-error" className="trav-error-text" role="alert">
                {errors.lastName}
              </span>
            )}
          </div>
        </div>

        <div className="trav-form-row">
          <div className="trav-form-field">
            <label htmlFor="trav-email" className="trav-form-label">
              Email Address<span className="trav-required-star" aria-hidden="true">*</span>
            </label>
            <input
              id="trav-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              disabled={isSubmitting}
              className={`trav-input ${errors.email ? 'has-error' : ''}`}
              placeholder="name@example.com"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'trav-email-error' : undefined}
            />
            {errors.email && (
              <span id="trav-email-error" className="trav-error-text" role="alert">
                {errors.email}
              </span>
            )}
          </div>

          <div className="trav-form-field">
            <label htmlFor="trav-phone" className="trav-form-label">
              Phone Number<span className="trav-required-star" aria-hidden="true">*</span>
            </label>
            <input
              id="trav-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              required
              disabled={isSubmitting}
              className={`trav-input ${errors.phone ? 'has-error' : ''}`}
              placeholder="+91 98765 43210"
              value={formData.phone}
              onChange={handleChange}
              onBlur={handleBlur}
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? 'trav-phone-error' : 'trav-phone-hint'}
            />
            {errors.phone ? (
              <span id="trav-phone-error" className="trav-error-text" role="alert">
                {errors.phone}
              </span>
            ) : (
              <span id="trav-phone-hint" className="trav-helper-text">
                For booking SMS updates & tour guide coordination.
              </span>
            )}
          </div>
        </div>

        <div className="trav-form-field">
          <label htmlFor="trav-special-requests" className="trav-form-label">
            Special Requests (Optional)
          </label>
          <textarea
            id="trav-special-requests"
            name="specialRequests"
            rows="3"
            disabled={isSubmitting}
            className="trav-textarea"
            placeholder="Dietary requirements, accessibility assistance, or notes for the host..."
            value={formData.specialRequests}
            onChange={handleChange}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="trav-btn-submit"
          data-testid="traveller-submit-btn"
        >
          {isSubmitting ? (
            <span>Processing...</span>
          ) : (
            <span>{submitLabel}</span>
          )}
        </button>
      </form>
    </div>
  );
}
