import React, { useState } from 'react';
import InsuranceDocumentsList from '../InsuranceDocumentsList';
import InternationalInsuranceList from '../InternationalInsuranceList';
import TravelInsuranceList from '../TravelInsuranceList';
import ResidentInsuranceList from '../ResidentInsuranceList';
import MarineStructureInsuranceList from '../MarineStructureInsuranceList';
import ProfessionalLiabilityInsuranceList from '../ProfessionalLiabilityInsuranceList';
import PersonalAccidentInsuranceList from '../PersonalAccidentInsuranceList';

export default function ArchiveDashboard() {
  const [activeTab, setActiveTab] = useState('car');

  const tabs = [
    { id: 'car', label: 'السيارات', component: <InsuranceDocumentsList isArchive={true} /> },
    { id: 'international', label: 'دولي (بطاقة برتقالية)', component: <InternationalInsuranceList isArchive={true} /> },
    { id: 'travel', label: 'المسافرين', component: <TravelInsuranceList isArchive={true} /> },
    { id: 'resident', label: 'الوافدين', component: <ResidentInsuranceList isArchive={true} /> },
    { id: 'marine', label: 'الهياكل البحرية', component: <MarineStructureInsuranceList isArchive={true} /> },
    { id: 'professional', label: 'المسؤولية المهنية', component: <ProfessionalLiabilityInsuranceList isArchive={true} /> },
    { id: 'personal', label: 'الحوادث الشخصية', component: <PersonalAccidentInsuranceList isArchive={true} /> },
  ];

  return (
    <div style={{ padding: '0' }}>
      <div 
        style={{ 
          display: 'flex', 
          gap: '10px', 
          marginBottom: '20px', 
          flexWrap: 'wrap',
          backgroundColor: 'var(--panel)',
          padding: '15px',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          boxShadow: 'none'
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 20px',
              border: '1px solid var(--border)',
              backgroundColor: activeTab === tab.id ? 'var(--accent)' : 'var(--input-bg)',
              color: activeTab === tab.id ? 'white' : 'var(--text)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              transition: 'all 0.2s',
              fontFamily: 'inherit'
            }}
          >
            <i className={`fa-solid ${tab.id === 'car' ? 'fa-car' : tab.id === 'international' ? 'fa-globe' : tab.id === 'travel' ? 'fa-plane' : tab.id === 'resident' ? 'fa-id-card' : tab.id === 'marine' ? 'fa-ship' : tab.id === 'professional' ? 'fa-user-doctor' : 'fa-hand-holding-medical'}`} style={{ marginLeft: '8px' }}></i>
            {tab.label}
          </button>
        ))}
      </div>
      <div className="archive-content">
        {tabs.find((t) => t.id === activeTab)?.component}
      </div>
    </div>
  );
}
