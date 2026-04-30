// @ts-nocheck
export const SMARTPAY_SYSTEM_PROMPT =
  "You are a SmartPayRW payroll assistant helping businesses manage taxes, employees, and compliance in Rwanda.";

export const PAYROLL_CONTEXT_LABEL = "SmartPayRW payroll assistant";

export const RWANDA_PAYROLL_RULES = {
  currency: "RWF",
  payeBands: [
    { from: 0, to: 60000, rate: 0 },
    { from: 60001, to: 100000, rate: 0.1 },
    { from: 100001, to: 200000, rate: 0.2 },
    { from: 200001, to: null, rate: 0.3 },
  ],
  employee: {
    pension: 0.06,
    maternity: 0.003,
    cbhi: 0.005,
  },
  employer: {
    pension: 0.06,
    maternity: 0.003,
    occupationalHazard: 0.02,
  },
  deadlines: {
    paye: "15th day of the following month",
    rssb: "15th day of the following month",
  },
};

const sectors = [
  "Professional services",
  "Retail and distribution",
  "Construction",
  "Hospitality",
  "Technology services",
  "Manufacturing",
  "Transport and logistics",
];

function roundCurrency(value) {
  return Math.max(0, Math.round(Number(value || 0)));
}

function hashTin(tin) {
  return String(tin)
    .split("")
    .reduce((total, character, index) => total + Number(character || 0) * (index + 3), 0);
}

export function formatRwf(value) {
  return new Intl.NumberFormat("en-RW", {
    style: "currency",
    currency: "RWF",
    maximumFractionDigits: 0,
  }).format(roundCurrency(value));
}

export function calculatePaye(grossSalary) {
  const taxableIncome = roundCurrency(grossSalary);

  if (taxableIncome <= 60000) {
    return 0;
  }

  if (taxableIncome <= 100000) {
    return roundCurrency((taxableIncome - 60000) * 0.1);
  }

  if (taxableIncome <= 200000) {
    return roundCurrency(40000 * 0.1 + (taxableIncome - 100000) * 0.2);
  }

  return roundCurrency(40000 * 0.1 + 100000 * 0.2 + (taxableIncome - 200000) * 0.3);
}

export function calculatePayrollForSalary(grossSalary) {
  const gross = roundCurrency(grossSalary);
  const paye = calculatePaye(gross);
  const employeePension = roundCurrency(gross * RWANDA_PAYROLL_RULES.employee.pension);
  const employeeMaternity = roundCurrency(gross * RWANDA_PAYROLL_RULES.employee.maternity);
  const netBeforeCbhi = roundCurrency(gross - paye - employeePension - employeeMaternity);
  const cbhi = roundCurrency(netBeforeCbhi * RWANDA_PAYROLL_RULES.employee.cbhi);
  const netPay = roundCurrency(netBeforeCbhi - cbhi);
  const employerPension = roundCurrency(gross * RWANDA_PAYROLL_RULES.employer.pension);
  const employerMaternity = roundCurrency(gross * RWANDA_PAYROLL_RULES.employer.maternity);
  const occupationalHazard = roundCurrency(gross * RWANDA_PAYROLL_RULES.employer.occupationalHazard);

  return {
    gross,
    paye,
    employeePension,
    employeeMaternity,
    cbhi,
    netPay,
    employerPension,
    employerMaternity,
    occupationalHazard,
    employeeDeductions: roundCurrency(paye + employeePension + employeeMaternity + cbhi),
    employerContributions: roundCurrency(employerPension + employerMaternity + occupationalHazard),
    totalRemittance: roundCurrency(
      paye + employeePension + employeeMaternity + cbhi + employerPension + employerMaternity + occupationalHazard
    ),
    employerCost: roundCurrency(gross + employerPension + employerMaternity + occupationalHazard),
  };
}

export function calculateCompanyPayroll(employeeCount, averageSalary) {
  const perEmployee = calculatePayrollForSalary(averageSalary);

  return {
    employeeCount,
    averageSalary: roundCurrency(averageSalary),
    grossPayroll: roundCurrency(perEmployee.gross * employeeCount),
    paye: roundCurrency(perEmployee.paye * employeeCount),
    employeePension: roundCurrency(perEmployee.employeePension * employeeCount),
    employeeMaternity: roundCurrency(perEmployee.employeeMaternity * employeeCount),
    cbhi: roundCurrency(perEmployee.cbhi * employeeCount),
    netPay: roundCurrency(perEmployee.netPay * employeeCount),
    employerPension: roundCurrency(perEmployee.employerPension * employeeCount),
    employerMaternity: roundCurrency(perEmployee.employerMaternity * employeeCount),
    occupationalHazard: roundCurrency(perEmployee.occupationalHazard * employeeCount),
    employeeDeductions: roundCurrency(perEmployee.employeeDeductions * employeeCount),
    employerContributions: roundCurrency(perEmployee.employerContributions * employeeCount),
    totalRemittance: roundCurrency(perEmployee.totalRemittance * employeeCount),
    employerCost: roundCurrency(perEmployee.employerCost * employeeCount),
  };
}

