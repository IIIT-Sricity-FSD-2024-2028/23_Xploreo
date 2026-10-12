import { useState } from 'react';
import { FieldError } from './Feedback.jsx';

const MAX_BYTES = 5 * 1024 * 1024;

// The old "Experience Image" drop zone (same markup and class names). The chosen image is read in the
// browser and handed to onChange as a data URL, exactly as the old page did.
// TODO(M3): replace with the shared <ImageUploader /> once it lands (M3 owns it).
export default function ImageDropzone({ id, value, onChange }) {
  const [error, setError] = useState('');

  function handleFile(file) {
    setError('');
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Only image files are allowed.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Image must be 5MB or smaller.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => onChange(String(event.target.result));
    reader.readAsDataURL(file);
  }

  return (
    <div className="field-group field-group-full">
      <span>Experience Image</span>
      <label
        className="hotel-file-dropzone"
        htmlFor={id}
        style={{ marginTop: 8 }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          handleFile(event.dataTransfer.files?.[0]);
        }}
      >
        <div className="dropzone-content" style={{ opacity: value ? 0 : 1 }}>
          <span className="dropzone-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#64748b' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </span>
          <span className="dropzone-text">Click or drag &amp; drop to upload</span>
          <span className="dropzone-subtext">SVG, PNG, JPG or GIF (max. 5MB)</span>
        </div>
        <input id={id} type="file" accept="image/*" className="hidden-file-input" style={{ display: 'none' }} onChange={(event) => handleFile(event.target.files?.[0])} />
        {value ? <img src={value} alt="Experience preview" style={{ display: 'block', maxWidth: '100%', maxHeight: 200, borderRadius: 8, margin: '0 auto' }} /> : null}
        {value ? <div className="change-image-btn">Change Image</div> : null}
      </label>
      <FieldError>{error}</FieldError>
    </div>
  );
}
