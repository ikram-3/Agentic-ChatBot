import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import { BookOpen, Clock, ChevronRight, Loader2 } from 'lucide-react';
import './Programs.css';

const DEPT_COLORS = {
  'Computer Science': '#6366f1',
  'Management Sciences': '#f59e0b',
  'English': '#10b981',
  'Pharmacy': '#ef4444',
  'Natural Sciences': '#3b82f6',
  'default': '#8b5cf6',
};

const Programs = () => {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/programs')
      .then(res => setPrograms(res.data))
      .catch(() => setPrograms([
        { name: 'BS Computer Science', department: 'Computer Science', duration: '4 Years', description: 'Comprehensive study of computing fundamentals, algorithms, and software engineering.' },
        { name: 'BS Software Engineering', department: 'Computer Science', duration: '4 Years', description: 'Focus on software development lifecycle, system design, and agile practices.' },
        { name: 'BBA', department: 'Management Sciences', duration: '4 Years', description: 'Business administration covering finance, marketing, and organizational management.' },
        { name: 'BS English', department: 'English', duration: '4 Years', description: 'Linguistic theory, literature, and communication skills for diverse professional contexts.' },
      ]))
      .finally(() => setLoading(false));
  }, []);

  const getColor = (dept) => DEPT_COLORS[dept] || DEPT_COLORS['default'];

  const grouped = programs.reduce((acc, prog) => {
    const d = prog.department;
    if (!acc[d]) acc[d] = [];
    acc[d].push(prog);
    return acc;
  }, {});

  return (
    <div className="programs-page animate-fade-in">
      <div className="page-hero">
        <div className="page-hero-inner">
          <h1>Academic Programs</h1>
          <p>Discover the range of undergraduate and postgraduate programs offered at the University of Swat.</p>
        </div>
        <Link to="/admissions" className="hero-cta-link">Apply Now →</Link>
      </div>

      {loading ? (
        <div className="loading-state">
          <Loader2 size={28} className="animate-spin" />
          <span>Loading programs…</span>
        </div>
      ) : (
        <div className="programs-content">
          {Object.entries(grouped).map(([dept, progs]) => (
            <div key={dept} className="dept-group">
              <div className="dept-header">
                <div className="dept-dot" style={{ background: getColor(dept) }} />
                <h2>{dept}</h2>
              </div>
              <div className="programs-grid">
                {progs.map((prog, i) => (
                  <div key={i} className="program-card">
                    <div className="prog-accent" style={{ background: getColor(prog.department) }} />
                    <div className="prog-content">
                      <h3>{prog.name}</h3>
                      {prog.description && <p className="prog-desc">{prog.description}</p>}
                      <div className="prog-meta">
                        <span className="prog-duration"><Clock size={13} /> {prog.duration}</span>
                        <Link to="/admissions" className="prog-apply">Apply <ChevronRight size={13} /></Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Programs;
