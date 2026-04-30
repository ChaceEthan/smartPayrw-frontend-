import { useTranslation } from "react-i18next";

export default function Loader({ label }) {
  const { t } = useTranslation();

  return (
    <div className="loader" role="status" aria-live="polite">
      <span className="loader__spinner" />
      <span>{label || t("common.loading")}</span>
    </div>
  );
}
