import { useState, useMemo, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  clearPlanMutation,
  createNtaPlan,
  fetchNtaExperiences,
  fetchNtaHotelRooms,
  fetchNtaHotels,
  selectNtaHotelRooms,
  selectNtaInventoryError,
  selectNtaInventoryHotels,
  selectNtaInventoryHotelsStatus,
  selectNtaRegionExperiences,
  selectNtaRegionHotels,
  updateNtaPlan,
} from '../../store/nta/index.js';
import { uploadSingle } from '../../services/upload.api.js';
import { addDaysIso, isPlansMockMode } from '../../services/plans.api.js';
import { getHotelsByDestination } from '../../mocks/plans/hotels.fixture.js';
import ItineraryBuilder from './ItineraryBuilder.jsx';
import './nta.css';

const norm = (value) => String(value || '').trim().toLowerCase();
const dayOf = (value) => /^(\d{4}-\d{2}-\d{2})/.exec(String(value || ''))?.[1] || '';

/** The form's itinerary draft from a saved plan: day1.hotel references plus experience days. */
function toFormItinerary(saved) {
  const hotel = saved?.day1?.hotel;
  return {
    day1: {
      hotel: {
        hotelId: hotel?.hotelId || '',
        name: hotel?.name || '',
        roomType: hotel?.roomType || '',
        checkInDate: dayOf(hotel?.checkInDate),
        checkOutDate: dayOf(hotel?.checkOutDate),
      },
    },
    days: Array.isArray(saved?.days) ? saved.days : [],
  };
}

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

  // Saving goes through Redux (state.nta.plans); the form draft below stays local.
  const dispatch = useDispatch();
  // Reset the store's create/update status when the form closes.
  useEffect(() => () => dispatch(clearPlanMutation()), [dispatch]);

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
  // Partner inventory comes from Redux (state.nta.inventory); fixture hotels only in mock mode.
  const isMock = isPlansMockMode();
  useEffect(() => {
    if (isMock) return;
    dispatch(fetchNtaHotels());
    dispatch(fetchNtaExperiences());
  }, [dispatch, isMock]);
  const allHotels = useSelector(selectNtaInventoryHotels);
  const hotelsStatus = useSelector(selectNtaInventoryHotelsStatus);
  const inventoryError = useSelector(selectNtaInventoryError);
  const regionHotels = useSelector((state) => selectNtaRegionHotels(state, destination));
  const regionExperiences = useSelector((state) => selectNtaRegionExperiences(state, destination));

  const destinationOptions = useMemo(() => {
    const set = new Set(SUPPORTED_DESTINATIONS);
    if (assignedRegion) set.add(assignedRegion);
    if (initialPlan?.destination) set.add(initialPlan.destination);
    allHotels.forEach((h) => {
      const city = String(h?.city || '').trim();
      if (city) set.add(city);
    });
    return Array.from(set);
  }, [assignedRegion, initialPlan, allHotels]);

  // Active partner hotels in the destination — the only ones the backend accepts for it.
  const availableHotels = useMemo(() => {
    if (isMock) return getHotelsByDestination(destination);
    return regionHotels.map((h) => ({
      id: h.id,
      hotelId: h.id,
      name: h.name,
      destination: h.city,
      stars: Number(h.stars) || 0,
      pricePerNight: Number(h.pricePerNight) || 0,
      description: h.description,
    }));
  }, [isMock, destination, regionHotels]);

  // Multi-day itinerary state: the hotel reference (id, name, room type, dates) and experience days.
  const [itinerary, setItinerary] = useState(() => toFormItinerary(initialPlan?.itinerary));
  const hotelDraft = itinerary.day1.hotel;

  // The selected hotel is the one the itinerary references, if it is still an active hotel here.
  const selectedHotel = availableHotels.find((h) => h.hotelId === hotelDraft.hotelId) || null;
  const staleHotel = Boolean(hotelDraft.hotelId && !selectedHotel && (isMock || hotelsStatus === 'succeeded'));

  // Room types of the selected hotel (GET /hotels/:id/rooms via Redux).
  useEffect(() => {
    if (!isMock && selectedHotel?.hotelId) dispatch(fetchNtaHotelRooms({ hotelId: selectedHotel.hotelId }));
  }, [dispatch, isMock, selectedHotel?.hotelId]);
  const roomsEntry = useSelector((state) => selectNtaHotelRooms(state, selectedHotel?.hotelId));
  const roomOptions = useMemo(() => {
    if (isMock) {
      return selectedHotel?.roomType
        ? [{ id: `${selectedHotel.hotelId}-room`, type: selectedHotel.roomType, pricePerNight: selectedHotel.pricePerNight }]
        : [];
    }
    return roomsEntry.items.filter((r) => r.status !== 'inactive');
  }, [isMock, selectedHotel, roomsEntry.items]);
  const selectedRoom = roomOptions.find((r) => norm(r.type) === norm(hotelDraft.roomType)) || null;
  const staleRoomType = Boolean(
    hotelDraft.roomType && selectedHotel && !selectedRoom && (isMock || roomsEntry.status === 'succeeded'),
  );

  // --- DYNAMIC PRICING ENGINE ---
  // Hotel Subtotal = selected room type's price per night (else the hotel's) * durationNights
  const hotelPricePerNight = Number(selectedRoom?.pricePerNight ?? selectedHotel?.pricePerNight ?? 0);
  const nightsCount = Number(durationNights) || 1;
  const hotelSubtotal = hotelPricePerNight * nightsCount;

  // Experience Subtotal = sum of selected experiences' per-person prices across all days
  // (saved packages do not store prices, so the catalog price is used for them).
  const experienceSubtotal = useMemo(() => {
    const priceOf = new Map(regionExperiences.map((e) => [e.id, Number(e.price) || 0]));
    let sum = 0;
    const days = Array.isArray(itinerary?.days) ? itinerary.days : [];
    days.forEach((dayGroup) => {
      const exps = Array.isArray(dayGroup?.experiences) ? dayGroup.experiences : [];
      exps.forEach((exp) => {
        sum += Number(exp.pricePerPerson ?? priceOf.get(exp.experienceId) ?? 0);
      });
    });
    return sum;
  }, [itinerary, regionExperiences]);

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

    // Hotels and experiences belong to one destination: clear them, keep the dates.
    setItinerary((prev) => ({
      day1: {
        hotel: {
          hotelId: '',
          name: '',
          roomType: '',
          checkInDate: prev.day1.hotel.checkInDate,
          checkOutDate: prev.day1.hotel.checkOutDate,
        },
      },
      days: [],
    }));
    setHasManualPriceOverride(false);
  };

  // When Partner Hotel Selection Changes: the room type must be chosen again for the new hotel.
  const handleHotelSelect = (hotelId) => {
    const hotel = availableHotels.find((h) => h.id === hotelId || h.hotelId === hotelId);
    setItinerary((prev) => ({
      ...prev,
      day1: {
        ...prev.day1,
        hotel: {
          ...prev.day1.hotel,
          hotelId: hotel?.hotelId || '',
          name: hotel?.name || '',
          roomType: '',
        },
      },
    }));
  };

  // Room type of the package stay, from the selected hotel's room types.
  const handleRoomTypeSelect = (roomType) => {
    setItinerary((prev) => ({
      ...prev,
      day1: { ...prev.day1, hotel: { ...prev.day1.hotel, roomType } },
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
        setItinerary(toFormItinerary(initialPlan.itinerary));
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

  // Package inventory and dates — the same rules the backend enforces on save.
  const todayIso = new Date().toISOString().slice(0, 10);
  const packageNights = Math.max(1, Number(durationNights) || 1);
  const inventoryErrors = {};
  if (!selectedHotel) {
    inventoryErrors.hotel = staleHotel
      ? `The package's hotel "${hotelDraft.name || hotelDraft.hotelId}" is no longer an active ${destination} partner hotel. Please select another.`
      : 'Please select a Partner Hotel for this package.';
  } else if (!selectedRoom) {
    inventoryErrors.roomType = staleRoomType
      ? `Room type "${hotelDraft.roomType}" is not offered by ${selectedHotel.name}. Please select one of its room types.`
      : 'Please select a room type.';
  }
  const { checkInDate, checkOutDate } = hotelDraft;
  if (!checkInDate || !checkOutDate) {
    inventoryErrors.dates = 'Please set both the hotel check-in and check-out dates.';
  } else if (checkInDate < todayIso) {
    inventoryErrors.dates = 'Check-in cannot be in the past.';
  } else if (checkOutDate <= checkInDate) {
    inventoryErrors.dates = 'Check-out must be after check-in.';
  } else if (addDaysIso(checkInDate, packageNights) !== checkOutDate) {
    inventoryErrors.dates = `Check-out must be ${packageNights} night(s) after check-in (${addDaysIso(checkInDate, packageNights)}) to match the package duration.`;
  }
  if (!isMock) {
    const experienceProblems = [];
    const catalogById = new Map(regionExperiences.map((e) => [e.id, e]));
    (itinerary.days || []).forEach((dayGroup) => {
      (dayGroup.experiences || []).forEach((exp) => {
        const catalogExp = catalogById.get(exp.experienceId);
        const date = checkInDate ? addDaysIso(checkInDate, dayGroup.dayNumber - 1) : null;
        if (dayGroup.dayNumber > packageNights + 1) {
          experienceProblems.push(`"${exp.title}" is on day ${dayGroup.dayNumber}, after the package ends.`);
        } else if (!catalogExp) {
          experienceProblems.push(`"${exp.title}" is not an available ${destination} experience.`);
        } else if (date && Array.isArray(catalogExp.slots) && catalogExp.slots.length > 0) {
          const slot = catalogExp.slots.find((s) => dayOf(s.date) === date);
          if (!slot || !slot.available) experienceProblems.push(`"${exp.title}" has no open session on ${date}.`);
        }
      });
    });
    if (experienceProblems.length) inventoryErrors.experiences = experienceProblems.join(' ');
  }
  if (touched.hotel || isSubmitting) Object.assign(errors, inventoryErrors);

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
      Object.keys(inventoryErrors).length > 0
    ) {
      const firstInventoryError = Object.values(inventoryErrors)[0];
      setApiError(firstInventoryError || 'Please resolve all validation errors before saving the package.');
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
        hotelStars: Number(selectedHotel.stars) || initialPlan?.hotelStars || 3,
        image: finalImageUrl,
        tags: parsedTags,
        status,
        // plans.api.js#buildBackendItinerary turns this into the backend's StructuredItinerary.
        itinerary: {
          day1: {
            hotel: {
              hotelId: selectedHotel.hotelId,
              name: selectedHotel.name,
              roomType: selectedRoom.type,
              checkInDate,
              checkOutDate,
            },
          },
          days: itinerary.days,
        },
      };

      let savedPlan;
      // The thunks add/replace the plan in the Redux collection from the server's response;
      // unwrap() throws on failure so the catch below keeps the draft and shows the real error.
      if (isEditMode) {
        savedPlan = await dispatch(updateNtaPlan({ id: initialPlan.id, data: payload, session: currentUser })).unwrap();
        setSuccessMessage(`Package "${savedPlan.title}" successfully updated!`);
      } else {
        savedPlan = await dispatch(createNtaPlan({ data: payload, session: currentUser })).unwrap();
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
                  {destinationOptions.map((d) => (
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

            {!isMock && hotelsStatus !== 'succeeded' && hotelsStatus !== 'failed' ? (
              <div style={{ padding: '14px', fontSize: '13px', color: '#64748b' }}>Loading {destination} partner hotels…</div>
            ) : availableHotels.length > 0 ? (
              <select
                id="plan-hotel-select"
                className="nta-form-select"
                value={selectedHotel?.hotelId || ''}
                onChange={(e) => handleHotelSelect(e.target.value)}
                onBlur={() => handleBlur('hotel')}
                disabled={isSubmitting}
              >
                <option value="">Select a partner hotel…</option>
                {availableHotels.map((h) => (
                  <option key={h.id} value={h.hotelId}>
                    {h.name} — {h.stars}★ • from ₹{Number(h.pricePerNight).toLocaleString('en-IN')}/night
                  </option>
                ))}
              </select>
            ) : (
              <div style={{ padding: '14px', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', color: '#b91c1c', fontSize: '13px' }}>
                {inventoryError
                  ? `Partner hotels could not be loaded: ${inventoryError.message}`
                  : `No active partner hotels are available in ${destination}.`}
              </div>
            )}
            {errors.hotel && <p className="nta-form-error-text">{errors.hotel}</p>}
          </div>

          {selectedHotel && (
            <div className="nta-form-group">
              <label className="nta-form-label" htmlFor="plan-room-type">
                <span>Room Type <span style={{ color: '#ef4444' }}>*</span></span>
                <span className="nta-form-hint">From {selectedHotel.name}&apos;s room types</span>
              </label>
              {!isMock && roomsEntry.status === 'loading' ? (
                <div style={{ fontSize: '13px', color: '#64748b' }}>Loading room types…</div>
              ) : roomOptions.length > 0 ? (
                <select
                  id="plan-room-type"
                  className="nta-form-select"
                  value={selectedRoom?.type || ''}
                  onChange={(e) => handleRoomTypeSelect(e.target.value)}
                  disabled={isSubmitting}
                >
                  <option value="">Select a room type…</option>
                  {roomOptions.map((r) => (
                    <option key={r.id} value={r.type}>
                      {r.type}
                      {r.maxOccupancy ? ` — up to ${r.maxOccupancy} guests/room` : ''}
                      {r.availableRooms != null ? `, ${r.availableRooms} available` : ''}
                      {r.pricePerNight ? ` • ₹${Number(r.pricePerNight).toLocaleString('en-IN')}/night` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <div style={{ fontSize: '13px', color: '#b91c1c' }}>
                  {roomsEntry.error?.message || `${selectedHotel.name} has no bookable room types.`}
                </div>
              )}
              {errors.roomType && <p className="nta-form-error-text">{errors.roomType}</p>}
            </div>
          )}

          {selectedHotel && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <strong style={{ fontSize: '14px', color: '#0f172a' }}>{selectedHotel.name}</strong>
                <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                  {selectedRoom?.type || 'Room type not selected'}{selectedHotel.description ? ` • ${selectedHotel.description}` : ''}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#2563eb' }}>
                  ₹{hotelPricePerNight.toLocaleString('en-IN')}
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
            catalog={regionExperiences}
            disabled={isSubmitting}
          />
          {errors.dates && <p className="nta-form-error-text">{errors.dates}</p>}
          {errors.experiences && <p className="nta-form-error-text">{errors.experiences}</p>}
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
