import React, { useState } from 'react';
import apiClient from '../api/client';
import {
  ShieldCheck, CreditCard, FileText, Search, CheckCircle2,
  XCircle, Clock, Loader2, AlertCircle, ChevronDown, ChevronUp, RotateCcw
} from 'lucide-react';
import './Verification.css';

const STATUS_CONFIG = {
  Verified: { icon: <CheckCircle2 size={18} />, cls: 'status-verified', label: 'Verified' },
  Pending:  { icon: <Clock size={18} />,       cls: 'status-pending',  label: 'Pending'  },
  Rejected: { icon: <XCircle size={18} />,     cls: 'status-rejected', label: 'Rejected' },
  Active:   { icon: <CheckCircle2 size={18} />, cls: 'status-verified', label: 'Active'  },
};

const TABS = [
  { id: 'bank',   icon: <CreditCard size={18} />, label: 'Bank Slip Verification' },
  { id: 'roll',   icon: <FileText size={18} />,   label: 'Roll No. Slip Verification' },
  { id: 'student',icon: <Search size={18} />,     label: 'Student Record Search' },
];

/* ── Reusable detail row ── */
const DetailRow = ({ label, value }) => (
  <div className="detail-row">
    <span className="detail-label">{label}</span>
    <span className="detail-value">{value || '—'}</span>
  </div>
);

/* ── Bank Slip Result ── */
const BankSlipResult = ({ data }) => {
  const s = STATUS_CONFIG[data.status] || STATUS_CONFIG['Pending'];
  return (
    <div className="result-card animate-fade-in">
      <div className="result-header">
        <div className="result-title">
          <CreditCard size={20} />
          <span>Bank Payment Slip</span>
        </div>
        <div className={`status-badge ${s.cls}`}>{s.icon}{s.label}</div>
      </div>
      <div className="result-body">
        <div className="result-grid">
          <DetailRow label="Reference No." value={data.reference_no} />
          <DetailRow label="Challan No." value={data.challan_no} />
          <DetailRow label="Student Name" value={data.student_name} />
          <DetailRow label="Program" value={data.program} />
          <DetailRow label="Semester" value={data.semester} />
          <DetailRow label="Fee Type" value={data.fee_type} />
          <DetailRow label="Amount Paid" value={`Rs. ${data.amount?.toLocaleString()}`} />
          <DetailRow label="Bank" value={data.bank} />
          <DetailRow label="Branch" value={data.branch} />
          <DetailRow label="Payment Date" value={data.payment_date} />
        </div>
      </div>
      <div className="result-footer">
        <ShieldCheck size={14} />
        <span>This record is officially maintained by the University of Swat Finance Office.</span>
      </div>
    </div>
  );
};

/* ── Roll Slip Result ── */
const RollSlipResult = ({ data }) => {
  const [showSubjects, setShowSubjects] = useState(false);
  const s = STATUS_CONFIG[data.status] || STATUS_CONFIG['Active'];
  return (
    <div className="result-card animate-fade-in">
      <div className="result-header">
        <div className="result-title">
          <FileText size={20} />
          <span>Examination Roll Number Slip</span>
        </div>
        <div className={`status-badge ${s.cls}`}>{s.icon}{s.label}</div>
      </div>
      <div className="result-body">
        <div className="roll-hero">
          <div className="roll-no-display">{data.roll_no}</div>
          <div className="roll-exam-type">{data.exam_type} — {data.exam_session}</div>
        </div>
        <div className="result-grid">
          <DetailRow label="Student Name" value={data.student_name} />
          <DetailRow label="Father's Name" value={data.father_name} />
          <DetailRow label="Program" value={data.program} />
          <DetailRow label="Department" value={data.department} />
          <DetailRow label="Semester" value={data.semester} />
          <DetailRow label="Section" value={data.section} />
          <DetailRow label="Exam Start Date" value={data.exam_start_date} />
          <DetailRow label="Exam End Date" value={data.exam_end_date} />
          <DetailRow label="Exam Center" value={data.exam_center} />
          <DetailRow label="Issued Date" value={data.issued_date} />
        </div>

        {/* Subjects accordion */}
        <button className="subjects-toggle" onClick={() => setShowSubjects(v => !v)}>
          <span>Subjects ({data.subjects?.length})</span>
          {showSubjects ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showSubjects && (
          <ul className="subjects-list animate-fade-in">
            {data.subjects?.map((subj, i) => (
              <li key={i}><CheckCircle2 size={13} className="subj-icon" />{subj}</li>
            ))}
          </ul>
        )}
      </div>
      <div className="result-footer">
        <ShieldCheck size={14} />
        <span>Carry this slip (printed) to the examination hall along with your original CNIC.</span>
      </div>
    </div>
  );
};

