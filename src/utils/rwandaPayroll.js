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

function roundCurrency(value) {
  return Math.max(0, Math.round(Number(value || 0)));
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

export function buildPayrollAiContext(tinAnalysis) {
  return {
    systemPrompt: SMARTPAY_SYSTEM_PROMPT,
    rules: RWANDA_PAYROLL_RULES,
    tinAnalysis: tinAnalysis || null,
  };
}
