import React, { useState, useEffect, useRef } from 'react';
import {
  ExternalLink, MapPin, Phone, Mail, Globe,
  ClipboardList, BookOpen, DollarSign, ShieldCheck,
  CheckCircle2, Clock, XCircle, FileText, CreditCard,
  ChevronRight, Sparkles, Calendar, GraduationCap
} from 'lucide-react';
import './Widgets.css';

/* ── Brand SVG Icons ── */
const FacebookIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);
const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);
const InstagramIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
  </svg>
);
const YoutubeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/>
    <polygon fill="white" points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/>
  </svg>
);
const TikTokIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34l-.01-8.83a8.18 8.18 0 0 0 4.79 1.52V4.56a4.85 4.85 0 0 1-1.01-.13z"/>
  </svg>
);

/* ── Widget parser ── */
export function parseWidgets(text) {
  const WIDGET_RE = /(?:\[\s*)?WIDGET:([^\s\]]+(?:\s+[^\s\]]+)*)(?:\s*\])?/gi;
  const widgets = [];
  let match;
  while ((match = WIDGET_RE.exec(text)) !== null) {
    const raw = match[1];
    const colonIdx = raw.indexOf(':');
    if (colonIdx === -1) {
      widgets.push({ type: raw.trim().toLowerCase(), params: '' });
    } else {
      const type = raw.slice(0, colonIdx).trim().toLowerCase();
      const params = raw.slice(colonIdx + 1).trim();
      if (params.includes('<') && params.includes('>')) continue;
      if (/^(ref_no|roll_no|your_number|ref|number)$/i.test(params)) continue;
      widgets.push({ type, params });
    }
  }
  const cleanText = text.replace(/\[WIDGET:[^\]]+\]/gi, '').replace(/\n{3,}/g, '\n\n').trim();
  return { cleanText, widgets };
}

/* ── Animated Counter ── */
const AnimatedNumber = ({ value, prefix = '', suffix = '' }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0; const end = parseInt(value) || 0;
    if (end === 0) { setDisplay(0); return; }
    const step = Math.ceil(end / 40);
    const t = setInterval(() => {
      start += step;
      if (start >= end) { setDisplay(end); clearInterval(t); }
      else setDisplay(start);
    }, 25);
    return () => clearInterval(t);
  }, [value]);
  return <span>{prefix}{display.toLocaleString()}{suffix}</span>;
};

/* ── Admission Widget ── */
export const AdmissionWidget = () => {
  const steps = ['Online Application','Entry Test','Merit List','Enrollment'];
  return (
    <div className="w-card w-admission">
      <div className="w-header">
        <div className="w-header-icon"><ClipboardList size={17}/></div>
        <div>
          <div className="w-title">Admissions 2026</div>
          <div className="w-subtitle">Fall Session — Now Open</div>
        </div>
        <span className="w-live-badge"><span className="w-live-dot"/>OPEN</span>
      </div>
      <div className="w-body">
        <div className="w-dates-row">
          <div className="w-date-card">
            <Calendar size={13}/>
            <div><div className="w-date-label">Last Date</div><div className="w-date-val">Sep 15, 2026</div></div>
          </div>
          <div className="w-date-card">
            <Calendar size={13}/>
            <div><div className="w-date-label">Entry Test</div><div className="w-date-val">Sep 20, 2026</div></div>
          </div>
        </div>
        <div className="w-steps">
          {steps.map((s, i) => (
            <div key={i} className="w-step">
              <div className="w-step-num">{i + 1}</div>
              <div className="w-step-label">{s}</div>
              {i < steps.length - 1 && <ChevronRight size={12} className="w-step-arrow"/>}
            </div>
          ))}
        </div>
      </div>
      <div className="w-footer">
        <a href="https://www.uswat.edu.pk/admissions" target="_blank" rel="noreferrer" className="w-btn w-btn-primary">Apply Now <ExternalLink size={13}/></a>
        <a href="https://www.uswat.edu.pk" target="_blank" rel="noreferrer" className="w-btn w-btn-ghost">Website <ExternalLink size={13}/></a>
      </div>
    </div>
  );
};

