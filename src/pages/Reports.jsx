// @ts-nocheck
import { Download, FileText, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Reports() {
  const { t } = useTranslation();
  const reports = [
    {
      icon: FileText,
      title: t("reports.payrollTitle"),
      text: t("reports.payrollText"),
    },
    {
      icon: ShieldCheck,
      title: t("reports.complianceTitle"),
      text: t("reports.complianceText"),
    },
    {
      icon: Download,
      title: t("reports.paymentTitle"),
      text: t("reports.paymentText"),
    },
  ];

  return (
    <section className="panel">
      <div className="section-heading">
        <p className="eyebrow">{t("reports.eyebrow")}</p>
        <h2>{t("reports.title")}</h2>
        <p>{t("reports.description")}</p>
      </div>

      <div className="compliance-grid">
        {reports.map((report) => {
          const Icon = report.icon;

          return (
            <article className="compliance-card" key={report.title}>
              <div className="card-icon" aria-hidden="true">
                <Icon size={20} strokeWidth={2.2} />
              </div>
              <h4>{report.title}</h4>
              <p>{report.text}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
