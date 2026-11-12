export default function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-ink/40 backdrop-blur-[2px] flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div
        className={`bg-white rounded-card shadow-pop w-full ${wide ? 'max-w-2xl' : 'max-w-md'} p-6 my-8`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {(title || onClose) && (
          <div className="flex justify-between items-start gap-3 mb-4">
            {title && (
              <h2 id="modal-title" className="text-lg font-semibold text-ink">
                {title}
              </h2>
            )}
            {onClose && (
              <button type="button" onClick={onClose} className="btn-ghost text-lg leading-none px-2" aria-label="Close">
                ×
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
