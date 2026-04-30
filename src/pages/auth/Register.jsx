// @ts-nocheck
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, Navigate, useNavigate } from "react-router-dom";
import LanguageSwitcher from "../../components/shared/LanguageSwitcher.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { getApiErrorMessage } from "../../services/api.js";

const initialForm = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export default function Register() {
  const { isAuthenticated, register } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function validateForm() {
    if (!form.name.trim()) {
      return t("auth.nameRequired");
    }

    if (!form.email.includes("@")) {
      return t("auth.invalidEmail");
    }

    if (form.password.length < 6) {
      return t("auth.passwordLength");
    }

    if (form.password !== form.confirmPassword) {
      return t("auth.passwordMismatch");
    }

    return "";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      navigate("/", { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, t("auth.registrationFailed")));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-language">
        <LanguageSwitcher />
      </div>
      <section className="auth-card">
        <p className="eyebrow">{t("auth.registerEyebrow")}</p>
        <h1>{t("auth.registerTitle")}</h1>

        {error && <div className="alert alert--error">{error}</div>}

        <form className="form-stack" onSubmit={handleSubmit}>
          <label>
            {t("auth.name")}
            <input name="name" value={form.name} onChange={updateField} autoComplete="name" required />
          </label>

          <label>
            {t("auth.email")}
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={updateField}
              autoComplete="email"
              required
            />
          </label>

          <label>
            {t("auth.password")}
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={updateField}
              autoComplete="new-password"
              required
            />
          </label>

          <label>
            {t("auth.confirmPassword")}
            <input
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={updateField}
              autoComplete="new-password"
              required
            />
          </label>

          <button type="submit" className="button button--primary" disabled={isSubmitting}>
            {isSubmitting ? t("auth.creatingAccount") : t("auth.createAccount")}
          </button>
        </form>

        <p className="muted">
          {t("auth.registeredPrompt")} <Link to="/login">{t("auth.signIn")}</Link>
        </p>
      </section>
    </main>
  );
}
