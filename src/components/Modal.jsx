import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../i18n/I18nProvider.jsx';

/**
 * Ventana modal accesible (Esc y clic fuera cierran; foco al abrir y al cerrar).
 * Props: open, title, onClose, footer (nodos), size ('narrow' | 'wide'), children.
 */
export default function Modal({ open, title, onClose, footer, size, children }) {
  const { t } = useI18n();
  const titleId = useId();
  const dialogRef = useRef(null);
  const previousFocus = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    previousFocus.current = document.activeElement;
    const dialog = dialogRef.current;
    const first = dialog && dialog.querySelector('input, select, textarea, button:not(.modal__close)');
    (first || dialog)?.focus();
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previousFocus.current?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        ref={dialogRef}
        className={`modal${size ? ` modal--${size}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="modal__head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label={t('common.close')}>
            ×
          </button>
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/** Confirmación sencilla. onConfirm puede ser async; mientras corre, los botones se desactivan. */
export function ConfirmModal({ open, title, message, confirmLabel, danger, busy, onConfirm, onClose }) {
  const { t } = useI18n();
  return (
    <Modal
      open={open}
      title={title || t('common.confirm')}
      onClose={busy ? undefined : onClose}
      size="narrow"
      footer={(
        <>
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </button>
          <button type="button" className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`} onClick={onConfirm} disabled={busy}>
            {busy ? t('app.busy') : confirmLabel || t('common.confirm')}
          </button>
        </>
      )}
    >
      {typeof message === 'string' ? <p className="mt-0">{message}</p> : message}
    </Modal>
  );
}
