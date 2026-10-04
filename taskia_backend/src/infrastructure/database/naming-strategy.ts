import { DefaultNamingStrategy } from 'typeorm'

/** userId → user_id. TypeORM 1 ya no trae SnakeNamingStrategy. */
export class SnakeNamingStrategy extends DefaultNamingStrategy {
  override columnName(
    propertyName: string,
    customName: string,
    embeddedPrefixes: string[],
  ): string {
    const raw = customName || propertyName
    const prefixed = embeddedPrefixes.length ? `${embeddedPrefixes.join('_')}_${raw}` : raw
    return prefixed.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
  }
}
