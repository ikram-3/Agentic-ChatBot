import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';

const Header = () => {
  const location = useLocation();

  return (
    <header className="header">
      <div className="container header-container">
        <Link to="/" className="logo">
          <GraduationCap size={32} color="var(--primary)" />
          <span>UoS Assistant</span>
        </Link>
        <nav className="nav-links">
          <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>Home</Link>
          <Link to="/programs" className={`nav-link ${location.pathname === '/programs' ? 'active' : ''}`}>Programs</Link>
          <Link to="/contact" className={`nav-link ${location.pathname === '/contact' ? 'active' : ''}`}>Map & Contact</Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;
