import { useState } from 'react'
import { User } from '@phosphor-icons/react'
import { useAuth } from '../auth'
import { UserAvatar } from './avatar/UserAvatar'
import { ProfileModal } from './avatar/ProfileModal'
import { ExpandIconButton } from './ExpandIconButton'

/** El botón de perfil del encabezado: el avatar del usuario con su marco; abre el perfil. */
export function UserChip() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  if (!user) return null

  return (
    <>
      <ExpandIconButton
        icon={User}
        media={<UserAvatar avatar={user.avatar_config} frame={user.frame_id} size={32} name={user.username} />}
        label={user.username}
        variant="ghost"
        aria-label={`Mi perfil: ${user.username}`}
        title="Mi perfil"
        onClick={() => setOpen(true)}
      />
      <ProfileModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
