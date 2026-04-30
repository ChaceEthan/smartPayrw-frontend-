// @ts-nocheck
import { PiggyBank, Users, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";
import formatCurrency from "../utils/formatCurrency.js";

const sampleGrossPayroll = 2600000;
const employeeRate = 0.06;
const employerRate = 0.06;

function percent(value) {
  return `${Math.round(value * 100)}%`;
}

export default function Pension() {
  const { t } = useTranslation();
  const employeeShare = sampleGrossPayroll * employeeRate;
  const employerShare = sampleGrossPayroll * employerRate;

  const cards = [
    {
      icon: Users,
      label: t("pension.employeeShare"),
      value: formatCurrency(employeeShare),
      caption: t("pension.employeeCaption", { rate: percent(employeeRate) }),
    },
    {
      icon: Wallet,
      label: t("pension.employerShare"),
      value: formatCurrency(employerShare),
      caption: t("pension.employerCaption", { rate: percent(employerRate) }),
    },
    {
      icon: PiggyBank,
      label: t("pension.total"),
      value: formatCurrency(employeeShare + employerShare),
      caption: t("pension.totalCaption"),
    },
  ];

  return (
    <section className="panel">
      <div className="section-heading">
        <p className="eyebrow">{t("pension.eyebrow")}</p>
        <h2>{t("pension.title")}</h2>
        <p>{t("pension.description")}</p>
      </div>

      <div className="analytics-grid grid gap-4 sm:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <article className="stat-card analytics-card" key={card.label}>
              <div className="card-icon" aria-hidden="true">
                <Icon size={20} strokeWidth={2.2} />
              </div>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <p>{card.caption}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
