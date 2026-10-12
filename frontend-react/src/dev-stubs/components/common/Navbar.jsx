// TEMP-STUB for components/common/Navbar: a faithful port of the ORIGINAL navbar
// (front_end/components/layout/navbar.js + navlinks.js + profile.js), styled by the original shared.css.
//
// Props:
//   links      [{ to, label, icon }]   icon = file name in public/ui (e.g. 'tours.svg')
//   userName   string                  shown next to the avatar
//   avatar     string (optional)       defaults to the original placeholder avatar
//   profileTo  string                  "Profile" menu item
//   supportTo  string (optional)       "Support" menu item (omitted when there is no such page yet)
//   onLogout   () => void
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { NAVBAR_CSS } from '@/legacy/styles.js';
import { usePageStyles } from '@/lib/usePageStyles.js';
import { ui } from '@/lib/assets.js';

export function Navbar({ links = [], userName = 'User', avatar, profileTo, supportTo, onLogout }) {
  // The navbar needs shared.css on every page, whatever the page itself loads.
  usePageStyles(NAVBAR_CSS);
  const [open, setOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const close = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) setOpen(false);
    };
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  const toggleWithKeyboard = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setOpen((value) => !value);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <div className="logo">
          <img src={ui('logo.png')} alt="Xploreo Logo" />
          <span>Xploreo</span>
        </div>
      </div>

      <div className="navbar-center">
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <img src={ui(link.icon)} className="nav-icon" alt="" />
            {link.label}
          </NavLink>
        ))}
      </div>

      <div className="navbar-right">
        <div className="notification" />
        <div
          className="profile"
          ref={profileRef}
          role="button"
          tabIndex={0}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          onKeyDown={toggleWithKeyboard}
        >
          <span className="profile-name">{userName}</span>
          <img src={avatar || ui('profile.png')} alt="user" className="profile-img" />
          <div className={`profile-dropdown${open ? '' : ' hidden'}`} id="profile-dropdown" role="menu">
            <Link className="dropdown-item" to={profileTo} role="menuitem">
              <img src={ui('user.svg')} className="dropdown-icon" alt="" />
              <span>Profile</span>
            </Link>
            {supportTo ? (
              <Link className="dropdown-item" to={supportTo} role="menuitem">
                <img src={ui('support.svg')} className="dropdown-icon" alt="" />
                <span>Support</span>
              </Link>
            ) : null}
            <hr className="dropdown-divider" />
            <div className="dropdown-item logout-item" role="menuitem" tabIndex={0} onClick={onLogout} onKeyDown={(e) => e.key === 'Enter' && onLogout?.()}>
              <img src={ui('logout.svg')} className="dropdown-icon" alt="" />
              <span>Logout</span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
