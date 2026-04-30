// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { BadgeCheck, BriefcaseBusiness, Building2, ReceiptText } from "lucide-react";
import useAuth from "../hooks/useAuth.js";
import { registerCompanyRequest } from "../services/company.api.js";
import { getActiveCompany, hasCompany, normalizeCompany, saveStoredCompany } from "../utils/companyData.js";

function DetailItem({ icon: Icon, label, value }) {
  return (
    <div className="detail-item">
      <span className="card-icon" aria-hidden="true">
        <Icon size={20} strokeWidth={2.2} />
      </span>
      <div>
        <span>{label}</span>
        <strong>{value || "-"}</strong>
      </div>
    </div>
  );
}

export default function Company() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { refreshUser, user } = useAuth();
  const [company, setCompany] = useState(() => getActiveCompany(user));
  const [form, setForm] = useState({
    name: "",
    tin: "",
    businessType: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const activeCompany = getActiveCompany(user);
    setCompany(activeCompany);

    if (activeCompany) {
      setForm((current) => ({
        name: current.name || activeCompany.name || "",
        tin: current.tin || activeCompany.tin || "",
        businessType: current.businessType || activeCompany.businessType || "",
      }));
    }
  }, [user]);

  const canSubmit = useMemo(
    () => form.name.trim() && form.tin.trim() && form.businessType.trim(),
    [form.businessType, form.name, form.tin]
  );

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!canSubmit) {
      setError(t("company.validation"));
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        name: form.name.trim(),
        tin: form.tin.trim(),
        businessType: form.businessType.trim(),
      };
      const { data } = await registerCompanyRequest(payload);
      const registeredCompany = saveStoredCompany(normalizeCompany(data) || payload);

      setCompany(registeredCompany);
      setSuccess(t("company.success"));

      try {
        await refreshUser();
      } catch {
        // The registered company has already been saved locally for this session.
      }

      window.setTimeout(() => {
        navigate("/", { replace: true, state: { notice: t("company.success") } });
      }, 700);
    } catch (err) {
      setError(err.response?.data?.message || "Network error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="page-grid company-page">
      <section className="hero-card company-hero">
        <div>
          <p className="eyebrow">{t("company.eyebrow")}</p>
          <h2>{t("company.title")}</h2>
          <p>{t("company.description")}</p>
        </div>
      </section>

      <section className="company-layout">
        <form className="panel company-form" onSubmit={handleSubmit}>
          <div className="section-heading">
            <p className="eyebrow">{t("company.formEyebrow")}</p>
            <h3>{t("company.formTitle")}</h3>
          </div>

          <label>
            {t("company.name")}
            <input
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder={t("company.namePlaceholder")}
            />
          </label>

          <label>
            {t("company.tin")}
            <input
              inputMode="numeric"
              value={form.tin}
              onChange={(event) => updateField("tin", event.target.value)}
              placeholder={t("company.tinPlaceholder")}
              maxLength={14}
            />
            <small className="field-helper">{t("company.tinHelper")}</small>
          </label>

          <label>
            {t("company.businessType")}
            <input
              value={form.businessType}
              onChange={(event) => updateField("businessType", event.target.value)}
              placeholder={t("company.businessTypePlaceholder")}
            />
            <small className="field-helper">{t("company.businessTypeHelper")}</small>
          </label>

          <button type="submit" className="button button--primary company-submit" disabled={isSubmitting}>
            {isSubmitting ? t("company.submitting") : t("company.submit")}
          </button>

          {error && <div className="alert alert--error">{error}</div>}
          {success && <div className="alert alert--success">{success}</div>}
        </form>

        <aside className="panel company-profile">
          <div className="section-heading">
            <p className="eyebrow">{t("company.profileEyebrow")}</p>
            <h3>{hasCompany(company) ? t("company.profileTitle") : t("company.emptyTitle")}</h3>
            <p>{hasCompany(company) ? t("company.profileDescription") : t("company.emptyMessage")}</p>
          </div>

          {hasCompany(company) && (
            <div className="detail-grid">
              <DetailItem icon={Building2} label={t("company.name")} value={company.name} />
              <DetailItem icon={ReceiptText} label={t("company.tin")} value={company.tin} />
              <DetailItem icon={BriefcaseBusiness} label={t("company.businessType")} value={company.businessType} />
              <DetailItem icon={BadgeCheck} label={t("company.status")} value={t("company.registered")} />
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}
