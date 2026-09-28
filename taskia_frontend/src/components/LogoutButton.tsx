import { SignOut } from '@phosphor-icons/react'
import { useAuth } from '../auth'
import { IconButton } from './ui/IconButton'

export function LogoutButton() {
  const { logout } = useAuth()

  return (
    <IconButton
      icon={SignOut}
      label="Salir"
      onClick={() => void logout()}
    />
  )
}
