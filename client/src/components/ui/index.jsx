// src/components/ui/index.jsx
// Shared UI primitives used across all pages.

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, className = "" }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${className}`}>
      {children}
    </div>
  );
}

// ── Stat Card (dashboard metric) ──────────────────────────────────────────────
export function StatCard({ label, value, icon: Icon, color = "maroon", sub }) {
  const colors = {
    maroon: "bg-buksu-maroon text-white",
    gold:   "bg-buksu-gold   text-buksu-maroon-dark",
    green:  "bg-emerald-600  text-white",
    red:    "bg-red-600      text-white",
    blue:   "bg-blue-600     text-white",
    orange: "bg-orange-500   text-white",
  };
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-start gap-4">
      <div className={`p-3 rounded-xl ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────
const STATUS_MAP = {
  available:    "bg-emerald-100 text-emerald-700",
  dispatched:   "bg-blue-100   text-blue-700",
  maintenance:  "bg-yellow-100 text-yellow-700",
  unserviceable:"bg-red-100    text-red-700",
  pending:      "bg-yellow-100 text-yellow-700",
  approved:     "bg-blue-100   text-blue-700",
  ongoing:      "bg-purple-100 text-purple-700",
  completed:    "bg-emerald-100 text-emerald-700",
  rejected:     "bg-red-100    text-red-700",
  open:         "bg-yellow-100 text-yellow-700",
  in_progress:  "bg-blue-100   text-blue-700",
  low:          "bg-red-100    text-red-700",
  ok:           "bg-emerald-100 text-emerald-700",
};

export function StatusBadge({ status }) {
  const cls = STATUS_MAP[status] || "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${cls}`}>
      {status?.replace(/_/g, " ")}
    </span>
  );
}

// ── Button ────────────────────────────────────────────────────────────────────
export function Button({ children, variant = "primary", size = "md", className = "", ...props }) {
  const base = "inline-flex items-center gap-2 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1";
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2 text-sm", lg: "px-5 py-2.5 text-base" };
  const variants = {
    primary:   "bg-buksu-maroon text-white hover:bg-buksu-maroon-dark focus:ring-buksu-maroon",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-400",
    gold:      "bg-buksu-gold text-buksu-maroon-dark hover:bg-buksu-gold-light focus:ring-buksu-gold",
    danger:    "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    ghost:     "text-gray-600 hover:bg-gray-100 focus:ring-gray-300",
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, size = "md" }) {
  if (!open) return null;
  const sizes = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-xl w-full ${sizes[size]} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">✕</button>
        </div>
        <div className="overflow-y-auto flex-1 p-5">{children}</div>
      </div>
    </div>
  );
}

// ── Form Input ────────────────────────────────────────────────────────────────
export function Input({ label, error, className = "", ...props }) {
  return (
    <div className={className}>
      {label && <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>}
      <input
        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-buksu-maroon/40 focus:border-buksu-maroon transition
          ${error ? "border-red-400 bg-red-50" : "border-gray-300 bg-white"}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// ── Select ────────────────────────────────────────────────────────────────────
export function Select({ label, error, children, className = "", ...props }) {
  return (
    <div className={className}>
      {label && <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>}
      <select
        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-buksu-maroon/40 focus:border-buksu-maroon bg-white transition
          ${error ? "border-red-400" : "border-gray-300"}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && <Icon className="w-12 h-12 text-gray-300 mb-4" />}
      <h3 className="text-base font-semibold text-gray-700">{title}</h3>
      {description && <p className="text-sm text-gray-400 mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ── Loading Spinner ───────────────────────────────────────────────────────────
export function Spinner({ size = "md" }) {
  const s = { sm: "w-5 h-5", md: "w-8 h-8", lg: "w-12 h-12" };
  return (
    <div className={`${s[size]} border-4 border-buksu-maroon/20 border-t-buksu-maroon rounded-full animate-spin`} />
  );
}
