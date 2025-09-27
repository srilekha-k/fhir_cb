import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './navbar.css';

export default function Navbar() {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem('token');
    navigate('/');
  }

  return (
    <nav className="app-navbar" role="navigation" aria-label="Main">
      <div className="nav-wrap">
        <ul className="nav-list" role="menubar" aria-label="Primary">
          <li><Link className="nav-link" to="/home" role="menuitem">Home</Link></li>

          <li className="has-submenu" role="none">
            <span className="nav-link" role="menuitem" aria-haspopup="true" aria-expanded="false">Patient ▾</span>
            <div className="submenu" role="menu" aria-label="Patient menu">
              <Link to="/patient/get" role="menuitem">Get Patient</Link>
              <Link to="/patient/add" role="menuitem">Add Patient</Link>
              <Link to="/patient/modify" role="menuitem">Modify Patient</Link>
            </div>
          </li>

          <li className="has-submenu" role="none">
            <span className="nav-link" role="menuitem" aria-haspopup="true" aria-expanded="false">Observation ▾</span>
            <div className="submenu" role="menu" aria-label="Observation menu">
              <Link to="/observation/get" role="menuitem">Get Observation</Link>
              <Link to="/observation/add" role="menuitem">Add Observation</Link>
              <Link to="/observation/modify" role="menuitem">Modify Observation</Link>
            </div>
          </li>

          <li className="logout-item">
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
}
