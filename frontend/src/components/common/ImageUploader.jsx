import { useId } from 'react';
import { uploadMultiple, uploadSingle } from '@/services/upload.api.js';
import { usePortalState } from '@/store/hotel/useHotelState.js';

const DEFAULT_HELPER = 'JPEG, PNG, GIF or WebP (max. 5MB)';
const DEFAULT_ACCEPT = 'image/jpeg,image/png,image/gif,image/webp';
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Shared ImageUploader component for single or multiple image uploads.
 * Works seamlessly in both mock and real mode via upload.api.js.
 *
 * @param {Object} props
 * @param {string} [props.id] - Element ID
 * @param {string|string[]} [props.value] - Current image URL(s)
 * @param {function(string|string[]):void} props.onChange - Change handler receiving new URL(s)
 * @param {function(File, function(number):void):Promise<{url: string}>} [props.uploadImage] - Single image uploader
 * @param {boolean} [props.multiple=false] - Whether to allow multiple file uploads
 * @param {number} [props.maxFiles=5] - Maximum number of files if multiple is true
 * @param {string} [props.label] - Field label text
 * @param {string} [props.helperText] - Caption text below dropzone
 * @param {string} [props.accept] - Allowed MIME types / accept attribute
 * @param {boolean} [props.disabled=false] - Disable inputs
 * @param {string} [props.className] - Additional wrapper class
 * @param {function(string):void} [props.onError] - Optional error notification callback
 */