/* ── Map Widget ── */
export const MapWidget = () => (
  <div className="w-card w-map">
    <div className="w-header">
      <div className="w-header-icon" style={{background:'rgba(99,102,241,0.15)',color:'#6366f1'}}><MapPin size={17}/></div>
      <div><div className="w-title">Campus Location</div><div className="w-subtitle">University of Swat</div></div>
    </div>
    <div className="w-map-embed">
      <iframe
        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3278.435777174154!2d72.41804961552528!3d34.86877968039239!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x38dc2362b69480a9%3A0xc3f8cf4cc722f6d9!2sUniversity%20of%20Swat!5e0!3m2!1sen!2s!4v1655383561726!5m2!1sen!2s"
        width="100%" height="200" style={{border:0}} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="UoS Map"
      />
    </div>
    <div className="w-info-row">
      <span><MapPin size={12}/> Charbagh, Swat, KPK, Pakistan</span>
      <span><Phone size={12}/> +92-946-9240066</span>
    </div>
    <div className="w-footer">
      <a href="https://maps.google.com/?q=University+of+Swat" target="_blank" rel="noreferrer" className="w-btn w-btn-primary">Open in Maps <ExternalLink size={13}/></a>
    </div>
  </div>
);

/* ── Programs Widget ── */
export const ProgramsWidget = () => {
  const programs = [
    { name:'BS Computer Science',      dept:'CS & IT',     dur:'4 Yrs', color:'#6366f1' },
    { name:'BS Software Engineering',  dept:'CS & IT',     dur:'4 Yrs', color:'#6366f1' },
    { name:'MS Computer Science',      dept:'CS & IT',     dur:'2 Yrs', color:'#6366f1' },
    { name:'BBA',                      dept:'Management',  dur:'4 Yrs', color:'#f59e0b' },
    { name:'MBA',                      dept:'Management',  dur:'2 Yrs', color:'#f59e0b' },
    { name:'BS English',               dept:'English',     dur:'4 Yrs', color:'#10b981' },
    { name:'Pharm-D',                  dept:'Pharmacy',    dur:'5 Yrs', color:'#ef4444' },
    { name:'BS Mathematics',           dept:'Mathematics', dur:'4 Yrs', color:'#3b82f6' },
  ];
  return (
    <div className="w-card w-programs">
      <div className="w-header">
        <div className="w-header-icon" style={{background:'rgba(16,185,129,0.15)',color:'#10b981'}}><BookOpen size={17}/></div>
        <div><div className="w-title">Academic Programs</div><div className="w-subtitle">{programs.length} programs available</div></div>
        <span className="w-count-badge"><GraduationCap size={12}/> {programs.length}</span>
      </div>
      <div className="w-prog-grid">
        {programs.map((p, i) => (
          <div key={i} className="w-prog-card" style={{'--prog-color': p.color}}>
            <div className="w-prog-dot" style={{background: p.color}}/>
            <div className="w-prog-info">
              <div className="w-prog-name">{p.name}</div>
              <div className="w-prog-meta">{p.dept} · {p.dur}</div>
            </div>
            <div className="w-prog-dur" style={{color: p.color}}>{p.dur}</div>
          </div>
        ))}
      </div>
      <div className="w-footer">
        <a href="https://www.uswat.edu.pk/academics" target="_blank" rel="noreferrer" className="w-btn w-btn-primary">All Programs <ExternalLink size={13}/></a>
      </div>
    </div>
  );
};

