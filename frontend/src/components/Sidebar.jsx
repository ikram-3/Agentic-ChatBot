import { Link, useLocation } from 'react-router-dom';
import { MessageSquare, BookOpen, MapPin, GraduationCap, Sun, Moon, ClipboardList, ShieldCheck } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import './Sidebar.css';

const Sidebar = () => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { path: '/',           icon: <MessageSquare size={18} />, label: 'AI Assistant' },
    { path: '/admissions', icon: <ClipboardList size={18} />, label: 'Admissions' },
    { path: '/programs',   icon: <BookOpen size={18} />,      label: 'Programs' },
    { path: '/verify',     icon: <ShieldCheck size={18} />,   label: 'Verification' },
    { path: '/contact',    icon: <MapPin size={18} />,        label: 'Location' },
  ];

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon">
          <GraduationCap size={22} />
        </div>
        <div className="logo-text">
          <span className="logo-title">UoS</span>
          <span className="logo-sub">AI Assistant</span>
        </div>
      </div>

      <div className="sidebar-divider" />

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            {item.icon}
            <span>{item.label}</span>
            {location.pathname === item.path && <div className="nav-indicator" />}
          </Link>
        ))}
      </nav>

      <div className="sidebar-spacer" />

      {/* Theme Toggle */}
      <div className="sidebar-footer">
        <button className="theme-toggle-btn" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        <div className="sidebar-divider" />

        <div className="user-profile">
          <div className="avatar">
            <GraduationCap size={16} />
          </div>
          <div className="user-info">
            <span className="user-name">UoS Student</span>
            <span className="user-role">University of Swat</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
