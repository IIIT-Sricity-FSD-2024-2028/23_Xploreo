export function getUserStylesHTML() {
    return `
        <style>
            .stat-card { background: #fff; padding: 24px; border-radius: 20px; border: 1px solid #edf2f7; position: relative; }
            .card-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; background: #f7fafc; }
            .stat-label { color: #4a5568; font-size: 14px; margin: 0; font-weight: 500; }
            .stat-value { font-size: 32px; font-weight: 700; margin: 8px 0; color: #1a202c; }
            .stat-subtext { font-size: 12px; color: #a0aec0; margin: 0; display: flex; align-items: center; gap: 5px; }
            .trend-up { color: #1e8e3e; font-weight: 600; position: absolute; top: 24px; right: 24px; background: #e6f4ea; padding: 4px 8px; border-radius: 10px; font-size: 11px; }
            .badge-urgent { color: #e53e3e; font-weight: 800; position: absolute; top: 24px; right: 24px; background: #fff5f5; padding: 4px 8px; border-radius: 6px; border: 1px solid #feb2b2; font-size: 10px; }
            .stars { color: #38a169; position: absolute; top: 24px; right: 24px; font-size: 14px; }
            .user-row:hover, .partner-row:hover { background: #f8fafc; }
            .filter-btn { padding: 6px 14px; border-radius: 20px; border: 1px solid #edf2f7; background: #f8fafc; color: #718096; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
            .filter-btn.active { background: #ebf8ff; color: #3182ce; border-color: #90cdf4; }
            .filter-btn:hover:not(.active) { background: #edf2f7; }
            .remove-btn { background: transparent; border: none; color: #e53e3e; cursor: pointer; padding: 6px; border-radius: 6px; transition: background 0.2s; display: flex; align-items: center; justify-content: center; }
            .remove-btn:hover { background: #fff5f5; }
            .role-badge { padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; background: #edf2f7; color: #4a5568; }
            .status-select { border: none; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; cursor: pointer; outline: none; transition: all 0.2s; appearance: none; text-align: center; }
            .status-select:hover { filter: brightness(0.95); }
        </style>
    `;
}