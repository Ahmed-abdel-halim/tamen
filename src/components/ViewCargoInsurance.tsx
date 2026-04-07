
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/DocumentView.css';

const ViewCargoInsurance: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [document, setDocument] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDocument();
    }, [id]);

    const fetchDocument = async () => {
        try {
            const response = await fetch(`/api/cargo-insurance/${id}`);
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
                <h2>تفاصيل وثيقة تأمين شحن البضائع</h2>
                <div className="header-actions">
                    <button className="btn-back" onClick={() => navigate(-1)}>عودة</button>
                    <button className="btn-print" onClick={() => window.print()}>طباعة</button>
                    <button className="btn-edit" onClick={() => navigate(`/cargo-insurance/edit/${id}`)}>تعديل</button>
                </div>
            </div>

            <div className="details-grid">
                <div className="detail-section">
                    <h3>بيانات الوثيقة والشحنة</h3>
                    <div className="detail-item">
                        <label>رقم الوثيقة:</label>
                        <span>{document.policy_number}</span>
                    </div>
                    <div className="detail-item">
                        <label>اسم المؤمن له:</label>
                        <span>{document.insured_name}</span>
                    </div>
                    <div className="detail-item">
                        <label>وصف البضاعة:</label>
                        <span>{document.cargo_description}</span>
                    </div>
                </div>

                <div className="detail-section">
                    <h3>تفاصيل الرحلة والرحلة</h3>
                    <div className="detail-item">
                        <label>نوع النقل:</label>
                        <span>{document.transport_type}</span>
                    </div>
                    <div className="detail-item">
                        <label>مسار الرحلة:</label>
                        <span>من {document.voyage_from} إلى {document.voyage_to}</span>
                    </div>
                </div>

                <div className="detail-section">
                    <h3>بيانات التغطية والقسط</h3>
                    <div className="detail-item">
                        <label>مبلغ التأمين (Sum Insured):</label>
                        <span>{document.sum_insured} د.ل</span>
                    </div>
                    <div className="detail-item">
                        <label>القسط الإجمالي:</label>
                        <span className="premium-value">{document.premium_amount} د.ل</span>
                    </div>
                     <div className="detail-item">
                        <label>الحالة:</label>
                        <span className={`status-badge active`}>نشطة</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewCargoInsurance;
