
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
import '../styles/DocumentView.css';

const ViewCashInTransitInsurance: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [document, setDocument] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDocument();
    }, [id]);

    const fetchDocument = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/cash-in-transit-insurance/${id}`);
            const data = await response.json();
            setDocument(data);
        } catch (error) {
            console.error('Error fetching document:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="loading">جاري التحميل...</div>;
    if (!document) return <div className="error">الوثيقة غير موجودة</div>;

    return (
        <div className="document-view-container">
            <div className="view-header">
                <h2>تفاصيل وثيقة تأمين نقل النقدية</h2>
                <div className="header-actions">
                    <button className="btn-back" onClick={() => navigate(-1)}>عودة</button>
                    <button className="btn-print" onClick={() => window.print()}>طباعة</button>
                    <button className="btn-edit" onClick={() => navigate(`/cash-in-transit-insurance/edit/${id}`)}>تعديل</button>
                </div>
            </div>

            <div className="details-grid">
                <div className="detail-section">
                    <h3>بيانات الوثيقة</h3>
                    <div className="detail-item">
                        <label>رقم الوثيقة:</label>
                        <span>{document.policy_number}</span>
                    </div>
                </div>

                <div className="detail-section">
                    <h3>بيانات المؤمن والمحرر</h3>
                    <div className="detail-item">
                        <label>اسم المؤمن له:</label>
                        <span>{document.insured_name}</span>
                    </div>
                    <div className="detail-item">
                        <label>مسار النقل:</label>
                        <span>من {document.transit_from} إلى {document.transit_to}</span>
                    </div>
                </div>

                <div className="detail-section">
                    <h3>الحدود والرسوم</h3>
                    <div className="detail-item">
                        <label>حد النقلة الواحدة:</label>
                        <span>{document.limit_per_transit} د.ل</span>
                    </div>
                    <div className="detail-item">
                        <label>التداول السنوي:</label>
                        <span>{document.annual_turnover || '-'} د.ل</span>
                    </div>
                    <div className="detail-item">
                        <label>تاريخ البدء:</label>
                        <span>{document.start_date}</span>
                    </div>
                    <div className="detail-item">
                        <label>تاريخ الانتهاء:</label>
                        <span>{document.end_date}</span>
                    </div>
                    <div className="detail-item">
                        <label>القسط الإجمالي:</label>
                        <span className="premium-value">{document.premium_amount} د.ل</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewCashInTransitInsurance;
