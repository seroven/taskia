import { Spark } from '../scenes/kit'

type BeaconState = 'idle' | 'thinking'

/**
 * Taskia como estrella guía: una estrella con una luna en órbita. En reposo la luna da una vuelta lenta;
 * pensando, corre. Es el avatar provisional hasta tener mascota (mismo sitio, mismo tamaño).
 */
export function TaskiaBeacon({ size = 36, state = 'idle' }: { size?: number; state?: BeaconState }) {
  return (
    <span className={`beacon is-${state}`} style={{ width: size, height: size }} aria-hidden>
      <svg viewBox="0 0 40 40" width={size} height={size} focusable="false">
        <circle className="beacon-disc" cx="20" cy="20" r="18.5" />
        <circle className="beacon-orbit" cx="20" cy="20" r="13.5" />
        <Spark x={20} y={20} s={7.5} className="beacon-star" />
        <g className="beacon-spin">
          <circle className="beacon-moon" cx="20" cy="6.5" r="2.7" />
        </g>
      </svg>
    </span>
  )
}
