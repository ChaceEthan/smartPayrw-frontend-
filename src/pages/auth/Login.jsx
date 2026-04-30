// @ts-nocheck
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import LanguageSwitcher from "../../components/shared/LanguageSwitcher.jsx";
import { useAuth } from "../../hooks/useAuth.js";
import { getApiErrorMessage } from "../../services/api.js";

const initialForm = {
  email: "",
  password: "",
};

export default function Login() {
  const { isAuthenticated, login } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo = location.state?.from?.pathname || "/";

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!form.email.trim() || !form.password) {
      setError(t("auth.requiredCredentials"));
      return;
    }

    setIsSubmitting(true);

    try {
      await login({ email: form.email.trim(), password: form.password });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, t("auth.loginFailed")));
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
        <p className="eyebrow">{t("auth.loginEyebrow")}</p>
        <h1>{t("auth.loginTitle")}</h1>

        {error && <div className="alert alert--error">{error}</div>}

        <form className="form-stack" onSubmit={handleSubmit}>
          <label>
            {t("auth.email")}
            <input
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={updateField}
              required
            />
          </label>

          <label>
            {t("auth.password")}
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={updateField}
              required
            />
          </label>

          <button type="submit" className="button button--primary" disabled={isSubmitting}>
            {isSubmitting ? t("auth.signingIn") : t("auth.signIn")}
          </button>
        </form>

        <p className="muted">
          {t("auth.newPrompt")} <Link to="/register">{t("auth.registerLink")}</Link>
        </p>
      </section>
    </main>
  );
}