export default function ImageUploader({
  id: customId,
  value,
  onChange,
  uploadImage = uploadSingle,
  hotelPartner = false,
  multiple = false,
  maxFiles = 5,
  label,
  helperText = DEFAULT_HELPER,
  accept = DEFAULT_ACCEPT,
  disabled = false,
  className = '',
  onError,
}) {
  const generatedId = useId();
  const inputId = customId || `image-uploader-${generatedId}`;

  const [isDragging, setIsDragging] = usePortalState(false, hotelPartner);
  const [uploading, setUploading] = usePortalState(false, hotelPartner);
  const [progress, setProgress] = usePortalState(0, hotelPartner);
  const [errorMessage, setErrorMessage] = usePortalState('', hotelPartner);

  // Normalize single/multiple values
  const currentImages = multiple
    ? Array.isArray(value)
      ? value
      : value
      ? [value]
      : []
    : typeof value === 'string' && value
    ? [value]
    : [];

  const hasImage = currentImages.length > 0;

  async function handleFiles(fileList) {
    if (!fileList || fileList.length === 0 || disabled || uploading) return;

    setErrorMessage('');
    const files = Array.from(fileList);

    // Multiple upload limit check (convenience check; server also enforces)
    if (multiple && currentImages.length + files.length > maxFiles) {
      const err = `Maximum ${maxFiles} images allowed.`;
      setErrorMessage(err);
      onError?.(err);
      return;
    }

    // Client-side quick convenience check: warn about 5MB limit
    const oversized = files.find((f) => f.size > MAX_BYTES);
    if (oversized) {
      const err = `File "${oversized.name}" exceeds 5MB size limit.`;
      setErrorMessage(err);
      onError?.(err);
      return;
    }

    setUploading(true);
    setProgress(5);

    try {
      if (multiple) {
        const results = await uploadMultiple(files, (p) => setProgress(p));
        const newUrls = results.map((r) => r.url).filter(Boolean);
        const combined = [...currentImages, ...newUrls];
        onChange?.(combined);
      } else {
        const file = files[0];
        const res = await uploadImage(file, setProgress);
        onChange?.(res.url);
      }
      setErrorMessage('');
    } catch (err) {
      const msg = err?.message || 'Upload failed. Please try again.';
      setErrorMessage(msg);
      onError?.(msg);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer?.files) {
      handleFiles(event.dataTransfer.files);
    }
  }

  function handleDragOver(event) {
    event.preventDefault();
    if (!disabled && !uploading) {
      setIsDragging(true);
    }
  }

  function handleDragLeave(event) {
    event.preventDefault();
    setIsDragging(false);
  }

  function handleRemoveImage(indexToRemove, e) {
    e?.preventDefault();
    e?.stopPropagation();
    if (disabled || uploading) return;

    if (multiple) {
      const updated = currentImages.filter((_, i) => i !== indexToRemove);
      onChange?.(updated);
    } else {
      onChange?.('');
    }
    setErrorMessage('');
  }

  return (
    <div className={`image-uploader-wrapper ${className}`} style={{ width: '100%', marginBottom: 16 }}>
      {label ? (
        <label
          htmlFor={inputId}
          style={{
            display: 'block',
            fontWeight: 600,
            fontSize: '14px',
            marginBottom: '6px',
            color: '#1e293b',
          }}
        >
          {label}
        </label>
      ) : null}

      {/* Main Dropzone / Card Area */}
      <div
        className={`hotel-file-dropzone ${isDragging ? 'dragover' : ''} ${uploading ? 'uploading' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: isDragging ? '2px dashed #2563eb' : '2px dashed #cbd5e1',
          backgroundColor: isDragging ? '#eff6ff' : '#f8fafc',
          borderRadius: 12,
          padding: 16,
          textAlign: 'center',
          position: 'relative',
          cursor: disabled || uploading ? 'not-allowed' : 'pointer',
          transition: 'border-color 0.2s, background-color 0.2s',
          minHeight: hasImage && !multiple ? 180 : 140,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <input
          id={inputId}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled || uploading}
          className="hidden-file-input"
          style={{ display: 'none' }}
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = ''; // Reset input to allow re-uploading same file if desired
          }}
        />

        {/* State 1: Upload in progress */}
        {uploading ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
              maxWidth: 280,
              padding: '12px 0',
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                border: '3px solid #e2e8f0',
                borderTopColor: '#2563eb',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                marginBottom: 12,
              }}
            />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 8 }}>
              Uploading... {progress}%
            </span>
            <div
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin="0"
              aria-valuemax="100"
              style={{
                width: '100%',
                height: 8,
                backgroundColor: '#e2e8f0',
                borderRadius: 4,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  backgroundColor: '#2563eb',
                  transition: 'width 0.2s ease',
                }}
              />
            </div>
          </div>
        ) : hasImage && !multiple ? (
          /* State 2: Single image preview */
          <div style={{ position: 'relative', width: '100%', maxHeight: 220, display: 'flex', justifyContent: 'center' }}>
            <img
              src={currentImages[0]}
              alt="Uploaded preview"
              style={{
                maxWidth: '100%',
                maxHeight: 200,
                borderRadius: 8,
                objectFit: 'contain',
                display: 'block',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 8,
                display: 'flex',
                gap: 8,
                zIndex: 2,
              }}
            >
              <label
                htmlFor={inputId}
                className="change-image-btn"
                style={{
                  background: 'rgba(15, 23, 42, 0.75)',
                  color: '#ffffff',
                  padding: '6px 14px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  backdropFilter: 'blur(4px)',
                }}
              >
                Change Image
              </label>
              <button
                type="button"
                onClick={(e) => handleRemoveImage(0, e)}
                style={{
                  background: 'rgba(239, 68, 68, 0.85)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  backdropFilter: 'blur(4px)',
                }}
                title="Remove image"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          /* State 3: Idle dropzone prompt (or multiple drop area) */
          <label
            htmlFor={inputId}
            className="dropzone-content"
            style={{
              cursor: disabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              width: '100%',
            }}
          >
            <span className="dropzone-icon" style={{ color: '#64748b' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </span>
            <span className="dropzone-text" style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>
              {isDragging ? 'Drop images here' : 'Click or drag & drop to upload'}
            </span>
            <span className="dropzone-subtext" style={{ fontSize: 12, color: '#94a3b8' }}>
              {helperText}
            </span>
          </label>
        )}
      </div>

      {/* State 4: Multiple images preview grid */}
      {multiple && hasImage && !uploading ? (
        <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {currentImages.map((imgUrl, idx) => (
            <div
              key={`${imgUrl}-${idx}`}
              style={{
                position: 'relative',
                width: 80,
                height: 80,
                borderRadius: 8,
                overflow: 'hidden',
                border: '1px solid #e2e8f0',
              }}
            >
              <img
                src={imgUrl}
                alt={`Uploaded ${idx + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <button
                type="button"
                onClick={(e) => handleRemoveImage(idx, e)}
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.9)',
                  color: '#fff',
                  border: 'none',
                  fontSize: 12,
                  lineHeight: '20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  padding: 0,
                }}
                title="Remove photo"
              >
                ×
              </button>
            </div>
          ))}
          {currentImages.length < maxFiles ? (
            <label
              htmlFor={inputId}
              style={{
                width: 80,
                height: 80,
                borderRadius: 8,
                border: '2px dashed #cbd5e1',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b',
                fontSize: 12,
                backgroundColor: '#f8fafc',
              }}
            >
              <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
              <span>Add</span>
            </label>
          ) : null}
        </div>
      ) : null}

      {/* State 5: Clear error message display */}
      {errorMessage ? (
        <div
          role="alert"
          style={{
            marginTop: 8,
            padding: '8px 12px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 6,
            color: '#dc2626',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage('')}
            style={{
              background: 'none',
              border: 'none',
              color: '#dc2626',
              cursor: 'pointer',
              fontWeight: 'bold',
              padding: '0 4px',
            }}
          >
            ✕
          </button>
        </div>
      ) : null}
    </div>
  );
}
