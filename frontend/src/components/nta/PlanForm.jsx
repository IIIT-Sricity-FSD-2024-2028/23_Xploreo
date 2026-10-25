import { useState, useMemo, useRef, useEffect } from 'react';
import { createPlan, updatePlan } from '../../services/plans.api.js';
import { uploadSingle } from '../../services/upload.api.js';
import { getHotelsByDestination } from '../../mocks/plans/hotels.fixture.js';
import ItineraryBuilder from './ItineraryBuilder.jsx';
import './nta.css';

const DEFAULT_STATUS_OPTIONS = [
  { value: 'available', label: 'Available (Active)' },
  { value: 'draft', label: 'Draft (Unpublished)' },
  { value: 'sold_out', label: 'Sold Out' },
  { value: 'unavailable', label: 'Unavailable' },
];

const SUPPORTED_DESTINATIONS = ['Jaipur', 'Goa', 'Delhi', 'Mumbai', 'Kerala'];

/**
 * Package Form with Location-Based Hotel & Experience Selection and Dynamic Pricing.
 * Strictly adheres to Xploreo product requirements:
 * - Origin City completely removed from UI.
 * - One partner hotel per package from location catalog.
 * - Location-specific experiences selection.
 * - Dynamic pricing: Hotel Subtotal + Experiences Subtotal = Suggested Price,
 *   with an editable final price override.
 * - Zero flights. Zero transport.
 */
