import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config/api';

export default function WhatsAppFloating() {
  const [show, setShow] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('218920003366');
  const message = 'السلام عليكم، أود الاستفسار عن خدمات شركة المدار الليبي للتأمين';

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 1500);
    
    const fetchWhatsappNumber = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/public/website-settings`);
        if (res.ok) {
          const data = await res.json();
          const s = data.settings || {};
          if (s.whatsapp) {
            // Clean up the whatsapp number (remove '+' or spaces)
            const cleanNum = s.whatsapp.replace(/[\s+]/g, '');
            if (cleanNum) setPhoneNumber(cleanNum);
          } else if (s.phone) {
            const cleanNum = s.phone.replace(/[\s+]/g, '');
            if (cleanNum) setPhoneNumber(cleanNum);
          }
        }
      } catch (error) {
        console.error('Error fetching whatsapp setting:', error);
      }
    };

    fetchWhatsappNumber();
    return () => clearTimeout(timer);
  }, []);

  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

  if (!show) return null;

  return (
    <a 
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="whatsapp-floating"
      title="تواصل معنا عبر واتساب"
    >
      <div className="whatsapp-tooltip">تواصل معنا</div>
      <i className="fab fa-whatsapp"></i>
      <span className="pulse-ripple"></span>
    </a>
  );
}
