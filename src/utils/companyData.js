// @ts-nocheck
const COMPANY_STORAGE_KEY = "smartpayrw.company";
const EMPLOYEES_STORAGE_KEY = "smartpayrw.employees";

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function readJson(key, fallback) {
  if (!canUseStorage()) {
    return fallback;
  }

  try {
    const storedValue = window.localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : fallback;
  } catch {
    window.localStorage.removeItem(key);
    return fallback;
  }
}

function writeJson(key, value) {
  if (canUseStorage()) {
    window.localStorage.setItem(key, JSON.stringify(value));
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function firstObject(...values) {
  return values.find((value) => isPlainObject(value)) || null;
}

function pickPayload(data, keys) {
  const root = firstObject(data?.data, data) || {};

  for (const key of keys) {
    if (isPlainObject(root[key])) {
      return root[key];
    }

    if (isPlainObject(root.data?.[key])) {
      return root.data[key];
    }
  }

  return root;
}

export function toNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const numeric = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
}

export function normalizeCompany(data) {
  const source = pickPayload(data, ["company", "business", "organization", "profile"]);

  if (!isPlainObject(source)) {
    return null;
  }

  const name =
    source.companyName ||
    source.businessName ||
    source.legalName ||
    source.organizationName ||
    source.name ||
    "";
  const tin = String(
    source.tin || source.TIN || source.taxIdentificationNumber || source.taxId || source.companyTin || ""
  ).trim();
  const businessType = source.businessType || source.type || source.sector || source.industry || "";

  if (!name && !tin && !businessType) {
    return null;
  }

  return {
    id: source.id || source._id || source.companyId || null,
    name,
    tin,
    businessType,
    phone: source.phone || source.phoneNumber || "",
    email: source.email || source.companyEmail || "",
    address: source.address || source.location || "",
    registeredAt: source.registeredAt || source.createdAt || new Date().toISOString(),
    raw: source,
  };
}

export function getCompanyFromUser(user) {
  return (
    normalizeCompany(user?.company) ||
    normalizeCompany(user?.business) ||
    normalizeCompany(user?.organization) ||
    normalizeCompany({
      companyName: user?.companyName || user?.businessName || user?.organizationName,
      tin: user?.tin || user?.TIN || user?.companyTin,
      businessType: user?.businessType || user?.sector || user?.industry,
    })
  );
}

export function hasCompany(company) {
  return Boolean(company?.name && company?.tin);
}

export function getStoredCompany() {
  return normalizeCompany(readJson(COMPANY_STORAGE_KEY, null));
}

export function saveStoredCompany(company) {
  const normalized = normalizeCompany(company);

  if (normalized) {
    writeJson(COMPANY_STORAGE_KEY, normalized);
  }

  return normalized;
}

export function getActiveCompany(user) {
  return getCompanyFromUser(user) || getStoredCompany();
}

export function normalizeEmployee(data) {
  const source = pickPayload(data, ["employee", "staff", "member", "profile"]);

  if (!isPlainObject(source)) {
    return null;
  }

  const name =
    source.name ||
    source.fullName ||
    [source.firstName, source.lastName].filter(Boolean).join(" ").trim() ||
    "";
  const salary = toNumber(
    source.salary || source.monthlySalary || source.grossSalary || source.baseSalary || source.amount
  );

  if (!name && !source.email && salary === null) {
    return null;
  }

  return {
    id: source.id || source._id || source.employeeId || source.email || name || createLocalId(),
    name,
    email: source.email || "",
    role: source.role || source.position || source.jobTitle || "",
    status: source.status || "",
    salary,
    phone: source.phone || source.phoneNumber || "",
    raw: source,
  };
}

export function normalizeEmployees(data) {
  const root = firstObject(data?.data, data) || {};
  const list = Array.isArray(data)
    ? data
    : Array.isArray(root)
      ? root
      : root.employees || root.staff || root.items || root.results || root.data || [];

  return Array.isArray(list) ? list.map(normalizeEmployee).filter(Boolean) : [];
}

export function getStoredEmployees() {
  return normalizeEmployees(readJson(EMPLOYEES_STORAGE_KEY, []));
}

export function saveStoredEmployees(employees) {
  const normalized = normalizeEmployees(employees);
  writeJson(EMPLOYEES_STORAGE_KEY, normalized);
  return normalized;
}

export function createLocalId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function upsertEmployee(employees, employee) {
  const normalizedEmployee = normalizeEmployee(employee);

  if (!normalizedEmployee) {
    return normalizeEmployees(employees);
  }

  const normalizedEmployees = normalizeEmployees(employees);
  const index = normalizedEmployees.findIndex((item) => String(item.id) === String(normalizedEmployee.id));

  if (index >= 0) {
    return normalizedEmployees.map((item, itemIndex) => (itemIndex === index ? normalizedEmployee : item));
  }

  return [normalizedEmployee, ...normalizedEmployees];
}

export function buildCompanyContext(company, employees = []) {
  const normalizedCompany = normalizeCompany(company);
  const normalizedEmployees = normalizeEmployees(employees);
  const grossPayroll = normalizedEmployees.reduce((total, employee) => total + (employee.salary || 0), 0);

  return {
    company: normalizedCompany,
    employees: normalizedEmployees,
    employeeCount: normalizedEmployees.length,
    grossPayroll,
    averageSalary: normalizedEmployees.length > 0 ? grossPayroll / normalizedEmployees.length : null,
  };
}
