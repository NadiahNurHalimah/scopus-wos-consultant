// Spinner loading indicator
export function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' };
  return (
    <div
      className={`animate-spin rounded-full border-4 border-cream border-t-navy ${sizes[size]} ${className}`}
      role="status"
      aria-label="Memuat"
    />
  );
}

// Full-page loading
export function PageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-cream">
      <Spinner size="lg" />
    </div>
  );
}

// Empty state
export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {icon && <div className="text-5xl mb-4">{icon}</div>}
      <h3 className="font-heading font-semibold text-lg text-navy mb-2">{title}</h3>
      {description && <p className="text-gray-500 text-sm max-w-sm mb-6">{description}</p>}
      {action}
    </div>
  );
}

// Error box
export function ErrorBox({ message, onRetry }) {
  return (
    <div className="rounded-xl bg-red-50 border border-red-200 p-5 flex flex-col sm:flex-row items-start gap-3">
      <span className="text-red-500 text-xl mt-0.5">⚠️</span>
      <div className="flex-1">
        <p className="text-red-700 text-sm font-medium">{message}</p>
        {onRetry && (
          <button onClick={onRetry} className="mt-2 text-sm text-red-600 underline hover:text-red-800">
            Coba lagi
          </button>
        )}
      </div>
    </div>
  );
}

// Status badge
const STATUS_STYLES = {
  submitted:        'bg-blue-100 text-blue-700',
  awaiting_payment: 'bg-yellow-100 text-yellow-700',
  in_review:        'bg-purple-100 text-purple-700',
  in_progress:      'bg-teal-100 text-teal-700',
  revision:         'bg-orange-100 text-orange-700',
  completed:        'bg-green-100 text-green-700',
  cancelled:        'bg-gray-100 text-gray-600',
};

export function StatusBadge({ status, label }) {
  const style = STATUS_STYLES[status] || 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${style}`}>
      {label || status}
    </span>
  );
}

// Card component
export function Card({ children, className = '' }) {
  return (
    <div className={`card ${className}`}>
      {children}
    </div>
  );
}

// Button
export function Button({ variant = 'primary', className = '', children, ...props }) {
  const variants = {
    primary:   'btn-primary',
    secondary: 'btn-secondary',
    gold:      'btn-gold',
    danger:    'btn-danger',
  };
  return (
    <button className={`${variants[variant] || 'btn-primary'} ${className}`} {...props}>
      {children}
    </button>
  );
}

// Input
export function Input({ label, id, error, className = '', ...props }) {
  return (
    <div className="w-full">
      {label && <label htmlFor={id} className="label">{label}</label>}
      <input id={id} className={`input ${error ? 'border-red-500 focus:ring-red-500' : ''} ${className}`} {...props} />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

// Select
export function Select({ label, id, error, children, className = '', ...props }) {
  return (
    <div className="w-full">
      {label && <label htmlFor={id} className="label">{label}</label>}
      <select
        id={id}
        className={`input appearance-none ${error ? 'border-red-500 focus:ring-red-500' : ''} ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

// Textarea
export function Textarea({ label, id, error, className = '', ...props }) {
  return (
    <div className="w-full">
      {label && <label htmlFor={id} className="label">{label}</label>}
      <textarea
        id={id}
        className={`input resize-y min-h-[90px] ${error ? 'border-red-500 focus:ring-red-500' : ''} ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

// Modal dialog
export function Modal({ open, title, children, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-bold text-lg text-navy">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none min-h-[44px] min-w-[44px] flex items-center justify-center">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
