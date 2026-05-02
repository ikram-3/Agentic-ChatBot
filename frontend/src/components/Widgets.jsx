import React from 'react';
import {
  ExternalLink, MapPin, Phone, Mail, Globe,
  ClipboardList, BookOpen, DollarSign, ShieldCheck,
  CheckCircle2, Clock, XCircle, FileText, CreditCard
} from 'lucide-react';
import './Widgets.css';

/* ── Inline SVG brand icons (not in lucide-react) ── */
const FacebookIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);
/* X (formerly Twitter) */
const XIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);
const InstagramIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
  </svg>
);
const YoutubeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/>
    <polygon fill="white" points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/>
  </svg>
);
const TikTokIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34l-.01-8.83a8.18 8.18 0 0 0 4.79 1.52V4.56a4.85 4.85 0 0 1-1.01-.13z"/>
  </svg>
);


/* ────────────────────────────────────── */
/*  Parse ALL widget tokens from text    */
/* ────────────────────────────────────── */
export function parseWidgets(text) {
  // Match [WIDGET:...] or just WIDGET:... tokens
  const WIDGET_RE = /(?:\[\s*)?WIDGET:([^\s\]]+(?:\s+[^\s\]]+)*)(?:\s*\])?/gi;
  const widgets = [];
  let cleanText = text;
  let match;

  while ((match = WIDGET_RE.exec(text)) !== null) {
    const raw = match[1]; // e.g. "admission" or "link:https://uswat.edu.pk:Label"

    // First token before the first colon is the type
    const colonIdx = raw.indexOf(':');
    if (colonIdx === -1) {
      widgets.push({ type: raw.trim().toLowerCase(), params: '' });
    } else {
      const type = raw.slice(0, colonIdx).trim().toLowerCase();
      const params = raw.slice(colonIdx + 1).trim();
      // Safety: skip any widget that still has a placeholder like <REF_NO> or <ROLL_NO>
      if (params.includes('<') && params.includes('>')) continue;
      // Skip if params is literally the word "REF_NO", "ROLL_NO", "YOUR_NUMBER" etc.
      if (/^(ref_no|roll_no|your_number|ref|number)$/i.test(params)) continue;
      widgets.push({ type, params });
    }
  }

  // Strip all widget tokens from displayed text (including wrong-case variants)
  cleanText = text.replace(/\[WIDGET:[^\]]+\]/gi, '').replace(/\n{3,}/g, '\n\n').trim();
  return { cleanText, widgets };
}

/* ────────────────────────────────────── */
/*  Individual Widgets                   */
/* ────────────────────────────────────── */

export const AdmissionWidget = () => (
  <div className="widget admission-widget">
    <div className="widget-header">
      <ClipboardList size={18} />
      <span>Admissions 2026 — Now Open</span>
    </div>
    <div className="widget-body">
      <p>Applications are being accepted for the Fall 2026 session. Apply online or visit the campus.</p>
      <div className="widget-meta">
        <span>📅 Last date: <strong>September 15, 2026</strong></span>
        <span>📝 Entry Test: <strong>September 20, 2026</strong></span>
      </div>
    </div>
    <div className="widget-actions">
      <a href="https://www.uswat.edu.pk/admissions" target="_blank" rel="noreferrer" className="widget-btn primary">
        Apply Now <ExternalLink size={14} />
      </a>
      <a href="https://www.uswat.edu.pk" target="_blank" rel="noreferrer" className="widget-btn secondary">
        Official Website <ExternalLink size={14} />
      </a>
    </div>
  </div>
);

export const MapWidget = () => (
  <div className="widget map-widget">
    <div className="widget-header">
      <MapPin size={18} />
      <span>University of Swat — Campus Location</span>
    </div>
    <div className="map-embed-wrap">
      <iframe
        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3278.435777174154!2d72.41804961552528!3d34.86877968039239!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x38dc2362b69480a9%3A0xc3f8cf4cc722f6d9!2sUniversity%20of%20Swat!5e0!3m2!1sen!2s!4v1655383561726!5m2!1sen!2s"
        width="100%" height="220" style={{ border: 0, borderRadius: '0.625rem' }}
        allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"
        title="University of Swat Map"
      />
    </div>
    <div className="widget-body">
      <div className="widget-meta">
        <span>📍 Charbagh, Swat, Khyber Pakhtunkhwa, Pakistan</span>
        <span>📞 +92-946-9240066</span>
      </div>
    </div>
    <div className="widget-actions">
      <a href="https://maps.google.com/?q=University+of+Swat" target="_blank" rel="noreferrer" className="widget-btn primary">
        Open in Google Maps <ExternalLink size={14} />
      </a>
    </div>
  </div>
);

