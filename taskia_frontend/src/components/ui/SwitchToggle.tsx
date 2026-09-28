/**
 * Interruptor on/off (mismo estilo que los toggles del chat de estudio).
 */
export function SwitchToggle({
  checked,
  onChange,
  title,
  disabled,
  className = '',
}: {
  checked: boolean
  onChange: (next: boolean) => void
  title?: string
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      className={`study-board-toggle${checked ? ' is-on' : ''}${className ? ` ${className}` : ''}`}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span className="study-board-toggle-track" aria-hidden>
        <span className="study-board-toggle-thumb" />
      </span>
      {title ? (
        <span className="study-board-toggle-title">{title}</span>
      ) : null}
    </button>
  )
}
