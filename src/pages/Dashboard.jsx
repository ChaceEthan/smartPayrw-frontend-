import { Link } from "react-router-dom";

const readinessItems = [
  {
    title: "Authentication",
    description: "Login and registration forms are wired to backend auth endpoints.",
  },
  {
    title: "Protected Routes",
    description: "Core fintech pages require a persisted JWT session before access.",
  },
  {
    title: "Backend AI",
    description: "AI chat sends messages only through the backend integration endpoint.",
  },
];

export default function Dashboard() {
  return (
    <div className="page-grid">
      <section className="hero-card">
        <p className="eyebrow">Production-ready payroll</p>
        <h2>Run payroll, manage people, and get AI help without exposing secrets.</h2>
        <p>
          SmartPayRW keeps browser code clean: authentication, employee data, payroll data, and AI
          requests all flow through backend APIs configured by <code>VITE_API_URL</code>.
        </p>
        <Link className="button button--primary" to="/ai-chat">
          Ask the AI assistant
        </Link>
      </section>

      <section className="stats-grid" aria-label="Frontend integration readiness">
        {readinessItems.map((item) => (
          <article className="stat-card" key={item.title}>
            <span>{item.title}</span>
            <p>{item.description}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
