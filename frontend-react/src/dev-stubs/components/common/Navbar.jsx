// TEMP-STUB for components/common/Navbar. Props: { brand, links: [{ to, label }], userLabel }
import { NavLink } from 'react-router-dom';

export function Navbar({ brand, links = [], userLabel }) {
  return (
    <header className="ui-navbar">
      <span className="ui-navbar-brand">{brand}</span>
      <nav className="ui-navbar-links" aria-label="Main">
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} className={({ isActive }) => (isActive ? 'active' : undefined)}>
            {link.label}
          </NavLink>
        ))}
      </nav>
      {userLabel ? <span className="ui-navbar-user">{userLabel}</span> : null}
    </header>
  );
}