export function normalizeTin(tin) {
  return String(tin || "").replace(/\D/g, "").slice(0, 9);
}

export function simulateTinAnalysis(tin) {
  const normalizedTin = normalizeTin(tin);
  const isValid = /^\d{9}$/.test(normalizedTin) && !/^(\d)\1+$/.test(normalizedTin);
  const seed = hashTin(normalizedTin);
  const employeeCount = isValid ? (seed % 34) + 4 : 0;
  const averageSalary = isValid ? 180000 + (seed % 9) * 55000 : 0;
  const payrollSummary = calculateCompanyPayroll(employeeCount, averageSalary);
  const lateMonths = isValid ? seed % 3 : 0;
  const estimatedLateSurcharge = roundCurrency(payrollSummary.totalRemittance * lateMonths * 0.015);
  const estimatedUnderpayment = seed % 5 === 0 ? roundCurrency(payrollSummary.paye * 0.08) : 0;

  return {
    source: "simulation",
    tin: normalizedTin,
    isValid,
    companyName: isValid ? `${sectors[seed % sectors.length]} Rwanda ${normalizedTin.slice(-3)} Ltd` : "",
    sector: isValid ? sectors[seed % sectors.length] : "",
    registrationStatus: isValid ? "active" : "invalid",
    riskLevel: !isValid || lateMonths > 1 || estimatedUnderpayment > 0 ? "medium" : "low",
    employeeCount,
    averageSalary,
    payrollSummary,
    obligations: [
      "paye",
      "pensionEmployee",
      "pensionEmployer",
      "maternity",
      "occupationalHazard",
      "cbhi",
      "medicalScheme",
      "unifiedDeclaration",
    ],
    liabilities: [
      {
        key: "lateSurcharge",
        amount: estimatedLateSurcharge,
        applies: lateMonths > 0,
        months: lateMonths,
      },
      {
        key: "underpayment",
        amount: estimatedUnderpayment,
        applies: estimatedUnderpayment > 0,
      },
    ],
  };
}

export function buildPayrollAiContext(tinAnalysis) {
  return {
    systemPrompt: SMARTPAY_SYSTEM_PROMPT,
    rules: RWANDA_PAYROLL_RULES,
    tinAnalysis: tinAnalysis || null,
  };
}

export function extractSalaryFromMessage(message) {
  const compact = String(message || "").replace(/,/g, "");
  const matches = compact.match(/\d{5,}/g);

  if (!matches?.length) {
    return null;
  }

  return roundCurrency(matches[0]);
}

export function buildLocalPayrollResponse({ message, tinAnalysis, t }) {
  const normalizedMessage = String(message || "").toLowerCase();
  const salaryFromMessage = extractSalaryFromMessage(message);
  const salary = salaryFromMessage || tinAnalysis?.averageSalary || 500000;
  const payroll = calculatePayrollForSalary(salary);

  if (normalizedMessage.includes("tin") || normalizedMessage.includes("tax identification")) {
    if (tinAnalysis?.isValid) {
      return t("chat.local.tinAnswer", {
        tin: tinAnalysis.tin,
        company: tinAnalysis.companyName,
        employees: tinAnalysis.employeeCount,
        gross: formatRwf(tinAnalysis.payrollSummary.grossPayroll),
        remittance: formatRwf(tinAnalysis.payrollSummary.totalRemittance),
        risk: t(`tin.risk.${tinAnalysis.riskLevel}`),
      });
    }

    return t("chat.local.tinMissing");
  }

  if (
    normalizedMessage.includes("tax") ||
    normalizedMessage.includes("paye") ||
    normalizedMessage.includes("rssb") ||
    normalizedMessage.includes("deduction")
  ) {
    return t("chat.local.taxAnswer", {
      gross: formatRwf(payroll.gross),
      paye: formatRwf(payroll.paye),
      pension: formatRwf(payroll.employeePension),
      maternity: formatRwf(payroll.employeeMaternity),
      cbhi: formatRwf(payroll.cbhi),
      net: formatRwf(payroll.netPay),
      employer: formatRwf(payroll.employerContributions),
      remittance: formatRwf(payroll.totalRemittance),
    });
  }

  if (
    normalizedMessage.includes("obligation") ||
    normalizedMessage.includes("compliance") ||
    normalizedMessage.includes("employee")
  ) {
    return t("chat.local.obligationsAnswer");
  }

  return t("chat.local.runPayrollAnswer");
}
