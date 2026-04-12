import { useState, useRef } from 'react';
import InsuranceDocumentsList from '../InsuranceDocumentsList';
import InternationalInsuranceList from '../InternationalInsuranceList';
import TravelInsuranceList from '../TravelInsuranceList';
import ResidentInsuranceList from '../ResidentInsuranceList';
import MarineStructureInsuranceList from '../MarineStructureInsuranceList';
import ProfessionalLiabilityInsuranceList from '../ProfessionalLiabilityInsuranceList';
import PersonalAccidentInsuranceList from '../PersonalAccidentInsuranceList';
import SchoolStudentInsuranceList from '../SchoolStudentInsuranceList';
import CashInTransitInsuranceList from '../CashInTransitInsuranceList';
import CargoInsuranceList from '../CargoInsuranceList';

export default function ArchiveDashboard() {
  const [activeTab, setActiveTab] = useState('car');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const tabs = [
    { id: 'car', label: 'السيارات', component: <InsuranceDocumentsList isArchive={true} /> },
    { id: 'international', label: 'دولي (بطاقة برتقالية)', component: <InternationalInsuranceList isArchive={true} /> },
    { id: 'travel', label: 'المسافرين', component: <TravelInsuranceList isArchive={true} /> },
    { id: 'resident', label: 'الوافدين', component: <ResidentInsuranceList isArchive={true} /> },
    { id: 'marine', label: 'الهياكل البحرية', component: <MarineStructureInsuranceList isArchive={true} /> },
    { id: 'professional', label: 'المسؤولية المهنية', component: <ProfessionalLiabilityInsuranceList isArchive={true} /> },
    { id: 'personal', label: 'الحوادث الشخصية', component: <PersonalAccidentInsuranceList isArchive={true} /> },
    { id: 'school', label: 'حماية طلاب المدارس', component: <SchoolStudentInsuranceList isArchive={true} /> },
    { id: 'cash', label: 'نقل النقدية', component: <CashInTransitInsuranceList isArchive={true} /> },
    { id: 'cargo', label: 'شحن البضائع', component: <CargoInsuranceList isArchive={true} /> },
  ];

  const getIconClass = (id: string) => {
    switch(id) {
      case 'car': return 'fa-car';
      case 'international': return 'fa-globe';
      case 'travel': return 'fa-plane';
      case 'resident': return 'fa-id-card';
      case 'marine': return 'fa-ship';
      case 'professional': return 'fa-user-doctor';
      case 'personal': return 'fa-hand-holding-medical';
      case 'school': return 'fa-graduation-cap';
      case 'cash': return 'fa-money-bill-transfer';
      case 'cargo': return 'fa-truck';
      default: return 'fa-file-shield';
    }
  };

  const [dragged, setDragged] = useState(false);

  // Drag to scroll logic
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setDragged(false);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseLeave = () => setIsDragging(false);
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2; 
    
    // If moved more than 5 pixels, consider it a drag
    if (Math.abs(x - (startX + scrollRef.current.offsetLeft)) > 5) {
      setDragged(true);
    }
    
    if (dragged) {
      e.preventDefault();
      scrollRef.current.scrollLeft = scrollLeft - walk;
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 250;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div style={{ padding: '0' }}>
      <div 
        style={{ 
          backgroundColor: 'var(--panel)',
          padding: '10px 15px',
          borderRadius: '16px',
          border: '1px solid var(--border)',
          marginBottom: '25px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}
      >
        {/* Scroll Buttons */}
        <button 
          onClick={() => scroll('right')}
          className="scroll-nav-btn"
          style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 2 }}
          title="السابق"
        >
          <i className="fa-solid fa-chevron-right"></i>
        </button>

        <div 
          ref={scrollRef}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          style={{ 
            display: 'flex', 
            gap: '8px', 
            overflowX: 'auto',
            padding: '5px 0',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
            scrollBehavior: 'smooth'
          }}
          className="no-scrollbar"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if (!dragged) setActiveTab(tab.id);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 24px',
                border: '1px solid',
                borderColor: activeTab === tab.id ? '#014cb1' : 'transparent',
                backgroundColor: activeTab === tab.id ? '#014cb1' : 'var(--input-bg)',
                color: activeTab === tab.id ? '#fff' : 'var(--text)',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: '700',
                fontSize: '14px',
                transition: 'all 0.3s',
                whiteSpace: 'nowrap',
                boxShadow: activeTab === tab.id ? '0 8px 15px rgba(1, 76, 177, 0.2)' : 'none',
              }}
            >
              <div 
                style={{ 
                  width: '32px', 
                  height: '32px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  background: activeTab === tab.id ? 'rgba(255,255,255,0.15)' : 'var(--bg)',
                  borderRadius: '10px'
                }}
              >
                <i className={`fa-solid ${getIconClass(tab.id)}`} style={{ fontSize: '15px' }}></i>
              </div>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <button 
          onClick={() => scroll('left')}
          className="scroll-nav-btn"
          style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 2 }}
          title="التالي"
        >
          <i className="fa-solid fa-chevron-left"></i>
        </button>
      </div>
      
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      <div className="archive-content">
        {tabs.find((t) => t.id === activeTab)?.component}
      </div>
    </div>
  );
}