export const ProgramsWidget = () => {
  const programs = [
    { name: 'BS Computer Science',       dept: 'CS & IT',        dur: '4 Yrs', color: '#6366f1' },
    { name: 'BS Software Engineering',   dept: 'CS & IT',        dur: '4 Yrs', color: '#6366f1' },
    { name: 'MS Computer Science',       dept: 'CS & IT',        dur: '2 Yrs', color: '#6366f1' },
    { name: 'BBA',                       dept: 'Management',     dur: '4 Yrs', color: '#f59e0b' },
    { name: 'MBA',                       dept: 'Management',     dur: '2 Yrs', color: '#f59e0b' },
    { name: 'BS English',                dept: 'English',        dur: '4 Yrs', color: '#10b981' },
    { name: 'Pharm-D',                   dept: 'Pharmacy',       dur: '5 Yrs', color: '#ef4444' },
    { name: 'BS Mathematics',            dept: 'Mathematics',    dur: '4 Yrs', color: '#3b82f6' },
  ];
  return (
    <div className="widget programs-widget">
      <div className="widget-header">
        <BookOpen size={18} />
        <span>Academic Programs at UoS</span>
      </div>
      <div className="prog-grid">
        {programs.map((p, i) => (
          <div key={i} className="prog-chip" style={{ borderLeftColor: p.color }}>
            <span className="prog-name">{p.name}</span>
            <span className="prog-meta">{p.dept} · {p.dur}</span>
          </div>
        ))}
      </div>
      <div className="widget-actions">
        <a href="https://www.uswat.edu.pk/academics" target="_blank" rel="noreferrer" className="widget-btn primary">
          View All Programs <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
};

export const ContactWidget = () => (
  <div className="widget contact-widget">
    <div className="widget-header">
      <Phone size={18} />
      <span>Contact University of Swat</span>
    </div>
    <div className="contact-grid">
      <div className="contact-item">
        <Phone size={15} /><div><div className="c-label">Phone</div><div className="c-val">+92-946-9240066</div></div>
      </div>
      <div className="contact-item">
        <Mail size={15} /><div><div className="c-label">Email</div><div className="c-val">info@uswat.edu.pk</div></div>
      </div>
      <div className="contact-item">
        <MapPin size={15} /><div><div className="c-label">Address</div><div className="c-val">Charbagh, Swat, KPK, Pakistan</div></div>
      </div>
      <div className="contact-item">
        <Globe size={15} /><div><div className="c-label">Website</div><div className="c-val"><a href="https://www.uswat.edu.pk" target="_blank" rel="noreferrer">www.uswat.edu.pk</a></div></div>
      </div>
    </div>
  </div>
);

export const FeesWidget = () => (
  <div className="widget fees-widget">
    <div className="widget-header">
      <DollarSign size={18} />
      <span>Fee Structure — University of Swat</span>
    </div>
    <div className="fees-table">
      {[
        { level: 'BS Programs', fee: 'Rs. 45,000 / semester', color: '#6366f1' },
        { level: 'MS Programs', fee: 'Rs. 55,000 / semester', color: '#10b981' },
        { level: 'PhD Programs', fee: 'Rs. 65,000 / semester', color: '#f59e0b' },
        { level: 'Pharm-D', fee: 'Rs. 60,000 / semester', color: '#ef4444' },
        { level: 'Hostel', fee: 'Rs. 15,000 – 25,000 / semester', color: '#8b5cf6' },
      ].map((row, i) => (
        <div key={i} className="fee-row">
          <div className="fee-level" style={{ borderLeftColor: row.color }}>{row.level}</div>
          <div className="fee-amount">{row.fee}</div>
        </div>
      ))}
    </div>
    <div className="widget-note">* Fee structure subject to change. Scholarships available for deserving students.</div>
  </div>
);

const STATUS_MAP = {
  'Verified': { icon: <CheckCircle2 size={16} />, cls: 'sv', label: '✅ Verified' },
  'Pending':  { icon: <Clock size={16} />,         cls: 'sp', label: '⏳ Pending' },
  'Rejected': { icon: <XCircle size={16} />,       cls: 'sr', label: '❌ Rejected' },
  'Active':   { icon: <CheckCircle2 size={16} />, cls: 'sv', label: '✅ Active' },
};

export const BankSlipWidget = ({ refNo }) => {
  const slips = {
    'UOS-2026-001234': { student_name: 'Muhammad Ikram',  program: 'BS Computer Science',     amount: 45000, bank: 'HBL', branch: 'Mingora', payment_date: '2026-08-10', status: 'Verified', challan_no: 'CHN-2026-78432', fee_type: 'Semester Fee' },
    'UOS-2026-001235': { student_name: 'Sara Khan',       program: 'BS Software Engineering', amount: 45000, bank: 'NBP', branch: 'Swat',    payment_date: '2026-08-12', status: 'Verified', challan_no: 'CHN-2026-78433', fee_type: 'Semester Fee' },
    'UOS-2026-001236': { student_name: 'Ali Hassan',      program: 'BBA',                     amount: 45000, bank: 'UBL', branch: 'Kanju',   payment_date: '2026-08-15', status: 'Pending',  challan_no: 'CHN-2026-78434', fee_type: 'Semester Fee' },
    'UOS-2026-001237': { student_name: 'Fatima Noor',     program: 'Pharm-D',                 amount: 60000, bank: 'HBL', branch: 'Mingora', payment_date: '2026-08-11', status: 'Verified', challan_no: 'CHN-2026-78435', fee_type: 'Semester Fee' },
    'UOS-2026-ADM-0021': { student_name: 'Zubair Ahmed',  program: 'MS Computer Science',     amount: 1000,  bank: 'Bank Al Habib', branch: 'Swat', payment_date: '2026-08-05', status: 'Verified', challan_no: 'CHN-2026-78436', fee_type: 'Application Fee' },
  };
  const d = slips[refNo?.toUpperCase()];
  const st = d ? (STATUS_MAP[d.status] || STATUS_MAP['Pending']) : null;

  if (!d) return (
    <div className="widget verify-widget not-found">
      <div className="widget-header"><CreditCard size={18} /><span>Bank Slip — Not Found</span></div>
      <div className="widget-body"><p>No record found for <strong>{refNo}</strong>. Please contact Finance Office: +92-946-9240066.</p></div>
    </div>
  );

  return (
    <div className="widget verify-widget">
      <div className="widget-header"><CreditCard size={18} /><span>Bank Payment Slip — Verified</span><div className={`st-badge ${st.cls}`}>{st.label}</div></div>
      <div className="verify-grid">
        <div className="vrow"><span>Reference No.</span><strong>{refNo}</strong></div>
        <div className="vrow"><span>Challan No.</span><strong>{d.challan_no}</strong></div>
        <div className="vrow"><span>Student</span><strong>{d.student_name}</strong></div>
        <div className="vrow"><span>Program</span><strong>{d.program}</strong></div>
        <div className="vrow"><span>Fee Type</span><strong>{d.fee_type}</strong></div>
        <div className="vrow"><span>Amount</span><strong>Rs. {d.amount.toLocaleString()}</strong></div>
        <div className="vrow"><span>Bank</span><strong>{d.bank} — {d.branch}</strong></div>
        <div className="vrow"><span>Payment Date</span><strong>{d.payment_date}</strong></div>
      </div>
    </div>
  );
};

export const RollSlipWidget = ({ rollNo }) => {
  const slips = {
    'CS-2026-F-001':  { student_name: 'Muhammad Ikram', father_name: 'Sher Muhammad', program: 'BS Computer Science',     semester: '1st', section: 'A', exam_type: 'Mid-Term', exam_session: 'Fall 2026', exam_start_date: '2026-11-05', exam_end_date: '2026-11-15', exam_center: 'Main Examination Hall, UoS', subjects: ['Introduction to Programming (CSC-101)', 'Calculus (MTH-101)', 'English Composition (ENG-101)', 'Islamic Studies (ISL-101)', 'Digital Logic Design (CSC-102)'], status: 'Active' },
    'SE-2026-F-015':  { student_name: 'Sara Khan',       father_name: 'Imran Khan',    program: 'BS Software Engineering', semester: '2nd', section: 'B', exam_type: 'Final',    exam_session: 'Fall 2026', exam_start_date: '2026-12-10', exam_end_date: '2026-12-25', exam_center: 'Block-A Hall, UoS',           subjects: ['OOP (SE-201)', 'Discrete Mathematics (MTH-201)', 'Pakistan Studies (PAK-101)', 'Technical Writing (ENG-201)', 'Data Structures (SE-202)'], status: 'Active' },
    'PHR-2026-F-022': { student_name: 'Fatima Noor',     father_name: 'Noor Muhammad', program: 'Pharm-D',                 semester: '4th', section: 'A', exam_type: 'Final',    exam_session: 'Fall 2026', exam_start_date: '2026-12-12', exam_end_date: '2026-12-28', exam_center: 'Pharmacy Block Hall, UoS',    subjects: ['Pharmacology-II (PHR-401)', 'Pharmaceutical Chemistry (PHR-402)', 'Pharmacognosy (PHR-403)', 'Biochemistry (PHR-404)'], status: 'Active' },
  };
  const d = slips[rollNo?.toUpperCase()];
  if (!d) return (
    <div className="widget verify-widget not-found">
      <div className="widget-header"><FileText size={18} /><span>Roll No. Slip — Not Found</span></div>
      <div className="widget-body"><p>No roll slip found for <strong>{rollNo}</strong>. Contact the Examination Office: +92-946-9240066.</p></div>
    </div>
  );

  return (
    <div className="widget verify-widget">
      <div className="widget-header"><FileText size={18} /><span>Examination Roll Number Slip</span><div className="st-badge sv">✅ Active</div></div>
      <div className="roll-hero-mini"><div className="roll-no-big">{rollNo}</div><div className="roll-exam-lbl">{d.exam_type} — {d.exam_session}</div></div>
      <div className="verify-grid">
        <div className="vrow"><span>Student</span><strong>{d.student_name}</strong></div>
        <div className="vrow"><span>Father</span><strong>{d.father_name}</strong></div>
        <div className="vrow"><span>Program</span><strong>{d.program}</strong></div>
        <div className="vrow"><span>Semester / Section</span><strong>{d.semester} / {d.section}</strong></div>
        <div className="vrow"><span>Exam Dates</span><strong>{d.exam_start_date} → {d.exam_end_date}</strong></div>
        <div className="vrow"><span>Exam Center</span><strong>{d.exam_center}</strong></div>
      </div>
      <div className="subjects-section">
        <div className="subjects-label">Subjects</div>
        <ul className="subjects-ul">
          {d.subjects.map((s, i) => <li key={i}><CheckCircle2 size={12} className="sc-icon" />{s}</li>)}
        </ul>
      </div>
    </div>
  );
};

export const SocialWidget = () => {
  const platforms = [
    {
      icon: <FacebookIcon />,
      label: 'Facebook',
      handle: '@universityofswat',
      url: 'https://www.facebook.com/universityofswat',
      cls: 'facebook',
      verified: true,
    },
    {
      icon: <XIcon />,
      label: 'X (Twitter)',
      handle: '@uosofficial',
      url: 'https://twitter.com/uosofficial',
      cls: 'xtwitter',
      verified: false,
    },
    {
      icon: <InstagramIcon />,
      label: 'Instagram',
      handle: '@uosofficial',
      url: 'https://www.instagram.com/uosofficial',
      cls: 'instagram',
      verified: false,
    },
    {
      icon: <YoutubeIcon />,
      label: 'YouTube',
      handle: 'University of Swat',
      url: 'https://www.youtube.com/@universityofswat',
      cls: 'youtube',
      verified: true,
    },
    {
      icon: <TikTokIcon />,
      label: 'TikTok',
      handle: '@uosofficial',
      url: 'https://www.tiktok.com/@uosofficial',
      cls: 'tiktok',
      verified: false,
    },
  ];

  return (
    <div className="widget social-widget">
      <div className="widget-header">
        <Globe size={18} />
        <span>University of Swat — Social Media</span>
      </div>
      <div className="social-grid">
        {platforms.map((p, i) => (
          <a key={i} href={p.url} target="_blank" rel="noreferrer"
            className={`social-item ${p.cls}`}>
            <div className="social-icon-wrap">{p.icon}</div>
            <div className="social-info">
              <div className="s-label">{p.label}</div>
              <div className="s-handle">{p.handle}</div>
            </div>
            {p.verified
              ? <span className="s-badge verified">✓ Official</span>
              : <span className="s-badge unverified">Unofficial</span>}
          </a>
        ))}
      </div>
      <div className="social-note">
        ⚠️ Handles marked <em>Unofficial</em> may not be active. Always verify via <strong>uswat.edu.pk</strong>.
      </div>
      <div className="widget-actions">
        <a href="https://www.uswat.edu.pk" target="_blank" rel="noreferrer" className="widget-btn primary">
          Official Website <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
};


export const LinkWidget = ({ url, label }) => (
  <a href={url} target="_blank" rel="noreferrer" className="widget link-widget">
    <ExternalLink size={15} />
    <span>{label || url}</span>
  </a>
);

/* ── Dispatcher ── */
export const WidgetRenderer = ({ type, params }) => {
  switch (type) {
    case 'admission':   return <AdmissionWidget />;
    case 'map':         return <MapWidget />;
    case 'programs':    return <ProgramsWidget />;
    case 'contact':     return <ContactWidget />;
    case 'fees':        return <FeesWidget />;
    case 'social':      return <SocialWidget />;
    case 'bank_slip':   return <BankSlipWidget refNo={params} />;
    case 'roll_slip':   return <RollSlipWidget rollNo={params} />;
    case 'link': {
      const spaceMatch = params.match(/^(https?:\/\/\S+)\s+(.+)$/);
      if (spaceMatch) return <LinkWidget url={spaceMatch[1]} label={spaceMatch[2]} />;
      const colonMatch = params.match(/^(https?:\/\/[^\s:]+)(?::(.+))?$/);
      if (colonMatch) return <LinkWidget url={colonMatch[1]} label={colonMatch[2] || colonMatch[1]} />;
      return <LinkWidget url={params} label="Visit Link" />;
    }
    default: return null;
  }
};
