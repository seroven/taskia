/**
 * Textos del loader general (`AppLoader`). Se editan aquí: frases por contexto y tips.
 * Lo que dicen los tips tiene que ser verdad hoy; si una función cambia, se ajusta aquí.
 */

export type LoaderContext = 'general' | 'worlds' | 'camp' | 'study' | 'challenge' | 'troops' | 'guardian' | 'admin'

/** Quién mira: el Explorador recibe lenguaje cercano; Guardián y Admin, adulto; sin sesión (arranque), neutro. */
export type Audience = 'explorer' | 'adult' | 'neutral'

/** `only` limita un tip a las pantallas de ese contexto (un Admin no necesita los tips del Guardián). */
export type LoaderLine = { kind: 'phrase' | 'tip' | 'cheer'; text: string; only?: LoaderContext }

/** Frases que acompañan la espera. Las de adultos y neutras son sobrias y no dependen del contexto. */
const EXPLORER_PHRASES: Record<LoaderContext, string[]> = {
  general: ['Preparando todo para ti…', 'Encendiendo los motores…', 'Revisando el mapa estelar…', 'Ya casi despegamos…'],
  worlds: ['Buscando tus planetas…', 'Despertando las lunas…', 'Trazando las órbitas…', 'Revisando el mapa estelar…'],
  camp: ['Ordenando tus tareas…', 'Preparando el campamento…', 'Contando las estrellas del día…'],
  study: ['Taskia está preparando tu estudio…', 'Abriendo tu cuaderno…', 'Afilando los lápices…'],
  challenge: ['Preparando tu desafío…', 'Calentando motores…', 'Ajustando el cronómetro…'],
  troops: ['Buscando a tu tripulación…', 'Cruzando la galaxia…', 'Saludando a los planetas vecinos…'],
  guardian: ['Preparando todo para ti…', 'Encendiendo los motores…'],
  admin: ['Preparando todo para ti…', 'Encendiendo los motores…'],
}

const ADULT_PHRASES: Record<LoaderContext, string[]> = {
  general: ['Un momento…', 'Casi listo…', 'Ordenando la información…'],
  worlds: ['Un momento…', 'Casi listo…', 'Ordenando la información…'],
  camp: ['Un momento…', 'Casi listo…', 'Ordenando la información…'],
  study: ['Un momento…', 'Casi listo…', 'Ordenando la información…'],
  challenge: ['Un momento…', 'Casi listo…', 'Ordenando la información…'],
  troops: ['Un momento…', 'Casi listo…', 'Ordenando la información…'],
  guardian: ['Un momento…', 'Reuniendo el progreso de tus exploradores…', 'Casi listo…'],
  admin: ['Un momento…', 'Reuniendo los datos…', 'Casi listo…'],
}

export function phrasesFor(context: LoaderContext, audience: Audience): string[] {
  return audience === 'explorer' ? EXPLORER_PHRASES[context] : ADULT_PHRASES[context]
}

/** Tips de uso y ánimo, solo en el loader de pantalla completa. */
const TIPS: Record<Audience, LoaderLine[]> = {
  explorer: [
    { kind: 'tip', text: 'Toca un planeta para entrar a su curso.' },
    { kind: 'tip', text: 'Cada luna es un tema: va cambiando de fase mientras estudias.' },
    { kind: 'tip', text: 'Si una tarea se te hace difícil, Taskia te guía paso a paso.' },
    { kind: 'tip', text: 'Puedes hablar con Taskia con el micrófono, no solo escribir.' },
    { kind: 'tip', text: 'Puedes mandarle a Taskia una foto de tu cuaderno.' },
    { kind: 'tip', text: 'Al terminar una tarea, toca la estrella: queda lista y ganas XP.' },
    { kind: 'tip', text: 'En los desafíos ganas más XP si respondes bien y a buen ritmo.' },
    { kind: 'tip', text: 'Si sales de un desafío, no lo pierdes: puedes continuarlo después.' },
    { kind: 'tip', text: 'Tu cohete sube con tu XP: ¡mira cuánto falta para el nivel siguiente!' },
    { kind: 'tip', text: 'Puedes cambiar el color y el modo noche con el botón de la paleta.' },
    { kind: 'cheer', text: 'Un paso pequeño cada día te lleva muy lejos.' },
    { kind: 'cheer', text: 'Equivocarse es parte de aprender. ¡Cada intento cuenta!' },
    { kind: 'cheer', text: 'Hoy es un buen día para descubrir algo nuevo.' },
    { kind: 'cheer', text: 'Tu cerebro crece cada vez que practicas.' },
    { kind: 'cheer', text: 'Los grandes exploradores empezaron con una sola pregunta.' },
    { kind: 'cheer', text: 'Descansar un ratito también ayuda a aprender.' },
    { kind: 'cheer', text: 'No tienes que saberlo todo hoy. Solo seguir explorando.' },
    { kind: 'cheer', text: 'Preguntar es de valientes. Taskia siempre está lista para ayudarte.' },
  ],
  adult: [
    { kind: 'tip', only: 'guardian', text: 'Cambia de explorador con los chips de arriba: el chat y el progreso se actualizan.' },
    { kind: 'tip', only: 'guardian', text: 'El resumen del día es el de ayer; si no hubo actividad, no se genera.' },
    { kind: 'tip', only: 'guardian', text: 'Cada aviso se activa o desactiva con su interruptor.' },
    { kind: 'tip', only: 'admin', text: 'Cada Explorador se crea vinculado a un Guardián.' },
    { kind: 'tip', only: 'admin', text: 'Los mundos, vínculos y misiones se archivan, no se borran.' },
    { kind: 'tip', text: 'Puedes cambiar el tema y el color de acento desde el botón de la paleta.' },
  ],
  neutral: [
    { kind: 'cheer', text: 'Taskia te ayuda a estudiar a tu ritmo.' },
    { kind: 'cheer', text: 'Un paso pequeño cada día te lleva muy lejos.' },
    { kind: 'tip', text: 'Puedes cambiar el tema y el color de acento desde el botón de la paleta.' },
  ],
}

export function tipsFor(audience: Audience, context: LoaderContext): LoaderLine[] {
  return TIPS[audience].filter((tip) => !tip.only || tip.only === context)
}

/**
 * Baraja de textos que no repite hasta agotarse y no empieza igual que acaba. Vive fuera de los componentes:
 * cada loader nuevo sigue donde quedó el anterior y así no muestra siempre la misma primera frase.
 */
const decks = new Map<string, { order: number[]; last: number }>()

export function drawFrom<T>(key: string, pool: T[]): T {
  let deck = decks.get(key)
  if (!deck || deck.order.length === 0) {
    const order = pool.map((_, index) => index)
    for (let i = order.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[order[i], order[j]] = [order[j], order[i]]
    }
    // Evita que el primero de la baraja nueva sea el último de la anterior.
    if (deck && order.length > 1 && order[order.length - 1] === deck.last) {
      ;[order[0], order[order.length - 1]] = [order[order.length - 1], order[0]]
    }
    deck = { order, last: deck?.last ?? -1 }
    decks.set(key, deck)
  }
  const index = deck.order.pop() as number
  deck.last = index
  return pool[index]
}
