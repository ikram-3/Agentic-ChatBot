import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { ClipboardList, Calendar, CheckCircle, AlertCircle, ChevronRight, Loader2 } from 'lucide-react';
import './Admissions.css';

const STEPS = [
  { step: '01', title: 'Check Eligibility', desc: 'Review minimum marks and qualification requirements for your desired program.' },
  { step: '02', title: 'Obtain Prospectus', desc: 'Purchase or download the official UoS admissions prospectus from the campus.' },
  { step: '03', title: 'Fill Application', desc: 'Complete the application form with accurate personal and academic details.' },
  { step: '04', title: 'Submit Documents', desc: 'Attach all required documents: transcripts, CNIC copy, photos, and fee challan.' },
  { step: '05', title: 'Entry Test', desc: 'Appear in the UoS admission entry test on the specified date and venue.' },
  { step: '06', title: 'Merit List', desc: 'Check your name in the announced merit list and report for enrollment.' },
];

const Admissions = () => {
  const [admissionData, setAdmissionData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/admissions')
      .then(res => setAdmissionData(res.data))
      .catch(() => setAdmissionData({
        status: 'Open',
        start_date: 'July 1, 2025',
        end_date: 'August 15, 2025',
        process: 'Entry test followed by merit list'
      }))
      .finally(() => setLoading(false));
  }, []);

  const isOpen = admissionData?.status?.toLowerCase() === 'open';

  return (
    <div className="adm-page animate-fade-in">
      {/* Hero */}
      <div className="adm-hero">
        <div className="adm-hero-content">
          <div className="adm-badge">
            <ClipboardList size={14} />
            Admissions Portal
          </div>
          <h1>Begin Your Journey at UoS</h1>
          <p>University of Swat opens doors to quality higher education. Follow the steps below to apply for your desired program.</p>
        </div>
      </div>

      {/* Status Card */}
      {loading ? (
        <div className="loading-block">
          <Loader2 size={24} className="animate-spin" />
          <span>Loading admission dates…</span>
        </div>
      ) : (
        <div className="adm-status-grid">
          <div className={`status-card ${isOpen ? 'open' : 'closed'}`}>
            {isOpen ? <CheckCircle size={22} /> : <AlertCircle size={22} />}
            <div>
              <div className="status-label">Status</div>
              <div className="status-value">{admissionData?.status || 'N/A'}</div>
            </div>
          </div>
          <div className="date-card">
            <Calendar size={22} />
            <div>
              <div className="status-label">Opening Date</div>
              <div className="status-value">{admissionData?.start_date || 'TBA'}</div>
            </div>
          </div>
          <div className="date-card">
            <Calendar size={22} />
            <div>
              <div className="status-label">Last Date</div>
              <div className="status-value">{admissionData?.end_date || 'TBA'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Steps */}
      <div className="adm-section">
        <h2 className="section-title">How to Apply</h2>
        <div className="steps-list">
          {STEPS.map((s, i) => (
            <div key={i} className="step-card">
              <div className="step-number">{s.step}</div>
              <div className="step-body">
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
              <ChevronRight size={18} className="step-arrow" />
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="adm-cta">
        <h2>Ready to apply?</h2>
        <p>Contact the admissions office or visit the campus for guidance and application forms.</p>
        <a href="tel:+92-946-9240066" className="cta-btn">Contact Admissions Office</a>
      </div>
    </div>
  );
};

export default Admissions;