/* ── Contact Widget ── */
export const ContactWidget = () => {
  const items = [
    { icon:<Phone size={15}/>, label:'Phone', val:'+92-946-9240066', href:'tel:+929469240066', color:'#10b981' },
    { icon:<Mail size={15}/>, label:'Email', val:'info@uswat.edu.pk', href:'mailto:info@uswat.edu.pk', color:'#6366f1' },
    { icon:<MapPin size={15}/>, label:'Address', val:'Charbagh, Swat, KPK', href:null, color:'#f59e0b' },
    { icon:<Globe size={15}/>, label:'Website', val:'www.uswat.edu.pk', href:'https://www.uswat.edu.pk', color:'#3b82f6' },
  ];
  return (
    <div className="w-card w-contact">
      <div className="w-header">
        <div className="w-header-icon" style={{background:'rgba(99,102,241,0.15)',color:'#6366f1'}}><Phone size={17}/></div>
        <div><div className="w-title">Contact Us</div><div className="w-subtitle">University of Swat</div></div>
      </div>
      <div className="w-contact-grid">
        {items.map((item, i) => (
          <div key={i} className="w-contact-card" style={{'--c-color': item.color}}>
            <div className="w-contact-icon" style={{background:`${item.color}18`, color: item.color}}>{item.icon}</div>
            <div className="w-contact-info">
              <div className="w-contact-label">{item.label}</div>
              {item.href
                ? <a href={item.href} className="w-contact-val w-contact-link">{item.val}</a>
                : <div className="w-contact-val">{item.val}</div>
              }
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── Fees Widget ── */
export const FeesWidget = () => {
  const fees = [
    { level:'BS Programs',  amount:45000, color:'#6366f1' },
    { level:'MS Programs',  amount:55000, color:'#10b981' },
    { level:'PhD Programs', amount:65000, color:'#f59e0b' },
    { level:'Pharm-D',      amount:60000, color:'#ef4444' },
    { level:'Hostel',       amount:20000, color:'#8b5cf6' },
  ];
  const max = Math.max(...fees.map(f => f.amount));
  return (
    <div className="w-card w-fees">
      <div className="w-header">
        <div className="w-header-icon" style={{background:'rgba(245,158,11,0.15)',color:'#f59e0b'}}><DollarSign size={17}/></div>
        <div><div className="w-title">Fee Structure</div><div className="w-subtitle">Per Semester — Fall 2026</div></div>
      </div>
      <div className="w-fees-list">
        {fees.map((f, i) => (
          <div key={i} className="w-fee-row">
            <div className="w-fee-label" style={{color: f.color}}>{f.level}</div>
            <div className="w-fee-bar-wrap">
              <div className="w-fee-bar" style={{width:`${(f.amount/max)*100}%`, background: f.color, animationDelay:`${i*80}ms`}}/>
            </div>
            <div className="w-fee-amount">Rs. <AnimatedNumber value={f.amount}/></div>
          </div>
        ))}
      </div>
      <div className="w-fee-note">* Subject to change. Scholarships available for deserving students.</div>
    </div>
  );
};

/* ── Status helper ── */
const STATUS_MAP = {
  'Verified': { cls:'sv', icon:<CheckCircle2 size={14}/>, label:'Verified' },
  'Active':   { cls:'sv', icon:<CheckCircle2 size={14}/>, label:'Active' },
  'Pending':  { cls:'sp', icon:<Clock size={14}/>,        label:'Pending' },
  'Rejected': { cls:'sr', icon:<XCircle size={14}/>,      label:'Rejected' },
};

/* ── Bank Slip Widget ── */
export const BankSlipWidget = ({ refNo }) => {
  const slips = {
    'UOS-2026-001234': { student_name:'Muhammad Ikram', program:'BS Computer Science',     amount:45000, bank:'HBL',          branch:'Mingora', payment_date:'2026-08-10', status:'Verified', challan_no:'CHN-2026-78432', fee_type:'Semester Fee' },
    'UOS-2026-001235': { student_name:'Sara Khan',      program:'BS Software Engineering', amount:45000, bank:'NBP',          branch:'Swat',    payment_date:'2026-08-12', status:'Verified', challan_no:'CHN-2026-78433', fee_type:'Semester Fee' },
    'UOS-2026-001236': { student_name:'Ali Hassan',     program:'BBA',                     amount:45000, bank:'UBL',          branch:'Kanju',   payment_date:'2026-08-15', status:'Pending',  challan_no:'CHN-2026-78434', fee_type:'Semester Fee' },
    'UOS-2026-001237': { student_name:'Fatima Noor',    program:'Pharm-D',                 amount:60000, bank:'HBL',          branch:'Mingora', payment_date:'2026-08-11', status:'Verified', challan_no:'CHN-2026-78435', fee_type:'Semester Fee' },
    'UOS-2026-ADM-0021':{ student_name:'Zubair Ahmed',  program:'MS Computer Science',     amount:1000,  bank:'Bank Al Habib',branch:'Swat',    payment_date:'2026-08-05', status:'Verified', challan_no:'CHN-2026-78436', fee_type:'Application Fee'},
  };
  const d = slips[refNo?.toUpperCase()];
  const st = d ? (STATUS_MAP[d.status] || STATUS_MAP['Pending']) : null;

  if (!d) return (
    <div className="w-card w-verify w-not-found">
      <div className="w-header"><div className="w-header-icon" style={{background:'rgba(239,68,68,0.15)',color:'#ef4444'}}><CreditCard size={17}/></div>
        <div><div className="w-title">Bank Slip — Not Found</div><div className="w-subtitle">Reference: {refNo}</div></div>
      </div>
      <div className="w-not-found-body">No record found. Contact Finance Office: <strong>+92-946-9240066</strong></div>
    </div>
  );

  return (
    <div className="w-card w-verify">
      <div className="w-verify-hero">
        <div className="w-verify-icon-wrap"><CreditCard size={22}/></div>
        <div className="w-verify-hero-info">
          <div className="w-verify-ref">{refNo}</div>
          <div className="w-verify-type">{d.fee_type}</div>
        </div>
        <div className={`w-status-badge ${st.cls}`}>{st.icon} {st.label}</div>
      </div>
      <div className="w-verify-grid">
        {[
          ['Student', d.student_name],['Program', d.program],
          ['Challan No.', d.challan_no],['Amount', `Rs. ${d.amount.toLocaleString()}`],
          ['Bank', `${d.bank} — ${d.branch}`],['Date', d.payment_date],
        ].map(([label, val], i) => (
          <div key={i} className="w-verify-cell">
            <div className="w-cell-label">{label}</div>
            <div className="w-cell-val">{val}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ── Roll Slip Widget ── */
export const RollSlipWidget = ({ rollNo }) => {
  const slips = {
    'CS-2026-F-001':  { student_name:'Muhammad Ikram', father_name:'Sher Muhammad', program:'BS Computer Science',     semester:'1st', section:'A', exam_type:'Mid-Term', exam_session:'Fall 2026', exam_start_date:'2026-11-05', exam_end_date:'2026-11-15', exam_center:'Main Examination Hall, UoS', subjects:['Introduction to Programming (CSC-101)','Calculus (MTH-101)','English Composition (ENG-101)','Islamic Studies (ISL-101)','Digital Logic Design (CSC-102)'], status:'Active' },
    'SE-2026-F-015':  { student_name:'Sara Khan',       father_name:'Imran Khan',    program:'BS Software Engineering', semester:'2nd', section:'B', exam_type:'Final',    exam_session:'Fall 2026', exam_start_date:'2026-12-10', exam_end_date:'2026-12-25', exam_center:'Block-A Hall, UoS',           subjects:['OOP (SE-201)','Discrete Mathematics (MTH-201)','Pakistan Studies (PAK-101)','Technical Writing (ENG-201)','Data Structures (SE-202)'], status:'Active' },
    'PHR-2026-F-022': { student_name:'Fatima Noor',     father_name:'Noor Muhammad', program:'Pharm-D',                 semester:'4th', section:'A', exam_type:'Final',    exam_session:'Fall 2026', exam_start_date:'2026-12-12', exam_end_date:'2026-12-28', exam_center:'Pharmacy Block Hall, UoS',    subjects:['Pharmacology-II (PHR-401)','Pharmaceutical Chemistry (PHR-402)','Pharmacognosy (PHR-403)','Biochemistry (PHR-404)'], status:'Active' },
  };
  const d = slips[rollNo?.toUpperCase()];

  if (!d) return (
    <div className="w-card w-verify w-not-found">
      <div className="w-header"><div className="w-header-icon" style={{background:'rgba(239,68,68,0.15)',color:'#ef4444'}}><FileText size={17}/></div>
        <div><div className="w-title">Roll Slip — Not Found</div><div className="w-subtitle">Roll No: {rollNo}</div></div>
      </div>
      <div className="w-not-found-body">No record found. Contact Examination Office: <strong>+92-946-9240066</strong></div>
    </div>
  );

  return (
    <div className="w-card w-verify w-roll">
      <div className="w-roll-hero">
        <div className="w-roll-no">{rollNo}</div>
        <div className="w-roll-meta">{d.exam_type} · {d.exam_session}</div>
        <div className="w-status-badge sv"><CheckCircle2 size={14}/> Active</div>
      </div>
      <div className="w-verify-grid">
        {[
          ['Student', d.student_name],['Father', d.father_name],
          ['Program', d.program],[`Sem / Sec`, `${d.semester} / ${d.section}`],
          ['Exam Dates', `${d.exam_start_date} → ${d.exam_end_date}`],
          ['Center', d.exam_center],
        ].map(([label, val], i) => (
          <div key={i} className="w-verify-cell">
            <div className="w-cell-label">{label}</div>
            <div className="w-cell-val">{val}</div>
          </div>
        ))}
      </div>
      <div className="w-subjects">
        <div className="w-subjects-title">Subjects</div>
        <div className="w-subjects-list">
          {d.subjects.map((s, i) => (
            <div key={i} className="w-subject-item" style={{animationDelay:`${i*60}ms`}}>
              <CheckCircle2 size={11} className="w-subj-icon"/> {s}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ── Social Widget ── */
export const SocialWidget = () => {
  const platforms = [
    { icon:<FacebookIcon/>, label:'Facebook',   handle:'@universityofswat', url:'https://www.facebook.com/universityofswat', cls:'fb',  color:'#1877f2', verified:true },
    { icon:<XIcon/>,        label:'X (Twitter)',handle:'@uosofficial',      url:'https://twitter.com/uosofficial',            cls:'xw',  color:'#000',    verified:false },
    { icon:<InstagramIcon/>,label:'Instagram',  handle:'@uosofficial',      url:'https://www.instagram.com/uosofficial',      cls:'ig',  color:'#e1306c', verified:false },
    { icon:<YoutubeIcon/>,  label:'YouTube',    handle:'University of Swat',url:'https://www.youtube.com/@universityofswat',  cls:'yt',  color:'#ff0000', verified:true },
    { icon:<TikTokIcon/>,   label:'TikTok',     handle:'@uosofficial',      url:'https://www.tiktok.com/@uosofficial',        cls:'tt',  color:'#010101', verified:false },
  ];
  return (
    <div className="w-card w-social">
      <div className="w-header">
        <div className="w-header-icon" style={{background:'rgba(99,102,241,0.15)',color:'#6366f1'}}><Globe size={17}/></div>
        <div><div className="w-title">Follow UoS</div><div className="w-subtitle">Official Social Media</div></div>
      </div>
      <div className="w-social-grid">
        {platforms.map((p, i) => (
          <a key={i} href={p.url} target="_blank" rel="noreferrer"
            className={`w-social-item w-soc-${p.cls}`}
            style={{'--soc-color': p.color, animationDelay:`${i*60}ms`}}>
            <div className="w-soc-icon" style={{background:`${p.color}18`,color:p.color}}>{p.icon}</div>
            <div className="w-soc-info">
              <div className="w-soc-name">{p.label}</div>
              <div className="w-soc-handle">{p.handle}</div>
            </div>
            <div className={`w-soc-badge ${p.verified ? 'verified' : 'unofficial'}`}>
              {p.verified ? '✓ Official' : 'Unofficial'}
            </div>
            <ChevronRight size={14} className="w-soc-arrow"/>
          </a>
        ))}
      </div>
    </div>
  );
};

/* ── Link Widget ── */
export const LinkWidget = ({ url, label }) => (
  <a href={url} target="_blank" rel="noreferrer" className="w-link-chip">
    <ExternalLink size={13}/> <span>{label || url}</span>
  </a>
);

/* ── Dispatcher ── */
export const WidgetRenderer = ({ type, params }) => {
  switch (type) {
    case 'admission': return <AdmissionWidget />;
    case 'map':       return <MapWidget />;
    case 'programs':  return <ProgramsWidget />;
    case 'contact':   return <ContactWidget />;
    case 'fees':      return <FeesWidget />;
    case 'social':    return <SocialWidget />;
    case 'bank_slip': return <BankSlipWidget refNo={params} />;
    case 'roll_slip': return <RollSlipWidget rollNo={params} />;
    case 'link': {
      const m = params.match(/^(https?:\/\/\S+)\s+(.+)$/) || params.match(/^(https?:\/\/[^\s:]+)(?::(.+))?$/);
      return m ? <LinkWidget url={m[1]} label={m[2] || m[1]} /> : <LinkWidget url={params} label="Visit Link" />;
    }
    default: return null;
  }
};
