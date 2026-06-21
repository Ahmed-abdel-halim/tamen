import { useEffect, useState } from "react";
import { showToast } from "./Toast";
import { API_BASE_URL, resolveImageUrl } from "../config/api";
import { showGlobalLoader, hideGlobalLoader } from "./LoaderOverlay";


type Slider = {
  id: number;
  media_type: "image" | "video";
  media_url: string;
  title_ar: string | null;
  title_en: string | null;
  subtitle_ar: string | null;
  subtitle_en: string | null;
  order: number;
};

type HomepageService = {
  id: number;
  title_ar: string;
  title_en: string;
  desc_ar: string;
  desc_en: string;
  icon: string;
  image_url: string; // Database column name
};

type InsuranceType = {
  id: number;
  title_ar: string;
  title_en: string;
  description_ar: string;
  description_en: string;
  details_ar: string | null;
  details_en: string | null;
  icon: string;
  color: string;
  image_url: string; // Database column name
};

export default function WebsiteSettingsManagement() {
  const [activeTab, setActiveTab] = useState<"settings" | "sliders" | "services" | "insurances" | "investments" | "media-center">("settings");
  
  // Site settings state
  const [settings, setSettings] = useState<Record<string, string>>({
    phone: "",
    email: "",
    address: "",
    whatsapp: "",
    facebook_url: "",
    twitter_url: "",
    linkedin_url: "",
    youtube_url: "",
    instagram_url: "",
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Investments settings state
  const [investmentsFormData, setInvestmentsFormData] = useState({
    investments_title_ar: "",
    investments_title_en: "",
    investments_content_ar: "",
    investments_content_en: "",
  });
  const [investmentsBannerFile, setInvestmentsBannerFile] = useState<File | null>(null);
  const [investmentsBannerUrl, setInvestmentsBannerUrl] = useState("");
  const [investmentsSaving, setInvestmentsSaving] = useState(false);

  // Media Center state
  const [mediaPosts, setMediaPosts] = useState<any[]>([]);
  const [mediaPostsLoading, setMediaPostsLoading] = useState(false);
  const [mediaPostsSaving, setMediaPostsSaving] = useState(false);
  const [showMediaForm, setShowMediaForm] = useState(false);
  const [editingMediaPost, setEditingMediaPost] = useState<any | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaFormData, setMediaFormData] = useState({
    type: "news",
    title_ar: "",
    title_en: "",
    content_ar: "",
    content_en: "",
    location_ar: "",
    location_en: "",
    media_url: "",
    published_date: "",
    sort_order: 0,
    is_active: true,
  });

  // Sliders state
  const [sliders, setSliders] = useState<Slider[]>([]);
  const [slidersLoading, setSlidersLoading] = useState(false);
  const [showSliderForm, setShowSliderForm] = useState(false);
  const [sliderFile, setSliderFile] = useState<File | null>(null);
  const [sliderFormData, setSliderFormData] = useState({
    media_type: "image" as "image" | "video",
    title_ar: "",
    title_en: "",
    subtitle_ar: "",
    subtitle_en: "",
    sort_order: 0,
  });
  const [sliderSaving, setSliderSaving] = useState(false);

  // Homepage services state
  const [services, setServices] = useState<HomepageService[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [editService, setEditService] = useState<HomepageService | null>(null);
  const [serviceFile, setServiceFile] = useState<File | null>(null);
  const [serviceSaving, setServiceSaving] = useState(false);

  // Detailed Insurance types state
  const [insurances, setInsurances] = useState<InsuranceType[]>([]);
  const [insurancesLoading, setInsurancesLoading] = useState(false);
  const [editInsurance, setEditInsurance] = useState<InsuranceType | null>(null);
  const [insuranceFile, setInsuranceFile] = useState<File | null>(null);
  const [insuranceSaving, setInsuranceSaving] = useState(false);

  // Add service state
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [serviceFormData, setServiceFormData] = useState({
    title_ar: "",
    title_en: "",
    desc_ar: "",
    desc_en: "",
    icon: "",
    sort_order: 0,
  });

  // Add insurance state
  const [showInsuranceForm, setShowInsuranceForm] = useState(false);
  const [insuranceFormData, setInsuranceFormData] = useState({
    title_ar: "",
    title_en: "",
    description_ar: "",
    description_en: "",
    details_ar: "",
    details_en: "",
    icon: "",
    color: "#3b82f6",
    sort_order: 0,
  });


  useEffect(() => {
    if (activeTab === "settings" || activeTab === "investments") fetchSettings();
    if (activeTab === "sliders") fetchSliders();
    if (activeTab === "services") fetchServices();
    if (activeTab === "insurances") fetchInsurances();
    if (activeTab === "media-center") fetchMediaPosts();
  }, [activeTab]);

  // Common Headers Helper
  const getAuthHeaders = (isJson = true) => {
    const token = localStorage.getItem("token");
    const headers: HeadersInit = {};
    if (isJson) {
      headers["Content-Type"] = "application/json";
    }
    headers["Accept"] = "application/json";
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  };

  // Settings
  const fetchSettings = async () => {
    setSettingsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/website-settings`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(prev => ({ ...prev, ...data }));
        
        // Pre-fill investments form data
        setInvestmentsFormData({
          investments_title_ar: data.investments_title_ar || "",
          investments_title_en: data.investments_title_en || "",
          investments_content_ar: data.investments_content_ar || "",
          investments_content_en: data.investments_content_en || "",
        });
        setInvestmentsBannerUrl(data.investments_banner || "");
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/website-settings`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(settings),
      });

      if (!res.ok) throw new Error("فشل حفظ الإعدادات");
      showToast("تم حفظ إعدادات الموقع بنجاح", "success");
    } catch (error: any) {
      showToast(error.message || "حدث خطأ أثناء حفظ الإعدادات", "error");
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleInvestmentsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInvestmentsSaving(true);
    try {
      const formData = new FormData();
      formData.append("investments_title_ar", investmentsFormData.investments_title_ar);
      formData.append("investments_title_en", investmentsFormData.investments_title_en);
      formData.append("investments_content_ar", investmentsFormData.investments_content_ar);
      formData.append("investments_content_en", investmentsFormData.investments_content_en);
      if (investmentsBannerFile) {
        formData.append("investments_banner", investmentsBannerFile);
      }

      const res = await fetch(`${API_BASE_URL}/website-settings`, {
        method: "POST",
        headers: getAuthHeaders(false),
        body: formData,
      });

      if (!res.ok) throw new Error("فشل حفظ إعدادات الاستثمارات");
      showToast("تم حفظ إعدادات الاستثمارات بنجاح", "success");
      fetchSettings();
    } catch (error: any) {
      showToast(error.message || "حدث خطأ أثناء حفظ إعدادات الاستثمارات", "error");
    } finally {
      setInvestmentsSaving(false);
    }
  };

  // Media Center CRUD handlers
  const fetchMediaPosts = async () => {
    setMediaPostsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/website-settings/media-posts`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setMediaPosts(data || []);
      }
    } catch (error) {
      console.error("Error fetching media posts:", error);
    } finally {
      setMediaPostsLoading(false);
    }
  };

  const handleMediaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMediaPostsSaving(true);
    try {
      const formData = new FormData();
      formData.append("type", mediaFormData.type);
      formData.append("title_ar", mediaFormData.title_ar);
      formData.append("title_en", mediaFormData.title_en);
      formData.append("content_ar", mediaFormData.content_ar);
      formData.append("content_en", mediaFormData.content_en);
      formData.append("location_ar", mediaFormData.location_ar);
      formData.append("location_en", mediaFormData.location_en);
      formData.append("sort_order", mediaFormData.sort_order.toString());
      formData.append("is_active", mediaFormData.is_active ? "1" : "0");
      if (mediaFormData.published_date) {
        formData.append("published_date", mediaFormData.published_date);
      }
      if (mediaFormData.media_url) {
        formData.append("media_url", mediaFormData.media_url);
      }
      if (mediaFile) {
        formData.append("file", mediaFile);
      }

      const url = editingMediaPost
        ? `${API_BASE_URL}/website-settings/media-posts/${editingMediaPost.id}`
        : `${API_BASE_URL}/website-settings/media-posts`;

      const res = await fetch(url, {
        method: "POST", // POST endpoint handles PUT/Update logic natively on file upload forms
        headers: getAuthHeaders(false),
        body: formData,
      });

      if (!res.ok) throw new Error("فشل حفظ المنشور");
      showToast("تم حفظ المنشور بنجاح", "success");
      setShowMediaForm(false);
      setEditingMediaPost(null);
      setMediaFile(null);
      setMediaFormData({
        type: "news",
        title_ar: "",
        title_en: "",
        content_ar: "",
        content_en: "",
        location_ar: "",
        location_en: "",
        media_url: "",
        published_date: "",
        sort_order: 0,
        is_active: true,
      });
      fetchMediaPosts();
    } catch (error: any) {
      showToast(error.message || "حدث خطأ أثناء حفظ المنشور", "error");
    } finally {
      setMediaPostsSaving(false);
    }
  };

  const handleMediaEdit = (post: any) => {
    setEditingMediaPost(post);
    setMediaFormData({
      type: post.type,
      title_ar: post.title_ar || "",
      title_en: post.title_en || "",
      content_ar: post.content_ar || "",
      content_en: post.content_en || "",
      location_ar: post.location_ar || "",
      location_en: post.location_en || "",
      media_url: post.media_url || "",
      published_date: post.published_date ? post.published_date.substring(0, 16) : "",
      sort_order: post.sort_order || 0,
      is_active: post.is_active ?? true,
    });
    setMediaFile(null);
    setShowMediaForm(true);
  };

  const handleMediaDelete = async (id: number) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا المنشور؟")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/website-settings/media-posts/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!res.ok) throw new Error("فشل حذف المنشور");
      showToast("تم حذف المنشور بنجاح", "success");
      setMediaPosts(prev => prev.filter(p => p.id !== id));
    } catch (error: any) {
      showToast(error.message || "حدث خطأ أثناء حذف المنشور", "error");
    }
  };

  // Sliders
  const fetchSliders = async () => {
    setSlidersLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/website-settings/sliders`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setSliders(data);
      }
    } catch (error) {
      console.error("Error fetching sliders:", error);
    } finally {
      setSlidersLoading(false);
    }
  };

  const handleSliderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sliderFile) {
      showToast("يرجى اختيار ملف الصورة أو الفيديو للبنر", "error");
      return;
    }
    setSliderSaving(true);
    try {
      const formData = new FormData();
      formData.append("media", sliderFile);
      formData.append("media_type", sliderFormData.media_type);
      formData.append("title_ar", sliderFormData.title_ar);
      formData.append("title_en", sliderFormData.title_en);
      formData.append("subtitle_ar", sliderFormData.subtitle_ar);
      formData.append("subtitle_en", sliderFormData.subtitle_en);
      formData.append("sort_order", sliderFormData.sort_order.toString());

      const res = await fetch(`${API_BASE_URL}/website-settings/sliders`, {
        method: "POST",
        headers: getAuthHeaders(false),
        body: formData,
      });

      if (!res.ok) throw new Error("فشل إضافة البنر");
      showToast("تم إضافة البنر بنجاح", "success");
      setShowSliderForm(false);
      setSliderFile(null);
      setSliderFormData({
        media_type: "image",
        title_ar: "",
        title_en: "",
        subtitle_ar: "",
        subtitle_en: "",
        sort_order: 0,
      });
      fetchSliders();
    } catch (error: any) {
      showToast(error.message || "حدث خطأ أثناء إضافة البنر", "error");
    } finally {
      setSliderSaving(false);
    }
  };

  const handleSliderDelete = async (id: number) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا البنر؟")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/website-settings/sliders/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!res.ok) throw new Error("فشل حذف البنر");
      showToast("تم حذف البنر بنجاح", "success");
      setSliders(prev => prev.filter(s => s.id !== id));
    } catch (error: any) {
      showToast(error.message || "حدث خطأ أثناء حذف البنر", "error");
    }
  };

  // Services
  const fetchServices = async () => {
    setServicesLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/website-settings/services`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setServices(data || []);
      }
    } catch (error) {
      console.error("Error fetching services:", error);
    } finally {
      setServicesLoading(false);
    }
  };

  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editService) return;
    setServiceSaving(true);
    try {
      const formData = new FormData();
      formData.append("title_ar", editService.title_ar);
      formData.append("title_en", editService.title_en);
      formData.append("desc_ar", editService.desc_ar || "");
      formData.append("desc_en", editService.desc_en || "");
      formData.append("icon", editService.icon || "");
      if (serviceFile) {
        formData.append("image", serviceFile);
      }

      const res = await fetch(`${API_BASE_URL}/website-settings/services/${editService.id}`, {
        method: "POST",
        headers: getAuthHeaders(false),
        body: formData,
      });

      if (!res.ok) throw new Error("فشل تعديل الخدمة");
      showToast("تم تعديل الخدمة بنجاح", "success");
      setEditService(null);
      setServiceFile(null);
      fetchServices();
    } catch (error: any) {
      showToast(error.message || "حدث خطأ أثناء تعديل الخدمة", "error");
    } finally {
      setServiceSaving(false);
    }
  };

  // Insurances
  const fetchInsurances = async () => {
    setInsurancesLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/website-settings/insurance-types`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setInsurances(data || []);
      }
    } catch (error) {
      console.error("Error fetching insurance types:", error);
    } finally {
      setInsurancesLoading(false);
    }
  };

  const handleInsuranceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editInsurance) return;
    setInsuranceSaving(true);
    try {
      const formData = new FormData();
      formData.append("title_ar", editInsurance.title_ar);
      formData.append("title_en", editInsurance.title_en);
      formData.append("description_ar", editInsurance.description_ar || "");
      formData.append("description_en", editInsurance.description_en || "");
      formData.append("details_ar", editInsurance.details_ar || "");
      formData.append("details_en", editInsurance.details_en || "");
      formData.append("icon", editInsurance.icon || "");
      formData.append("color", editInsurance.color || "");
      if (insuranceFile) {
        formData.append("image", insuranceFile);
      }

      const res = await fetch(`${API_BASE_URL}/website-settings/insurance-types/${editInsurance.id}`, {
        method: "POST",
        headers: getAuthHeaders(false),
        body: formData,
      });

      if (!res.ok) throw new Error("فشل تعديل نوع التأمين");
      showToast("تم تعديل نوع التأمين بنجاح", "success");
      setEditInsurance(null);
      setInsuranceFile(null);
      fetchInsurances();
    } catch (error: any) {
      showToast(error.message || "حدث خطأ أثناء تعديل نوع التأمين", "error");
    } finally {
      setInsuranceSaving(false);
    }
  };

  const handleCreateServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServiceSaving(true);
    try {
      const formData = new FormData();
      formData.append("title_ar", serviceFormData.title_ar);
      formData.append("title_en", serviceFormData.title_en);
      formData.append("desc_ar", serviceFormData.desc_ar);
      formData.append("desc_en", serviceFormData.desc_en);
      formData.append("icon", serviceFormData.icon);
      formData.append("sort_order", serviceFormData.sort_order.toString());
      if (serviceFile) {
        formData.append("image", serviceFile);
      }

      const res = await fetch(`${API_BASE_URL}/website-settings/services`, {
        method: "POST",
        headers: getAuthHeaders(false),
        body: formData,
      });

      if (!res.ok) throw new Error("فشل إضافة الخدمة");
      showToast("تم إضافة الخدمة بنجاح", "success");
      setShowServiceForm(false);
      setServiceFile(null);
      setServiceFormData({
        title_ar: "",
        title_en: "",
        desc_ar: "",
        desc_en: "",
        icon: "",
        sort_order: 0,
      });
      fetchServices();
    } catch (error: any) {
      showToast(error.message || "حدث خطأ أثناء إضافة الخدمة", "error");
    } finally {
      setServiceSaving(false);
    }
  };

  const handleServiceDelete = async (id: number) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه الخدمة؟")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/website-settings/services/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!res.ok) throw new Error("فشل حذف الخدمة");
      showToast("تم حذف الخدمة بنجاح", "success");
      fetchServices();
    } catch (error: any) {
      showToast(error.message || "حدث خطأ أثناء حذف الخدمة", "error");
    }
  };

  const handleCreateInsuranceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInsuranceSaving(true);
    try {
      const formData = new FormData();
      formData.append("title_ar", insuranceFormData.title_ar);
      formData.append("title_en", insuranceFormData.title_en);
      formData.append("description_ar", insuranceFormData.description_ar);
      formData.append("description_en", insuranceFormData.description_en);
      formData.append("details_ar", insuranceFormData.details_ar);
      formData.append("details_en", insuranceFormData.details_en);
      formData.append("icon", insuranceFormData.icon);
      formData.append("color", insuranceFormData.color);
      formData.append("sort_order", insuranceFormData.sort_order.toString());
      if (insuranceFile) {
        formData.append("image", insuranceFile);
      }

      const res = await fetch(`${API_BASE_URL}/website-settings/insurance-types`, {
        method: "POST",
        headers: getAuthHeaders(false),
        body: formData,
      });

      if (!res.ok) throw new Error("فشل إضافة نوع التأمين");
      showToast("تم إضافة نوع التأمين بنجاح", "success");
      setShowInsuranceForm(false);
      setInsuranceFile(null);
      setInsuranceFormData({
        title_ar: "",
        title_en: "",
        description_ar: "",
        description_en: "",
        details_ar: "",
        details_en: "",
        icon: "",
        color: "#3b82f6",
        sort_order: 0,
      });
      fetchInsurances();
    } catch (error: any) {
      showToast(error.message || "حدث خطأ أثناء إضافة نوع التأمين", "error");
    } finally {
      setInsuranceSaving(false);
    }
  };

  const handleInsuranceDelete = async (id: number) => {
    if (!window.confirm("هل أنت متأكد من حذف نوع التأمين هذا؟")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/website-settings/insurance-types/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!res.ok) throw new Error("فشل حذف نوع التأمين");
      showToast("تم حذف نوع التأمين بنجاح", "success");
      fetchInsurances();
    } catch (error: any) {
      showToast(error.message || "حدث خطأ أثناء حذف نوع التأمين", "error");
    }
  };


  const showLoader = settingsLoading || slidersLoading || servicesLoading || insurancesLoading || mediaPostsLoading || settingsSaving || sliderSaving || serviceSaving || insuranceSaving || investmentsSaving || mediaPostsSaving;
  const loaderMessage = (settingsSaving || sliderSaving || serviceSaving || insuranceSaving || investmentsSaving || mediaPostsSaving) 
    ? "جاري حفظ التعديلات والبيانات..." 
    : "جاري تحميل وتحديث بيانات الموقع...";

  useEffect(() => {
    if (showLoader) {
      showGlobalLoader(loaderMessage);
    } else {
      hideGlobalLoader();
    }
    return () => hideGlobalLoader();
  }, [showLoader, loaderMessage]);

  return (
    <section className="users-management">
      <div className="users-breadcrumb">
        <span>إدارة الموقع الإلكتروني / إعدادات ومحتوى الموقع</span>
      </div>

      <div className="tabs-container" style={{ display: "flex", gap: "10px", marginBottom: "20px", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>
        <button
          className={`tab-btn ${activeTab === "settings" ? "active" : ""}`}
          onClick={() => setActiveTab("settings")}
          style={{
            padding: "10px 20px",
            background: activeTab === "settings" ? "var(--accent-cyan)" : "transparent",
            color: activeTab === "settings" ? "white" : "var(--text)",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          إعدادات التواصل
        </button>
        <button
          className={`tab-btn ${activeTab === "sliders" ? "active" : ""}`}
          onClick={() => setActiveTab("sliders")}
          style={{
            padding: "10px 20px",
            background: activeTab === "sliders" ? "var(--accent-cyan)" : "transparent",
            color: activeTab === "sliders" ? "white" : "var(--text)",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          البنرات المتحركة
        </button>
        <button
          className={`tab-btn ${activeTab === "services" ? "active" : ""}`}
          onClick={() => setActiveTab("services")}
          style={{
            padding: "10px 20px",
            background: activeTab === "services" ? "var(--accent-cyan)" : "transparent",
            color: activeTab === "services" ? "white" : "var(--text)",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          خدمات الصفحة الرئيسية
        </button>
        <button
          className={`tab-btn ${activeTab === "insurances" ? "active" : ""}`}
          onClick={() => setActiveTab("insurances")}
          style={{
            padding: "10px 20px",
            background: activeTab === "insurances" ? "var(--accent-cyan)" : "transparent",
            color: activeTab === "insurances" ? "white" : "var(--text)",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          تفاصيل وثائق التأمين
        </button>
        <button
          className={`tab-btn ${activeTab === "investments" ? "active" : ""}`}
          onClick={() => setActiveTab("investments")}
          style={{
            padding: "10px 20px",
            background: activeTab === "investments" ? "var(--accent-cyan)" : "transparent",
            color: activeTab === "investments" ? "white" : "var(--text)",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          استثمارات الشركة
        </button>
        <button
          className={`tab-btn ${activeTab === "media-center" ? "active" : ""}`}
          onClick={() => setActiveTab("media-center")}
          style={{
            padding: "10px 20px",
            background: activeTab === "media-center" ? "var(--accent-cyan)" : "transparent",
            color: activeTab === "media-center" ? "white" : "var(--text)",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          المكتب الإعلامي
        </button>
      </div>

      <div className="users-card" style={{ padding: "25px" }}>
        {/* Tab 5: Investments */}
        {activeTab === "investments" && (
          <div>
            <h3 style={{ marginBottom: "20px" }}>تعديل صفحة استثمارات الشركة</h3>
            {settingsLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '250px', color: 'var(--accent-cyan)' }}>
                <i className="fa-solid fa-spinner fa-spin fa-2x" style={{ marginBottom: '15px' }}></i>
                <p style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>جارِ تحميل الإعدادات...</p>
              </div>
            ) : (
              <form onSubmit={handleInvestmentsSubmit} className="user-form" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  <div className="form-group">
                    <label>عنوان القسم باللغة العربية</label>
                    <input
                      type="text"
                      value={investmentsFormData.investments_title_ar}
                      onChange={(e) => setInvestmentsFormData({ ...investmentsFormData, investments_title_ar: e.target.value })}
                      placeholder="مثال: إستثمارات الشركة"
                    />
                  </div>
                  <div className="form-group">
                    <label>عنوان القسم باللغة الإنجليزية</label>
                    <input
                      type="text"
                      value={investmentsFormData.investments_title_en}
                      onChange={(e) => setInvestmentsFormData({ ...investmentsFormData, investments_title_en: e.target.value })}
                      placeholder="مثال: Company Investments"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>صورة البنر العلوي (Banner Image)</label>
                  {investmentsBannerUrl && (
                    <div style={{ marginBottom: "10px", height: "150px", overflow: "hidden", borderRadius: "8px", border: "1px solid var(--border)", position: "relative" }}>
                      <img src={resolveImageUrl(investmentsBannerUrl)} alt="Banner Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setInvestmentsBannerFile(e.target.files?.[0] || null)}
                  />
                </div>

                <div className="form-group">
                  <label>الوصف والمحتوى باللغة العربية</label>
                  <textarea
                    value={investmentsFormData.investments_content_ar}
                    onChange={(e) => setInvestmentsFormData({ ...investmentsFormData, investments_content_ar: e.target.value })}
                    placeholder="اكتب هنا كامل نص الوصف والتفاصيل بما فيها المساهمات..."
                    rows={12}
                    style={{ lineHeight: "1.6" }}
                  />
                </div>

                <div className="form-group">
                  <label>الوصف والمحتوى باللغة الإنجليزية</label>
                  <textarea
                    value={investmentsFormData.investments_content_en}
                    onChange={(e) => setInvestmentsFormData({ ...investmentsFormData, investments_content_en: e.target.value })}
                    placeholder="Write the English description and content details here..."
                    rows={12}
                    style={{ lineHeight: "1.6" }}
                  />
                </div>

                <div className="form-actions" style={{ marginTop: "15px" }}>
                  <button type="submit" className="btn-submit" disabled={investmentsSaving}>
                    {investmentsSaving ? "جاري حفظ التعديلات..." : "حفظ التعديلات"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Tab 6: Media Center */}
        {activeTab === "media-center" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0 }}>إدارة محتوى المكتب الإعلامي</h3>
              <button
                onClick={() => {
                  setEditingMediaPost(null);
                  setMediaFile(null);
                  setMediaFormData({
                    type: "news",
                    title_ar: "",
                    title_en: "",
                    content_ar: "",
                    content_en: "",
                    location_ar: "",
                    location_en: "",
                    media_url: "",
                    published_date: new Date().toISOString().substring(0, 16),
                    sort_order: 0,
                    is_active: true,
                  });
                  setShowMediaForm(true);
                }}
                className="btn-submit"
                style={{ background: "var(--accent)", display: "flex", alignItems: "center", gap: "8px" }}
              >
                <i className="fa-solid fa-plus"></i> إضافة منشور جديد
              </button>
            </div>

            {showMediaForm && (
              <div style={{ border: "1px solid var(--border)", borderRadius: "12px", padding: "25px", marginBottom: "30px", background: "var(--bg)" }}>
                <h4 style={{ marginBottom: "20px", color: "var(--text)" }}>
                  {editingMediaPost ? "تعديل منشور" : "إضافة منشور جديد"}
                </h4>
                <form onSubmit={handleMediaSubmit} className="user-form" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
                    <div className="form-group">
                      <label>نوع المنشور</label>
                      <select
                        value={mediaFormData.type}
                        onChange={(e) => setMediaFormData({ ...mediaFormData, type: e.target.value })}
                        required
                      >
                        <option value="news">أخبارنا (News)</option>
                        <option value="photo">الصور (Photos)</option>
                        <option value="video">الفيديو (Videos)</option>
                        <option value="audio">الصوتيات (Audios)</option>
                        <option value="info">معلومات تأمينية (Insurance Info)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>تاريخ النشر</label>
                      <input
                        type="datetime-local"
                        value={mediaFormData.published_date}
                        onChange={(e) => setMediaFormData({ ...mediaFormData, published_date: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label>الترتيب (الوزن)</label>
                      <input
                        type="number"
                        value={mediaFormData.sort_order}
                        onChange={(e) => setMediaFormData({ ...mediaFormData, sort_order: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                    <div className="form-group">
                      <label>العنوان باللغة العربية</label>
                      <input
                        type="text"
                        value={mediaFormData.title_ar}
                        onChange={(e) => setMediaFormData({ ...mediaFormData, title_ar: e.target.value })}
                        required
                        placeholder="العنوان بالعربية"
                      />
                    </div>
                    <div className="form-group">
                      <label>العنوان باللغة الإنجليزية</label>
                      <input
                        type="text"
                        value={mediaFormData.title_en}
                        onChange={(e) => setMediaFormData({ ...mediaFormData, title_en: e.target.value })}
                        placeholder="Title in English"
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                    <div className="form-group">
                      <label>الموقع الجغرافي بالعربية (للأخبار/الصور)</label>
                      <input
                        type="text"
                        value={mediaFormData.location_ar}
                        onChange={(e) => setMediaFormData({ ...mediaFormData, location_ar: e.target.value })}
                        placeholder="مثال: طرابلس، ليبيا"
                      />
                    </div>
                    <div className="form-group">
                      <label>الموقع الجغرافي بالإنجليزية</label>
                      <input
                        type="text"
                        value={mediaFormData.location_en}
                        onChange={(e) => setMediaFormData({ ...mediaFormData, location_en: e.target.value })}
                        placeholder="e.g., Tripoli, Libya"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>رابط فيديو يوتيوب أو الرابط الخارجي (لالفيديو فقط)</label>
                    <input
                      type="url"
                      value={mediaFormData.media_url}
                      onChange={(e) => setMediaFormData({ ...mediaFormData, media_url: e.target.value })}
                      placeholder="https://www.youtube.com/embed/..."
                    />
                  </div>

                  <div className="form-group">
                    <label>رفع ملف (صورة مميزة للأخبار/الصور، أو ملف صوتي/فيديو مباشر)</label>
                    {mediaFormData.media_url && !mediaFile && !mediaFormData.media_url.startsWith('http') && (
                      <p style={{ margin: "5px 0", fontSize: "0.85rem", color: "var(--accent)" }}>
                        يوجد ملف مرفوع مسبقاً: {mediaFormData.media_url}
                      </p>
                    )}
                    <input
                      type="file"
                      accept={mediaFormData.type === 'audio' ? 'audio/*' : mediaFormData.type === 'video' ? 'video/*' : 'image/*'}
                      onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                    <div className="form-group">
                      <label>المحتوى / التفاصيل باللغة العربية</label>
                      <textarea
                        value={mediaFormData.content_ar}
                        onChange={(e) => setMediaFormData({ ...mediaFormData, content_ar: e.target.value })}
                        rows={6}
                        placeholder="محتوى المنشور بالتفصيل..."
                      />
                    </div>
                    <div className="form-group">
                      <label>المحتوى / التفاصيل باللغة الإنجليزية</label>
                      <textarea
                        value={mediaFormData.content_en}
                        onChange={(e) => setMediaFormData({ ...mediaFormData, content_en: e.target.value })}
                        rows={6}
                        placeholder="Post content details in English..."
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <input
                      type="checkbox"
                      id="media_active"
                      checked={mediaFormData.is_active}
                      onChange={(e) => setMediaFormData({ ...mediaFormData, is_active: e.target.checked })}
                      style={{ width: "20px", height: "20px", cursor: "pointer" }}
                    />
                    <label htmlFor="media_active" style={{ cursor: "pointer", userSelect: "none" }}>منشور نشط ويظهر على الموقع</label>
                  </div>

                  <div style={{ display: "flex", gap: "12px", marginTop: "10px" }}>
                    <button type="submit" className="btn-submit" disabled={mediaPostsSaving}>
                      {mediaPostsSaving ? "جاري حفظ البيانات..." : "حفظ المنشور"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowMediaForm(false);
                        setEditingMediaPost(null);
                      }}
                      className="btn-submit"
                      style={{ background: "#64748b" }}
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              </div>
            )}

            {mediaPostsLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '200px', color: 'var(--accent-cyan)' }}>
                <i className="fa-solid fa-spinner fa-spin fa-2x" style={{ marginBottom: '15px' }}></i>
                <p>جاري تحميل المنشورات...</p>
              </div>
            ) : mediaPosts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>
                لا يوجد منشورات حالياً في المكتب الإعلامي.
              </div>
            ) : (
              <div className="table-wrapper" style={{ overflowX: "auto" }}>
                <table className="users-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ padding: "12px", textAlign: "right" }}>العنوان</th>
                      <th style={{ padding: "12px", textAlign: "center" }}>التصنيف</th>
                      <th style={{ padding: "12px", textAlign: "center" }}>الموقع</th>
                      <th style={{ padding: "12px", textAlign: "center" }}>المشاهدات</th>
                      <th style={{ padding: "12px", textAlign: "center" }}>الحالة</th>
                      <th style={{ padding: "12px", textAlign: "center" }}>الترتيب</th>
                      <th style={{ padding: "12px", textAlign: "center" }}>تاريخ النشر</th>
                      <th style={{ padding: "12px", textAlign: "center" }}>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mediaPosts.map((post) => {
                      const typeLabelMap: Record<string, string> = {
                        news: "أخبارنا",
                        photo: "الصور",
                        video: "الفيديو",
                        audio: "الصوتيات",
                        info: "معلومات تأمينية"
                      };
                      const typeLabel = typeLabelMap[post.type] || post.type;

                      return (
                        <tr key={post.id}>
                          <td style={{ padding: "12px", fontWeight: "bold" }}>{post.title_ar}</td>
                          <td style={{ padding: "12px", textAlign: "center" }}>
                            <span style={{
                              background: "rgba(30, 66, 159, 0.1)",
                              color: "var(--accent-cyan)",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              fontSize: "0.85rem",
                              fontWeight: "bold"
                            }}>
                              {typeLabel}
                            </span>
                          </td>
                          <td style={{ padding: "12px", textAlign: "center" }}>{post.location_ar || "-"}</td>
                          <td style={{ padding: "12px", textAlign: "center" }}>{post.views}</td>
                          <td style={{ padding: "12px", textAlign: "center" }}>
                            <span style={{
                              color: post.is_active ? "#139625" : "#e11d48",
                              fontWeight: "bold"
                            }}>
                              {post.is_active ? "نشط" : "غير نشط"}
                            </span>
                          </td>
                          <td style={{ padding: "12px", textAlign: "center" }}>{post.sort_order}</td>
                          <td style={{ padding: "12px", textAlign: "center" }}>
                            {post.published_date ? new Date(post.published_date).toLocaleDateString("ar-LY") : "-"}
                          </td>
                          <td style={{ padding: "12px", textAlign: "center" }}>
                            <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                              <button
                                onClick={() => handleMediaEdit(post)}
                                style={{
                                  background: "var(--accent-cyan)",
                                  color: "#ffffff",
                                  border: "none",
                                  borderRadius: "6px",
                                  padding: "6px 12px",
                                  cursor: "pointer",
                                  fontWeight: "bold"
                                }}
                              >
                                تعديل
                              </button>
                              <button
                                onClick={() => handleMediaDelete(post.id)}
                                style={{
                                  background: "#e11d48",
                                  color: "#ffffff",
                                  border: "none",
                                  borderRadius: "6px",
                                  padding: "6px 12px",
                                  cursor: "pointer",
                                  fontWeight: "bold"
                                }}
                              >
                                حذف
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 1: Settings */}
        {activeTab === "settings" && (
          <div>
            <h3 style={{ marginBottom: "20px" }}>تعديل معلومات التواصل والروابط الاجتماعية</h3>
            {settingsLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '250px', color: 'var(--accent-cyan)' }}>
                <i className="fa-solid fa-spinner fa-spin fa-2x" style={{ marginBottom: '15px' }}></i>
                <p style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>جارِ تحميل الإعدادات...</p>
              </div>
            ) : (
              <form onSubmit={handleSettingsSubmit} className="user-form" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <div className="form-group">
                  <label>رقم الهاتف المعروض في الموقع</label>
                  <input
                    type="text"
                    value={settings.phone}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                    placeholder="مثال: +218 920003366"
                  />
                </div>
                <div className="form-group">
                  <label>رقم الواتساب (Floating Icon)</label>
                  <input
                    type="text"
                    value={settings.whatsapp}
                    onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })}
                    placeholder="مثال: 218920003366 (بدون علامة +)"
                  />
                </div>
                <div className="form-group">
                  <label>البريد الإلكتروني للشركة</label>
                  <input
                    type="email"
                    value={settings.email}
                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                    placeholder="مثال: info@mli.ly"
                  />
                </div>
                <div className="form-group">
                  <label>عنوان وموقع الشركة</label>
                  <input
                    type="text"
                    value={settings.address_ar}
                    onChange={(e) => setSettings({ ...settings, address_ar: e.target.value })}
                    placeholder="مثال: طرابلس، ليبيا"
                  />
                </div>
                <div className="form-group">
                  <label>رابط فيس بوك</label>
                  <input
                    type="url"
                    value={settings.facebook_url}
                    onChange={(e) => setSettings({ ...settings, facebook_url: e.target.value })}
                    placeholder="https://facebook.com/..."
                  />
                </div>
                <div className="form-group">
                  <label>رابط تويتر (X)</label>
                  <input
                    type="url"
                    value={settings.twitter_url}
                    onChange={(e) => setSettings({ ...settings, twitter_url: e.target.value })}
                    placeholder="https://x.com/..."
                  />
                </div>
                <div className="form-group">
                  <label>رابط لينكد إن</label>
                  <input
                    type="url"
                    value={settings.linkedin_url}
                    onChange={(e) => setSettings({ ...settings, linkedin_url: e.target.value })}
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>
                <div className="form-group">
                  <label>رابط يوتيوب</label>
                  <input
                    type="url"
                    value={settings.youtube_url}
                    onChange={(e) => setSettings({ ...settings, youtube_url: e.target.value })}
                    placeholder="https://youtube.com/..."
                  />
                </div>
                <div className="form-group">
                  <label>رابط انستقرام</label>
                  <input
                    type="url"
                    value={settings.instagram_url}
                    onChange={(e) => setSettings({ ...settings, instagram_url: e.target.value })}
                    placeholder="https://instagram.com/..."
                  />
                </div>

                <div className="form-actions" style={{ gridColumn: "span 2", marginTop: "15px" }}>
                  <button type="submit" className="btn-submit" disabled={settingsSaving}>
                    {settingsSaving ? "جاري حفظ التعديلات..." : "حفظ التعديلات"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Tab 2: Sliders */}
        {activeTab === "sliders" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", alignItems: "center" }}>
              <h3>إدارة البنرات الإعلانية المتحركة (Sliders)</h3>
              <button className="primary" onClick={() => setShowSliderForm(true)}>
                <i className="fa-solid fa-plus"></i> إضافة بنر جديد
              </button>
            </div>

            {slidersLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '250px', color: 'var(--accent-cyan)' }}>
                <i className="fa-solid fa-spinner fa-spin fa-2x" style={{ marginBottom: '15px' }}></i>
                <p style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>جارِ تحميل البنرات...</p>
              </div>
            ) : sliders.length === 0 ? (
              <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "30px" }}>لا توجد بنرات إعلانية معروضة حالياً.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
                {sliders.map(slider => (
                  <div key={slider.id} style={{ border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden", display: "flex", flexDirection: "column", background: "var(--panel)" }}>
                    <div style={{ height: "160px", background: "#000", position: "relative" }}>
                      {slider.media_type === "image" ? (
                        <img src={resolveImageUrl(slider.media_url)} alt="slider" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <video src={resolveImageUrl(slider.media_url)} controls style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      )}
                      <span style={{ position: "absolute", top: "10px", right: "10px", background: "rgba(0,0,0,0.6)", color: "white", padding: "4px 8px", borderRadius: "15px", fontSize: "12px" }}>
                        الترتيب: {slider.order}
                      </span>
                    </div>
                    <div style={{ padding: "15px", flex: 1, display: "flex", flexDirection: "column", gap: "5px" }}>
                      <h4 style={{ margin: 0 }}>{slider.title_ar || "بدون عنوان عربي"}</h4>
                      <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "13px" }}>{slider.subtitle_ar || "بدون وصف عربي"}</p>
                      <div style={{ marginTop: "auto", paddingTop: "15px", display: "flex", justifyContent: "flex-end" }}>
                        <button
                          onClick={() => handleSliderDelete(slider.id)}
                          style={{ background: "#ef4444", color: "white", border: "none", padding: "8px 12px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px" }}
                        >
                          <i className="fa-solid fa-trash"></i> حذف البنر
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Slider Add Modal */}
            {showSliderForm && (
              <div className="modal" style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}>
                <div className="modal-content" style={{ background: "var(--panel)", borderRadius: "12px", width: "90%", maxWidth: "550px", padding: "25px" }} onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header" style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
                    <h3>إضافة بنر إعلاني جديد</h3>
                    <button className="modal-close" onClick={() => setShowSliderForm(false)} style={{ border: "none", background: "none", fontSize: "20px", cursor: "pointer" }}>&times;</button>
                  </div>
                  <form onSubmit={handleSliderSubmit} className="user-form">
                    <div className="form-group">
                      <label>نوع الوسائط <span className="required">*</span></label>
                      <select
                        value={sliderFormData.media_type}
                        onChange={(e) => setSliderFormData({ ...sliderFormData, media_type: e.target.value as "image" | "video" })}
                      >
                        <option value="image">صورة (Image)</option>
                        <option value="video">فيديو (Video)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>اختر الملف <span className="required">*</span></label>
                      <input
                        type="file"
                        accept={sliderFormData.media_type === "image" ? "image/*" : "video/*"}
                        onChange={(e) => setSliderFile(e.target.files?.[0] || null)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>العنوان باللغة العربية</label>
                      <input
                        type="text"
                        value={sliderFormData.title_ar}
                        onChange={(e) => setSliderFormData({ ...sliderFormData, title_ar: e.target.value })}
                        placeholder="العنوان الرئيسي العربي البارز"
                      />
                    </div>

                    <div className="form-group">
                      <label>العنوان باللغة الإنجليزية</label>
                      <input
                        type="text"
                        value={sliderFormData.title_en}
                        onChange={(e) => setSliderFormData({ ...sliderFormData, title_en: e.target.value })}
                        placeholder="English Main Title"
                      />
                    </div>

                    <div className="form-group">
                      <label>الوصف باللغة العربية</label>
                      <input
                        type="text"
                        value={sliderFormData.subtitle_ar}
                        onChange={(e) => setSliderFormData({ ...sliderFormData, subtitle_ar: e.target.value })}
                        placeholder="وصف فرعي قصير أسفل العنوان"
                      />
                    </div>

                    <div className="form-group">
                      <label>الوصف باللغة الإنجليزية</label>
                      <input
                        type="text"
                        value={sliderFormData.subtitle_en}
                        onChange={(e) => setSliderFormData({ ...sliderFormData, subtitle_en: e.target.value })}
                        placeholder="English Subtitle"
                      />
                    </div>

                    <div className="form-group">
                      <label>الترتيب (الأولوية)</label>
                      <input
                        type="number"
                        value={sliderFormData.sort_order}
                        onChange={(e) => setSliderFormData({ ...sliderFormData, sort_order: parseInt(e.target.value) || 0 })}
                      />
                    </div>

                    <div className="form-actions" style={{ marginTop: "20px" }}>
                      <button type="button" className="btn-cancel" onClick={() => setShowSliderForm(false)}>إلغاء</button>
                      <button type="submit" className="btn-submit" disabled={sliderSaving}>
                        {sliderSaving ? "جاري الإضافة..." : "إضافة البنر"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Homepage Services */}
        {activeTab === "services" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "25px", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>تعديل كروت الخدمات بالصفحة الرئيسية</h3>
              <button className="primary" onClick={() => setShowServiceForm(true)} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <i className="fa-solid fa-plus"></i> إضافة خدمة جديدة
              </button>
            </div>
            {servicesLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '250px', color: 'var(--accent-cyan)' }}>
                <i className="fa-solid fa-spinner fa-spin fa-2x" style={{ marginBottom: '15px' }}></i>
                <p style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>جارِ تحميل كروت الخدمات...</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "20px" }}>
                {services.map(service => (
                  <div key={service.id} style={{ border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden", display: "flex", flexDirection: "column", background: "var(--panel)" }}>
                    <div style={{ height: "130px", position: "relative", background: "#ccc" }}>
                      {service.image_url ? (
                        <img src={resolveImageUrl(service.image_url)} alt={service.title_ar} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#f3f4f6" }}>
                          <i className="fa-solid fa-image fa-2x" style={{ opacity: 0.3 }}></i>
                        </div>
                      )}
                      <div style={{ position: "absolute", top: "10px", left: "10px", background: "var(--accent-cyan)", color: "white", width: "35px", height: "35px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <i className={service.icon}></i>
                      </div>
                    </div>
                    <div style={{ padding: "15px", flex: 1, display: "flex", flexDirection: "column", gap: "5px" }}>
                      <h4 style={{ margin: 0 }}>{service.title_ar}</h4>
                      <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "12px", height: "55px", overflow: "hidden", textOverflow: "ellipsis" }}>{service.desc_ar}</p>
                      
                      <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
                        <button
                          onClick={() => setEditService(service)}
                          style={{ flex: 1, background: "var(--accent-cyan)", color: "white", border: "none", padding: "8px 10px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px" }}
                        >
                          <i className="fa-solid fa-pen-to-square"></i> تعديل الخدمة
                        </button>
                        <button
                          onClick={() => handleServiceDelete(service.id)}
                          style={{ background: "#ef4444", color: "white", border: "none", padding: "8px 12px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                          title="حذف الخدمة"
                        >
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Service Modal */}
            {showServiceForm && (
              <div className="modal" style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}>
                <div className="modal-content" style={{ background: "var(--panel)", borderRadius: "12px", width: "90%", maxWidth: "550px", padding: "25px" }} onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header" style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
                    <h3>إضافة خدمة جديدة بالصفحة الرئيسية</h3>
                    <button className="modal-close" onClick={() => setShowServiceForm(false)} style={{ border: "none", background: "none", fontSize: "20px", cursor: "pointer" }}>&times;</button>
                  </div>
                  <form onSubmit={handleCreateServiceSubmit} className="user-form">
                    <div className="form-group">
                      <label>اسم الخدمة باللغة العربية <span className="required">*</span></label>
                      <input
                        type="text"
                        value={serviceFormData.title_ar}
                        onChange={(e) => setServiceFormData({ ...serviceFormData, title_ar: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>اسم الخدمة باللغة الإنجليزية <span className="required">*</span></label>
                      <input
                        type="text"
                        value={serviceFormData.title_en}
                        onChange={(e) => setServiceFormData({ ...serviceFormData, title_en: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>الوصف باللغة العربية <span className="required">*</span></label>
                      <textarea
                        value={serviceFormData.desc_ar}
                        onChange={(e) => setServiceFormData({ ...serviceFormData, desc_ar: e.target.value })}
                        rows={3}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>الوصف باللغة الإنجليزية <span className="required">*</span></label>
                      <textarea
                        value={serviceFormData.desc_en}
                        onChange={(e) => setServiceFormData({ ...serviceFormData, desc_en: e.target.value })}
                        rows={3}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>أيقونة الخدمة (Class FontAwesome) <span className="required">*</span></label>
                      <input
                        type="text"
                        value={serviceFormData.icon}
                        onChange={(e) => setServiceFormData({ ...serviceFormData, icon: e.target.value })}
                        placeholder="مثال: fas fa-car"
                        required
                      />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                      <div className="form-group">
                        <label>الترتيب (الأولوية)</label>
                        <input
                          type="number"
                          value={serviceFormData.sort_order}
                          onChange={(e) => setServiceFormData({ ...serviceFormData, sort_order: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="form-group">
                        <label>صورة الخلفية للخدمة <span className="required">*</span></label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setServiceFile(e.target.files?.[0] || null)}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-actions" style={{ marginTop: "20px" }}>
                      <button type="button" className="btn-cancel" onClick={() => setShowServiceForm(false)}>إلغاء</button>
                      <button type="submit" className="btn-submit" disabled={serviceSaving}>
                        {serviceSaving ? "جاري الإضافة..." : "إضافة الخدمة"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}


            {/* Edit Service Modal */}
            {editService && (
              <div className="modal" style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}>
                <div className="modal-content" style={{ background: "var(--panel)", borderRadius: "12px", width: "90%", maxWidth: "550px", padding: "25px" }} onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header" style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
                    <h3>تعديل خدمة: {editService.title_ar}</h3>
                    <button className="modal-close" onClick={() => setEditService(null)} style={{ border: "none", background: "none", fontSize: "20px", cursor: "pointer" }}>&times;</button>
                  </div>
                  <form onSubmit={handleServiceSubmit} className="user-form">
                    <div className="form-group">
                      <label>اسم الخدمة باللغة العربية <span className="required">*</span></label>
                      <input
                        type="text"
                        value={editService.title_ar}
                        onChange={(e) => setEditService({ ...editService, title_ar: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>اسم الخدمة باللغة الإنجليزية <span className="required">*</span></label>
                      <input
                        type="text"
                        value={editService.title_en}
                        onChange={(e) => setEditService({ ...editService, title_en: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>الوصف باللغة العربية <span className="required">*</span></label>
                      <textarea
                        value={editService.desc_ar}
                        onChange={(e) => setEditService({ ...editService, desc_ar: e.target.value })}
                        rows={3}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>الوصف باللغة الإنجليزية <span className="required">*</span></label>
                      <textarea
                        value={editService.desc_en}
                        onChange={(e) => setEditService({ ...editService, desc_en: e.target.value })}
                        rows={3}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>أيقونة الخدمة (Class FontAwesome) <span className="required">*</span></label>
                      <input
                        type="text"
                        value={editService.icon}
                        onChange={(e) => setEditService({ ...editService, icon: e.target.value })}
                        placeholder="مثال: fas fa-car"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>صورة الخلفية للخدمة (اختياري لتحميل صورة جديدة)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setServiceFile(e.target.files?.[0] || null)}
                      />
                    </div>

                    <div className="form-actions" style={{ marginTop: "20px" }}>
                      <button type="button" className="btn-cancel" onClick={() => setEditService(null)}>إلغاء</button>
                      <button type="submit" className="btn-submit" disabled={serviceSaving}>
                        {serviceSaving ? "جاري الحفظ..." : "حفظ التعديلات"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Insurance Types */}
        {activeTab === "insurances" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "25px", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>تعديل تفاصيل وثائق التأمين بصفحة التأمينات</h3>
              <button className="primary" onClick={() => setShowInsuranceForm(true)} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <i className="fa-solid fa-plus"></i> إضافة وثيقة جديدة
              </button>
            </div>
            {insurancesLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '250px', color: 'var(--accent-cyan)' }}>
                <i className="fa-solid fa-spinner fa-spin fa-2x" style={{ marginBottom: '15px' }}></i>
                <p style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>جارِ تحميل وثائق التأمين...</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
                {insurances.map(insurance => (
                  <div key={insurance.id} style={{ border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden", display: "flex", flexDirection: "column", background: "var(--panel)" }}>
                    <div style={{ height: "140px", position: "relative", background: "#ccc" }}>
                      {insurance.image_url ? (
                        <img src={resolveImageUrl(insurance.image_url)} alt={insurance.title_ar} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#f3f4f6" }}>
                          <i className="fa-solid fa-image fa-2x" style={{ opacity: 0.3 }}></i>
                        </div>
                      )}
                      <span style={{ position: "absolute", bottom: "10px", right: "10px", background: insurance.color, color: "white", padding: "4px 8px", borderRadius: "8px", fontSize: "12px" }}>
                        <i className={insurance.icon} style={{ marginLeft: "5px" }}></i>
                        {insurance.title_ar}
                      </span>
                    </div>
                    <div style={{ padding: "15px", flex: 1, display: "flex", flexDirection: "column", gap: "5px" }}>
                      <h4 style={{ margin: 0 }}>{insurance.title_ar}</h4>
                      <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "12px", height: "45px", overflow: "hidden", textOverflow: "ellipsis" }}>{insurance.description_ar}</p>
                      
                      <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
                        <button
                          onClick={() => setEditInsurance(insurance)}
                          style={{ flex: 1, background: "var(--accent-cyan)", color: "white", border: "none", padding: "8px 10px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px" }}
                        >
                          <i className="fa-solid fa-pen-to-square"></i> تعديل تفاصيل الوثيقة
                        </button>
                        <button
                          onClick={() => handleInsuranceDelete(insurance.id)}
                          style={{ background: "#ef4444", color: "white", border: "none", padding: "8px 12px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                          title="حذف نوع التأمين"
                        >
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Insurance Modal */}
            {showInsuranceForm && (
              <div className="modal" style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}>
                <div className="modal-content" style={{ background: "var(--panel)", borderRadius: "12px", width: "90%", maxWidth: "650px", maxHeight: "95vh", overflowY: "auto", padding: "25px" }} onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header" style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
                    <h3>إضافة وثيقة تأمين جديدة بصفحة التأمينات</h3>
                    <button className="modal-close" onClick={() => setShowInsuranceForm(false)} style={{ border: "none", background: "none", fontSize: "20px", cursor: "pointer" }}>&times;</button>
                  </div>
                  <form onSubmit={handleCreateInsuranceSubmit} className="user-form">
                    <div className="form-group">
                      <label>اسم التأمين باللغة العربية <span className="required">*</span></label>
                      <input
                        type="text"
                        value={insuranceFormData.title_ar}
                        onChange={(e) => setInsuranceFormData({ ...insuranceFormData, title_ar: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>اسم التأمين باللغة الإنجليزية <span className="required">*</span></label>
                      <input
                        type="text"
                        value={insuranceFormData.title_en}
                        onChange={(e) => setInsuranceFormData({ ...insuranceFormData, title_en: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>وصف مختصر باللغة العربية <span className="required">*</span></label>
                      <input
                        type="text"
                        value={insuranceFormData.description_ar}
                        onChange={(e) => setInsuranceFormData({ ...insuranceFormData, description_ar: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>وصف مختصر باللغة الإنجليزية <span className="required">*</span></label>
                      <input
                        type="text"
                        value={insuranceFormData.description_en}
                        onChange={(e) => setInsuranceFormData({ ...insuranceFormData, description_en: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ gridColumn: "span 2" }}>
                      <label>التفاصيل الكاملة والبنود باللغة العربية</label>
                      <textarea
                        value={insuranceFormData.details_ar}
                        onChange={(e) => setInsuranceFormData({ ...insuranceFormData, details_ar: e.target.value })}
                        rows={8}
                        style={{ fontFamily: "monospace", fontSize: "13px" }}
                      />
                    </div>
                    <div className="form-group" style={{ gridColumn: "span 2" }}>
                      <label>التفاصيل الكاملة والبنود باللغة الإنجليزية</label>
                      <textarea
                        value={insuranceFormData.details_en}
                        onChange={(e) => setInsuranceFormData({ ...insuranceFormData, details_en: e.target.value })}
                        rows={8}
                        style={{ fontFamily: "monospace", fontSize: "13px" }}
                      />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", width: "100%" }}>
                      <div className="form-group">
                        <label>الأيقونة (Class FontAwesome)</label>
                        <input
                          type="text"
                          value={insuranceFormData.icon}
                          onChange={(e) => setInsuranceFormData({ ...insuranceFormData, icon: e.target.value })}
                          placeholder="مثال: fas fa-shield-alt"
                        />
                      </div>
                      <div className="form-group">
                        <label>لون الأيقونة المميز (HEX)</label>
                        <input
                          type="text"
                          value={insuranceFormData.color}
                          onChange={(e) => setInsuranceFormData({ ...insuranceFormData, color: e.target.value })}
                          placeholder="#3b82f6"
                        />
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", width: "100%" }}>
                      <div className="form-group">
                        <label>الترتيب (الأولوية)</label>
                        <input
                          type="number"
                          value={insuranceFormData.sort_order}
                          onChange={(e) => setInsuranceFormData({ ...insuranceFormData, sort_order: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="form-group">
                        <label>صورة التأمين <span className="required">*</span></label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setInsuranceFile(e.target.files?.[0] || null)}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-actions" style={{ marginTop: "20px" }}>
                      <button type="button" className="btn-cancel" onClick={() => setShowInsuranceForm(false)}>إلغاء</button>
                      <button type="submit" className="btn-submit" disabled={insuranceSaving}>
                        {insuranceSaving ? "جاري الإضافة..." : "إضافة وثيقة"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}


            {/* Edit Insurance Modal */}
            {editInsurance && (
              <div className="modal" style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}>
                <div className="modal-content" style={{ background: "var(--panel)", borderRadius: "12px", width: "90%", maxWidth: "650px", maxHeight: "95vh", overflowY: "auto", padding: "25px" }} onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header" style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
                    <h3>تعديل وثيقة: {editInsurance.title_ar}</h3>
                    <button className="modal-close" onClick={() => setEditInsurance(null)} style={{ border: "none", background: "none", fontSize: "20px", cursor: "pointer" }}>&times;</button>
                  </div>
                  <form onSubmit={handleInsuranceSubmit} className="user-form">
                    <div className="form-group">
                      <label>اسم التأمين باللغة العربية <span className="required">*</span></label>
                      <input
                        type="text"
                        value={editInsurance.title_ar}
                        onChange={(e) => setEditInsurance({ ...editInsurance, title_ar: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>اسم التأمين باللغة الإنجليزية <span className="required">*</span></label>
                      <input
                        type="text"
                        value={editInsurance.title_en}
                        onChange={(e) => setEditInsurance({ ...editInsurance, title_en: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>وصف مختصر باللغة العربية <span className="required">*</span></label>
                      <input
                        type="text"
                        value={editInsurance.description_ar}
                        onChange={(e) => setEditInsurance({ ...editInsurance, description_ar: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>وصف مختصر باللغة الإنجليزية <span className="required">*</span></label>
                      <input
                        type="text"
                        value={editInsurance.description_en}
                        onChange={(e) => setEditInsurance({ ...editInsurance, description_en: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ gridColumn: "span 2" }}>
                      <label>التفاصيل الكاملة والبنود باللغة العربية</label>
                      <textarea
                        value={editInsurance.details_ar || ""}
                        onChange={(e) => setEditInsurance({ ...editInsurance, details_ar: e.target.value })}
                        rows={8}
                        style={{ fontFamily: "monospace", fontSize: "13px" }}
                      />
                    </div>
                    <div className="form-group" style={{ gridColumn: "span 2" }}>
                      <label>التفاصيل الكاملة والبنود باللغة الإنجليزية</label>
                      <textarea
                        value={editInsurance.details_en || ""}
                        onChange={(e) => setEditInsurance({ ...editInsurance, details_en: e.target.value })}
                        rows={8}
                        style={{ fontFamily: "monospace", fontSize: "13px" }}
                      />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", width: "100%" }}>
                      <div className="form-group">
                        <label>الأيقونة (Class FontAwesome)</label>
                        <input
                          type="text"
                          value={editInsurance.icon}
                          onChange={(e) => setEditInsurance({ ...editInsurance, icon: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label>لون الأيقونة المميز (HEX)</label>
                        <input
                          type="text"
                          value={editInsurance.color}
                          onChange={(e) => setEditInsurance({ ...editInsurance, color: e.target.value })}
                          placeholder="#ffffff"
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>صورة التأمين (اختياري لتحميل صورة جديدة)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setInsuranceFile(e.target.files?.[0] || null)}
                      />
                    </div>

                    <div className="form-actions" style={{ marginTop: "20px" }}>
                      <button type="button" className="btn-cancel" onClick={() => setEditInsurance(null)}>إلغاء</button>
                      <button type="submit" className="btn-submit" disabled={insuranceSaving}>
                        {insuranceSaving ? "جاري الحفظ..." : "حفظ التعديلات"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
