import { useState, type FormEvent } from 'react'
import { api } from '../api'
import { useAuth } from '../auth'
import { errorMessage } from '../lib/errors'
import { useToast } from '../toast'
import { PasswordField, TextField } from './ui/Field'

/** Datos de la cuenta: usuario, correo y contraseña. Se guarda por separado del avatar. */
export function AccountForm() {
  const { user, setUser } = useAuth()
  const { showToast } = useToast()
  const [username, setUsername] = useState(user?.username ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const next = await api.updateMe({
        username: username.trim(),
        email: email.trim(),
        password: password.trim() || undefined,
      })
      setUser(next)
      setPassword('')
      showToast({ tone: 'success', title: 'Cuenta actualizada', subtitle: 'Tus datos quedaron guardados.' })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="profile-account" onSubmit={(event) => void onSubmit(event)}>
      <TextField label="Usuario" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required minLength={3} />
      <TextField label="Correo" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
      <PasswordField
        label="Nueva contraseña (opcional)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
        minLength={6}
        placeholder="Déjala vacía si no la cambias"
      />
      {error && <p className="form-error">{error}</p>}
      <div>
        <button type="submit" className="primary" disabled={submitting}>
          {submitting ? 'Guardando…' : 'Guardar mi cuenta'}
        </button>
      </div>
    </form>
  )
}
