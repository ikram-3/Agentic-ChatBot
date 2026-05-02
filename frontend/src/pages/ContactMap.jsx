import React from 'react';
import './ContactMap.css';

const ContactMap = () => {
  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <h1>Campus Location</h1>
        <p>Visit us at the main campus of the University of Swat.</p>
      </div>
      
      <div className="contact-content">
        <div className="contact-info">
          <div className="info-card">
            <h3>Address</h3>
            <p>University of Swat, Charbagh<br />Swat, Khyber Pakhtunkhwa, Pakistan</p>
          </div>
          <div className="info-card">
            <h3>Contact Details</h3>
            <p>Phone: +92 946 9240066<br />Email: info@uswat.edu.pk</p>
          </div>
        </div>
        
        <div className="map-container">
          <iframe 
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3278.435777174154!2d72.41804961552528!3d34.86877968039239!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x38dc2362b69480a9%3A0xc3f8cf4cc722f6d9!2sUniversity%20of%20Swat!5e0!3m2!1sen!2s!4v1655383561726!5m2!1sen!2s" 
            width="100%" 
            height="100%" 
            style={{ border: 0 }} 
            allowFullScreen="" 
            loading="lazy" 
            referrerPolicy="no-referrer-when-downgrade"
            title="University of Swat Map"
          ></iframe>
        </div>
      </div>
    </div>
  );
};

export default ContactMap;