/* ── Student Search Result ── */
const StudentResult = ({ data }) => (
  <div className="student-results animate-fade-in">
    {data.bank_slips?.length > 0 && (
      <div className="student-section">
        <h3><CreditCard size={16} /> Bank Payments ({data.bank_slips.length})</h3>
        {data.bank_slips.map((slip, i) => <BankSlipResult key={i} data={slip} />)}
      </div>
    )}
    {data.roll_slips?.length > 0 && (
      <div className="student-section">
        <h3><FileText size={16} /> Roll Number Slips ({data.roll_slips.length})</h3>
        {data.roll_slips.map((slip, i) => <RollSlipResult key={i} data={slip} />)}
      </div>
    )}
  </div>
);

/* ── Main Verification Page ── */
const Verification = () => {
  const [activeTab, setActiveTab] = useState('bank');
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const placeholders = {
    bank:    'e.g. UOS-2026-001234',
    roll:    'e.g. CS-2026-F-001',
    student: 'e.g. Muhammad Ikram',
  };

  const labels = {
    bank:    'Reference Number',
    roll:    'Roll Number',
    student: 'Student Name',
  };

  const handleVerify = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    setError('');
    try {
      let res;
      if (activeTab === 'bank')    res = await apiClient.get(`/verify/bank-slip/${encodeURIComponent(query.trim())}`);
      if (activeTab === 'roll')    res = await apiClient.get(`/verify/roll-slip/${encodeURIComponent(query.trim())}`);
      if (activeTab === 'student') res = await apiClient.get(`/verify/student/${encodeURIComponent(query.trim())}`);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'No record found. Please check the input and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => { setQuery(''); setResult(null); setError(''); };

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleVerify(); };

  const handleTabChange = (id) => { setActiveTab(id); handleReset(); };

  return (
    <div className="verification-page animate-fade-in">
      {/* Hero */}
      <div className="ver-hero">
        <div className="ver-hero-inner">
          <div className="ver-hero-badge"><ShieldCheck size={14} /> Verification Portal</div>
          <h1>Document Verification</h1>
          <p>Verify your bank payment slips, examination roll number slips, and student records instantly.</p>
        </div>
      </div>

      <div className="ver-content">
        {/* Tabs */}
        <div className="ver-tabs">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`ver-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => handleTabChange(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Search Box */}
        <div className="ver-search-card">
          <div className="ver-search-label">{labels[activeTab]}</div>
          <div className="ver-search-row">
            <div className="ver-input-wrap">
              <Search size={18} className="ver-input-icon" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholders[activeTab]}
                className="ver-input"
                autoComplete="off"
              />
              {query && (
                <button className="ver-clear-btn" onClick={handleReset} title="Clear">
                  <XCircle size={16} />
                </button>
              )}
            </div>
            <button
              className={`ver-btn ${query.trim() ? 'active' : ''}`}
              onClick={handleVerify}
              disabled={!query.trim() || loading}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
              {loading ? 'Verifying…' : 'Verify'}
            </button>
          </div>

          {/* Sample hints */}
          <div className="ver-hints">
            <span>Try: </span>
            {activeTab === 'bank'    && ['UOS-2026-001234', 'UOS-2026-001237', 'UOS-2026-ADM-0021'].map(h => <button key={h} className="hint-chip" onClick={() => setQuery(h)}>{h}</button>)}
            {activeTab === 'roll'    && ['CS-2026-F-001', 'SE-2026-F-015', 'PHR-2026-F-022'].map(h => <button key={h} className="hint-chip" onClick={() => setQuery(h)}>{h}</button>)}
            {activeTab === 'student' && ['Ikram', 'Sara', 'Fatima'].map(h => <button key={h} className="hint-chip" onClick={() => setQuery(h)}>{h}</button>)}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="ver-error animate-fade-in">
            <AlertCircle size={18} />
            <span>{error}</span>
            <button className="ver-retry" onClick={handleReset}><RotateCcw size={14} /> Try Again</button>
          </div>
        )}

        {/* Results */}
        {result && !error && (
          activeTab === 'bank'    ? <BankSlipResult    data={result} /> :
          activeTab === 'roll'    ? <RollSlipResult    data={result} /> :
          activeTab === 'student' ? <StudentResult     data={result} /> : null
        )}

        {/* Empty state */}
        {!result && !error && !loading && (
          <div className="ver-empty">
            <div className="ver-empty-icon"><ShieldCheck size={40} /></div>
            <h3>Enter your details above to verify</h3>
            <p>Your data is verified against the official University of Swat records in real time.</p>
            <div className="ver-features">
              <div className="ver-feature"><CreditCard size={20} /><span>Bank Slip Verification</span></div>
              <div className="ver-feature"><FileText size={20} /><span>Roll No. Slip Verification</span></div>
              <div className="ver-feature"><Search size={20} /><span>Student Record Search</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Verification;
