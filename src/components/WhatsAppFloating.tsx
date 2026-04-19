import { useEffect, useState } from 'react';

export default function WhatsAppFloating() {
  const [show, setShow] = useState(false);
  const phoneNumber = '218920003366'; // Number from the top bar
  const message = 'السلام عليكم، أود الاستفسار عن خدمات شركة المدار الليبي للتأمين';

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 1500);
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