export default function PlanForm({
  initialPlan = null,
  onSubmitSuccess,
  onCancel,
  currentUser = null,
  className = '',
}) {
  const isEditMode = Boolean(initialPlan && initialPlan.id);

  // Region locking logic
  const userRole = (currentUser?.role || '').toLowerCase();
  const isNTA = userRole.includes('nontech') || userRole === 'nta';
  const assignedRegion = currentUser?.region || '';
  const isRegionLocked = Boolean(isNTA && assignedRegion);

  const initialDestination = isRegionLocked
    ? assignedRegion
    : initialPlan?.destination || (assignedRegion || 'Jaipur');

  const [title, setTitle] = useState(initialPlan?.title || '');
  const [description, setDescription] = useState(initialPlan?.description || '');
  const [destination, setDestination] = useState(initialDestination);
  const [durationNights, setDurationNights] = useState(
    initialPlan?.durationNights !== undefined
      ? initialPlan.durationNights
      : (initialPlan?.duration || 3)
  );

  // Available partner hotels for the selected destination
  const availableHotels = useMemo(() => {
    return getHotelsByDestination(destination);
  }, [destination]);

  // Selected partner hotel record
  const [selectedHotel, setSelectedHotel] = useState(() => {
    const existingHotel = initialPlan?.itinerary?.day1?.hotel;
    if (existingHotel) {
      // Find matching in catalog or adopt existing
      const inCat = availableHotels.find(
        (h) => h.hotelId === existingHotel.hotelId || h.name.toLowerCase() === existingHotel.name.toLowerCase()
      );
      if (inCat) return inCat;
      return {
        id: existingHotel.hotelId || 'hotel-custom',
        hotelId: existingHotel.hotelId || 'HP-PARTNER',
        name: existingHotel.name,
        destination,
        stars: existingHotel.stars || initialPlan?.hotelStars || 4,
        pricePerNight: existingHotel.pricePerNight || 3500,
        roomType: existingHotel.roomType || 'Standard Room',
      };
    }
    return availableHotels[0] || null;
  });

  // Multi-day itinerary state
  const [itinerary, setItinerary] = useState(() => {
    if (initialPlan?.itinerary) {
      return {
        day1: {
          hotel: initialPlan.itinerary.day1?.hotel || {
            name: selectedHotel?.name || '',
            hotelId: selectedHotel?.hotelId || '',
            roomType: selectedHotel?.roomType || 'Standard Room',
            checkInDate: '',
            checkOutDate: '',
            stars: selectedHotel?.stars || 4,
            pricePerNight: selectedHotel?.pricePerNight || 0,
          },
        },
        days: Array.isArray(initialPlan.itinerary.days) ? initialPlan.itinerary.days : [],
      };
    }
    return {
      day1: {
        hotel: {
          name: selectedHotel?.name || '',
          hotelId: selectedHotel?.hotelId || '',
          roomType: selectedHotel?.roomType || 'Standard Room',
          checkInDate: '',
          checkOutDate: '',
          stars: selectedHotel?.stars || 4,
          pricePerNight: selectedHotel?.pricePerNight || 0,
        },
      },
      days: [],
    };
  });

  // --- DYNAMIC PRICING ENGINE ---
  // Hotel Subtotal = selected hotel's price per night * durationNights
  const hotelPricePerNight = Number(selectedHotel?.pricePerNight || itinerary?.day1?.hotel?.pricePerNight || 0);
  const nightsCount = Number(durationNights) || 1;
  const hotelSubtotal = hotelPricePerNight * nightsCount;

  // Experience Subtotal = sum of selected experiences' per-person prices across all days
  const experienceSubtotal = useMemo(() => {
    let sum = 0;
    const days = Array.isArray(itinerary?.days) ? itinerary.days : [];
    days.forEach((dayGroup) => {
      const exps = Array.isArray(dayGroup?.experiences) ? dayGroup.experiences : [];
      exps.forEach((exp) => {
        sum += Number(exp.pricePerPerson || 0);
      });
    });
    return sum;
  }, [itinerary]);

  // Suggested Price
  const suggestedPrice = hotelSubtotal + experienceSubtotal;

  // Final Price with Manual Override tracking
  const [finalPrice, setFinalPrice] = useState(
    initialPlan?.pricePerPerson !== undefined
      ? initialPlan.pricePerPerson
      : (suggestedPrice || 15000)
  );
  const [hasManualPriceOverride, setHasManualPriceOverride] = useState(
    Boolean(initialPlan && initialPlan.pricePerPerson !== suggestedPrice)
  );

  // Recalculate suggested price automatically unless user has manually overridden
  const prevSuggestedRef = useState(suggestedPrice);
  if (!hasManualPriceOverride && suggestedPrice !== prevSuggestedRef[0]) {
    prevSuggestedRef[1](suggestedPrice);
    if (suggestedPrice > 0) {
      setFinalPrice(suggestedPrice);
    }
  }

  const [tagsInput, setTagsInput] = useState(
    Array.isArray(initialPlan?.tags) ? initialPlan.tags.join(', ') : ''
  );
  const [image, setImage] = useState(initialPlan?.image || '');
  const [imageFileName, setImageFileName] = useState(() => {
    if (initialPlan?.image) {
      try {
        const urlObj = new URL(initialPlan.image);
        const name = urlObj.pathname.split('/').pop();
        return name || 'Current Cover Image';
      } catch {
        return 'Current Cover Image';
      }
    }
    return '';
  });
  const [imageFileSize, setImageFileSize] = useState('');
  const [fileError, setFileError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  const objectUrlRef = useRef(null);

  // Clean up any generated object URLs on component unmount
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  const [status, setStatus] = useState(initialPlan?.status || 'available');

  // Form interaction state
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [regionSwitchNotice, setRegionSwitchNotice] = useState(null);

  // File Picker Handler
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    setFileError(null);

    if (!file) return;

    // Validate mime type: Accept image files only
    if (!file.type || !file.type.startsWith('image/')) {
      setFileError('Please select a valid image file (PNG, JPG, WebP, GIF).');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validate size: Reject files larger than 5 MB (5 * 1024 * 1024 bytes)
    const MAX_SIZE_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setFileError(`File size (${sizeMb} MB) exceeds the 5 MB limit. Please select a smaller image.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Format human-readable file size
    const sizeStr = file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
      : `${Math.round(file.size / 1024)} KB`;

    setSelectedFile(file);
    setImageFileName(file.name);
    setImageFileSize(sizeStr);

    // Revoke previous object URL if any
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    // Read as Data URL to ensure in-memory persistence in preview session
    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result);
    };
    reader.onerror = () => {
      // Fallback to object URL if FileReader fails
      const objUrl = URL.createObjectURL(file);
      objectUrlRef.current = objUrl;
      setImage(objUrl);
    };
    reader.readAsDataURL(file);
  };

  // Remove selected image
  const handleRemoveImage = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setSelectedFile(null);
    setImage('');
    setImageFileName('');
    setImageFileSize('');
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // When Destination Changes: Clean incompatible hotel and experience selections
  const handleDestinationChange = (newDest) => {
    if (newDest === destination) return;
    setDestination(newDest);
    setRegionSwitchNotice(`Destination changed to ${newDest}. Previous hotel and experience selections have been reset to match ${newDest}.`);

    const newHotels = getHotelsByDestination(newDest);
    const firstHotel = newHotels[0] || null;
    setSelectedHotel(firstHotel);

    // Reset itinerary to match new destination
    setItinerary({
      day1: {
        hotel: firstHotel
          ? {
              name: firstHotel.name,
              hotelId: firstHotel.hotelId,
              roomType: firstHotel.roomType,
              checkInDate: '',
              checkOutDate: '',
              stars: firstHotel.stars,
              pricePerNight: firstHotel.pricePerNight,
            }
          : { name: '', roomType: 'Standard Room', stars: 4 },
      },
      days: [],
    });
    setHasManualPriceOverride(false);
  };

  // When Partner Hotel Selection Changes
  const handleHotelSelect = (hotelId) => {
    const hotel = availableHotels.find((h) => h.id === hotelId || h.hotelId === hotelId);
    if (!hotel) return;
    setSelectedHotel(hotel);

    setItinerary((prev) => ({
      ...prev,
      day1: {
        ...prev.day1,
        hotel: {
          ...prev.day1?.hotel,
          name: hotel.name,
          hotelId: hotel.hotelId,
          roomType: hotel.roomType,
          stars: hotel.stars,
          pricePerNight: hotel.pricePerNight,
        },
      },
    }));
  };

  // Re-sync if initialPlan prop changes (storing information from previous renders)
  const [prevPlan, setPrevPlan] = useState(initialPlan);
  if (initialPlan !== prevPlan) {
    setPrevPlan(initialPlan);
    if (initialPlan) {
      setTitle(initialPlan.title || '');
      setDescription(initialPlan.description || '');
      const planDest = isRegionLocked ? assignedRegion : (initialPlan.destination || 'Jaipur');
      setDestination(planDest);
      setDurationNights(
        initialPlan.durationNights !== undefined
          ? initialPlan.durationNights
          : (initialPlan.duration || 3)
      );
      setFinalPrice(
        initialPlan.pricePerPerson !== undefined
          ? initialPlan.pricePerPerson
          : (initialPlan.price || 0)
      );
      setTagsInput(Array.isArray(initialPlan.tags) ? initialPlan.tags.join(', ') : '');
      setImage(initialPlan.image || '');
      if (initialPlan.image) {
        try {
          const urlObj = new URL(initialPlan.image);
          const name = urlObj.pathname.split('/').pop();
          setImageFileName(name || 'Current Cover Image');
        } catch {
          setImageFileName('Current Cover Image');
        }
      } else {
        setImageFileName('');
      }
      setImageFileSize('');
      setFileError(null);
      setStatus(initialPlan.status || 'available');

      if (initialPlan.itinerary) {
        setItinerary(initialPlan.itinerary);
        const existingH = initialPlan.itinerary.day1?.hotel;
        if (existingH) {
          const match = getHotelsByDestination(planDest).find(
            (h) => h.hotelId === existingH.hotelId || h.name.toLowerCase() === existingH.name.toLowerCase()
          );
          setSelectedHotel(match || existingH);
        }
      }
    }
  }

  // Validation
  const errors = {};
  if (touched.title || isSubmitting) {
    const trimmed = title.trim();
    if (!trimmed) {
      errors.title = 'Package title is required.';
    } else if (trimmed.length < 3) {
      errors.title = 'Package title must be at least 3 characters.';
    } else if (trimmed.length > 120) {
      errors.title = 'Package title cannot exceed 120 characters.';
    }
  }

  if (touched.description || isSubmitting) {
    const trimmed = description.trim();
    if (!trimmed) {
      errors.description = 'Package description is required.';
    } else if (trimmed.length < 10) {
      errors.description = 'Description must be at least 10 characters.';
    }
  }

  if (touched.destination || isSubmitting) {
    if (!destination.trim()) {
      errors.destination = 'Destination city is required.';
    }
  }

  if (touched.durationNights || isSubmitting) {
    const nights = Number(durationNights);
    if (isNaN(nights) || nights < 1) {
      errors.durationNights = 'Duration must be at least 1 night.';
    }
  }

  if (touched.finalPrice || isSubmitting) {
    const priceNum = Number(finalPrice);
    if (finalPrice === '' || isNaN(priceNum) || priceNum < 0) {
      errors.finalPrice = 'Final price must be a non-negative number.';
    }
  }

  if (isSubmitting) {
    if (!selectedHotel && !itinerary?.day1?.hotel?.name) {
      errors.hotel = 'Please select a Partner Hotel for this package.';
    }
  }

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError(null);
    setSuccessMessage(null);

    setTouched({
      title: true,
      description: true,
      destination: true,
      durationNights: true,
      finalPrice: true,
      hotel: true,
    });

    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();
    const trimmedDest = destination.trim();
    const nights = Number(durationNights);
    const price = Number(finalPrice);
    const hotelObj = selectedHotel || itinerary?.day1?.hotel;

    if (
      !trimmedTitle ||
      trimmedTitle.length < 3 ||
      !trimmedDesc ||
      trimmedDesc.length < 10 ||
      !trimmedDest ||
      isNaN(nights) ||
      nights < 1 ||
      isNaN(price) ||
      price < 0 ||
      !hotelObj?.name
    ) {
      setApiError('Please resolve all validation errors before saving the package.');
      return;
    }

    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    setIsSubmitting(true);
    try {
      let finalImageUrl = image.trim();
      if (selectedFile) {
        try {
          const uploadRes = await uploadSingle(selectedFile);
          if (uploadRes?.url) {
            finalImageUrl = uploadRes.url;
            setImage(uploadRes.url);
          }
        } catch (uploadErr) {
          setFileError(uploadErr.message || 'Image upload failed. Please try again.');
          throw new Error(`Failed to upload package cover image: ${uploadErr.message || 'Unknown error'}`);
        }
      }

      const payload = {
        title: trimmedTitle,
        description: trimmedDesc,
        destination: trimmedDest,
        // Origin city removed from UI, defaulted to destination for backend compatibility
        originCity: trimmedDest,
        durationNights: nights,
        pricePerPerson: price,
        hotelStars: Number(hotelObj.stars || 4),
        image: finalImageUrl,
        tags: parsedTags,
        status,
        itinerary: {
          ...itinerary,
          day1: {
            ...itinerary.day1,
            hotel: {
              ...itinerary.day1?.hotel,
              name: hotelObj.name,
              hotelId: hotelObj.hotelId || hotelObj.id || 'HP-PARTNER',
              roomType: hotelObj.roomType || 'Standard Room',
              stars: Number(hotelObj.stars || 4),
              pricePerNight: Number(hotelObj.pricePerNight || 0),
            },
          },
        },
      };

      let savedPlan;
      if (isEditMode) {
        savedPlan = await updatePlan(initialPlan.id, payload, currentUser);
        setSuccessMessage(`Package "${savedPlan.title}" successfully updated!`);
      } else {
        savedPlan = await createPlan(payload, currentUser);
        setSuccessMessage(`Package "${savedPlan.title}" successfully created!`);
      }

      if (onSubmitSuccess) {
        onSubmitSuccess(savedPlan);
      }
    } catch (err) {
      setApiError(err.message || 'Failed to save travel package.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`nta-form-card ${className}`}>
      <div className="nta-form-header">
        <h2 className="nta-form-title">
          {isEditMode ? 'Edit Travel Package' : 'Create New Package'}
        </h2>
        <p className="nta-form-subtitle">
          Select one partner hotel and curated local experiences with formula-based dynamic pricing.
        </p>
      </div>

      {apiError && (
        <div className="nta-form-alert-error" role="alert">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{apiError}</span>
        </div>
      )}

      {regionSwitchNotice && (
        <div className="nta-region-info-banner" role="status" style={{ marginBottom: '16px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span>{regionSwitchNotice}</span>
        </div>
      )}

      {successMessage && (
        <div className="nta-form-alert-success" role="status">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{successMessage}</span>
        </div>
      )}

      <form className="nta-form" onSubmit={handleSubmit} noValidate>
        {/* Core Package Details Section */}
        <div className="nta-form-section">
          <h3 className="nta-form-section-title">Package Overview</h3>

          <div className="nta-form-group">
            <label className="nta-form-label" htmlFor="plan-title">
              <span>Package Title <span style={{ color: '#ef4444' }}>*</span></span>
              <span className="nta-form-hint">e.g. Royal Heritage Jaipur Getaway</span>
            </label>
            <input
              id="plan-title"
              type="text"
              className={`nta-form-input ${errors.title ? 'nta-form-input-error' : ''}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => handleBlur('title')}
              placeholder="Enter descriptive package name"
              disabled={isSubmitting}
              maxLength={120}
              required
            />
            {errors.title && <p className="nta-form-error-text">{errors.title}</p>}
          </div>

          <div className="nta-form-group">
            <label className="nta-form-label" htmlFor="plan-description">
              <span>Description <span style={{ color: '#ef4444' }}>*</span></span>
              <span className="nta-form-hint">Overview of the stay & experiences</span>
            </label>
            <textarea
              id="plan-description"
              className={`nta-form-textarea ${errors.description ? 'nta-form-input-error' : ''}`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => handleBlur('description')}
              placeholder="Highlight the hotel comfort, heritage, cultural immersion, and guided experiences..."
              disabled={isSubmitting}
              rows={3}
              required
            />
            {errors.description && <p className="nta-form-error-text">{errors.description}</p>}
          </div>

          <div className="nta-form-grid-2col">
            <div className="nta-form-group">
              <label className="nta-form-label" htmlFor="plan-destination">
                <span>Destination <span style={{ color: '#ef4444' }}>*</span></span>
                {isRegionLocked && (
                  <span className="nta-region-lock-badge">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    Locked to Assigned Region
                  </span>
                )}
              </label>

              {isRegionLocked ? (
                <input
                  id="plan-destination"
                  type="text"
                  className="nta-form-input"
                  value={destination}
                  disabled
                  readOnly
                />
              ) : (
                <select
                  id="plan-destination"
                  className="nta-form-select"
                  value={destination}
                  onChange={(e) => handleDestinationChange(e.target.value)}
                  disabled={isSubmitting}
                >
                  {SUPPORTED_DESTINATIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              )}
              {errors.destination && <p className="nta-form-error-text">{errors.destination}</p>}
            </div>

            <div className="nta-form-group">
              <label className="nta-form-label" htmlFor="plan-duration">
                <span>Duration (Nights) <span style={{ color: '#ef4444' }}>*</span></span>
                <span className="nta-form-hint">Total nights of partner hotel stay</span>
              </label>
              <input
                id="plan-duration"
                type="number"
                min="1"
                max="30"
                className={`nta-form-input ${errors.durationNights ? 'nta-form-input-error' : ''}`}
                value={durationNights}
                onChange={(e) => setDurationNights(Math.max(1, parseInt(e.target.value, 10) || 1))}
                onBlur={() => handleBlur('durationNights')}
                disabled={isSubmitting}
                required
              />
              {errors.durationNights && <p className="nta-form-error-text">{errors.durationNights}</p>}
            </div>
          </div>
        </div>

        {/* 🏨 ONE PARTNER HOTEL PER PACKAGE SECTION */}
        <div className="nta-form-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="nta-form-section-title">
              🏨 Partner Hotel Selection ({destination})
            </h3>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#1d4ed8', background: '#eff6ff', padding: '3px 8px', borderRadius: '4px' }}>
              One Hotel Per Package
            </span>
          </div>

          <div className="nta-form-group">
            <label className="nta-form-label" htmlFor="plan-hotel-select">
              <span>Select Partner Hotel <span style={{ color: '#ef4444' }}>*</span></span>
              <span className="nta-form-hint">Filtered strictly by {destination}</span>
            </label>

            {availableHotels.length > 0 ? (
              <select
                id="plan-hotel-select"
                className="nta-form-select"
                value={selectedHotel?.id || selectedHotel?.hotelId || ''}
                onChange={(e) => handleHotelSelect(e.target.value)}
                disabled={isSubmitting}
              >
                {availableHotels.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} — {h.stars}★ ({h.roomType}) • ₹{Number(h.pricePerNight).toLocaleString('en-IN')}/night
                  </option>
                ))}
              </select>
            ) : (
              <div style={{ padding: '14px', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', color: '#b91c1c', fontSize: '13px' }}>
                No partner hotels are available for {destination} in the preview catalog.
              </div>
            )}
            {errors.hotel && <p className="nta-form-error-text">{errors.hotel}</p>}
          </div>

          {selectedHotel && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <strong style={{ fontSize: '14px', color: '#0f172a' }}>{selectedHotel.name}</strong>
                <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                  {selectedHotel.roomType} • {selectedHotel.description}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#2563eb' }}>
                  ₹{Number(selectedHotel.pricePerNight).toLocaleString('en-IN')}
                </span>
                <span style={{ fontSize: '11px', color: '#64748b' }}> / night</span>
              </div>
            </div>
          )}
        </div>

        {/* 💰 DYNAMIC PRICING BREAKDOWN SECTION */}
        <div className="nta-form-section">
          <h3 className="nta-form-section-title">💰 Dynamic Package Pricing</h3>

          <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px' }}>
            <div className="nta-form-grid-3col" style={{ marginBottom: '14px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
                  Hotel Subtotal
                </span>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
                  ₹{hotelSubtotal.toLocaleString('en-IN')}
                </div>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  ₹{hotelPricePerNight.toLocaleString('en-IN')} × {nightsCount} nights
                </span>
              </div>

              <div>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
                  Experiences Subtotal
                </span>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>
                  ₹{experienceSubtotal.toLocaleString('en-IN')}
                </div>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  Sum of all scheduled activities
                </span>
              </div>

              <div>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#2563eb', textTransform: 'uppercase' }}>
                  Suggested Price
                </span>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#2563eb', marginTop: '2px' }}>
                  ₹{suggestedPrice.toLocaleString('en-IN')}
                </div>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  Formula: Hotel + Experiences
                </span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ flex: 1, minWidth: '220px' }}>
                <label className="nta-form-label" htmlFor="plan-finalprice" style={{ marginBottom: '4px' }}>
                  <span>Final Package Price / Person (₹) <span style={{ color: '#ef4444' }}>*</span></span>
                  {hasManualPriceOverride && (
                    <span style={{ color: '#d97706', fontSize: '11px', fontWeight: '600' }}>
                      (Manually Overridden)
                    </span>
                  )}
                </label>
                <input
                  id="plan-finalprice"
                  type="number"
                  min="0"
                  step="100"
                  className={`nta-form-input ${errors.finalPrice ? 'nta-form-input-error' : ''}`}
                  value={finalPrice}
                  onChange={(e) => {
                    setFinalPrice(e.target.value);
                    setHasManualPriceOverride(true);
                  }}
                  onBlur={() => handleBlur('finalPrice')}
                  disabled={isSubmitting}
                  required
                />
                {errors.finalPrice && <p className="nta-form-error-text">{errors.finalPrice}</p>}
              </div>

              {hasManualPriceOverride && (
                <button
                  type="button"
                  className="nta-form-btn-secondary"
                  style={{ alignSelf: 'flex-end', padding: '9px 14px', fontSize: '12px' }}
                  onClick={() => {
                    setFinalPrice(suggestedPrice);
                    setHasManualPriceOverride(false);
                  }}
                  title="Restore formula-calculated suggested price"
                >
                  ↻ Reset to Suggested Price
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Media and Metadata Section */}
        <div className="nta-form-section">
          <h3 className="nta-form-section-title">Media & Tags</h3>

          <div className="nta-form-grid-2col">
            <div className="nta-form-group">
              <label className="nta-form-label" htmlFor="plan-image-file">
                <span>Package Cover Image (Optional)</span>
                <span className="nta-form-hint">JPG, PNG, WebP up to 5 MB</span>
              </label>

              <div className="nta-file-picker-container">
                <input
                  ref={fileInputRef}
                  id="plan-image-file"
                  type="file"
                  accept="image/*"
                  className="nta-file-input-native"
                  onChange={handleFileChange}
                  disabled={isSubmitting}
                />

                {image ? (
                  <div className="nta-image-preview-card">
                    <div className="nta-image-preview-thumb-wrap">
                      <img
                        src={image}
                        alt="Package cover preview"
                        className="nta-image-preview-thumb"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="nta-image-preview-meta">
                      <div className="nta-image-preview-name" title={imageFileName || 'Package cover image'}>
                        {imageFileName || 'Package cover image'}
                      </div>
                      <div className="nta-image-preview-sub">
                        {imageFileSize && <span>{imageFileSize}</span>}
                        {isEditMode && initialPlan?.image === image && !imageFileSize && (
                          <span className="nta-image-preview-badge">Current Image</span>
                        )}
                      </div>
                    </div>
                    <div className="nta-image-preview-actions">
                      <button
                        type="button"
                        className="nta-image-btn-change"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isSubmitting}
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        className="nta-image-btn-remove"
                        onClick={handleRemoveImage}
                        disabled={isSubmitting}
                        title="Remove cover image"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="nta-file-dropzone"
                    onClick={() => fileInputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        fileInputRef.current?.click();
                      }
                    }}
                  >
                    <svg
                      className="nta-file-dropzone-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <div className="nta-file-dropzone-prompt">
                      <span>Choose an image file</span> or drag and drop
                    </div>
                    <div className="nta-file-dropzone-hint">PNG, JPG, WebP, GIF up to 5 MB</div>
                  </div>
                )}

                {fileError && (
                  <div className="nta-file-error-msg" role="alert">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{fileError}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="nta-form-group">
              <label className="nta-form-label" htmlFor="plan-status">
                <span>Publication Status</span>
              </label>
              <select
                id="plan-status"
                className="nta-form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={isSubmitting}
              >
                {DEFAULT_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="nta-form-group">
            <label className="nta-form-label" htmlFor="plan-tags">
              <span>Tags (Comma Separated)</span>
              <span className="nta-form-hint">e.g. Heritage, Luxury, Palace, Culinary</span>
            </label>
            <input
              id="plan-tags"
              type="text"
              className="nta-form-input"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Heritage, Culinary, Palace, Guided"
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Multi-Day Itinerary Builder Section */}
        <div className="nta-form-section">
          <h3 className="nta-form-section-title">Multi-Day Itinerary</h3>
          <ItineraryBuilder
            itinerary={itinerary}
            onChange={setItinerary}
            durationNights={Number(durationNights) || 1}
            destination={destination}
            selectedHotel={selectedHotel}
            disabled={isSubmitting}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
          {onCancel && (
            <button
              type="button"
              className="nta-form-btn-secondary"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            className="nta-form-btn-submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <svg
                  style={{ animation: 'spin 1s linear infinite', marginRight: '8px' }}
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" strokeDasharray="30" strokeDashoffset="10" />
                </svg>
                Saving Package...
              </>
            ) : isEditMode ? (
              'Update Package'
            ) : (
              'Create Package'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
