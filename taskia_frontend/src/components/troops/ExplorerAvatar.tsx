import { avatarUploadUrl, presetGlyph } from '../../lib/avatars'

export function ExplorerAvatar({
  username,
  avatar_kind,
  avatar_preset_id,
  avatar_file,
  frame_id,
  size = 36,
}: {
  username: string
  avatar_kind?: 'preset' | 'upload' | null
  avatar_preset_id?: string | null
  avatar_file?: string | null
  frame_id?: string | null
  size?: number
}) {
  const upload = avatar_kind === 'upload' ? avatarUploadUrl(avatar_file) : null
  const frame = frame_id && frame_id !== 'none' ? frame_id : ''

  return (
    <span
      className={`explorer-avatar${frame ? ` explorer-avatar--${frame}` : ''}`}
      style={{ width: size, height: size }}
      title={username}
    >
      {upload ? (
        <img src={upload} alt="" className="explorer-avatar-img" />
      ) : (
        <span className="explorer-avatar-glyph" aria-hidden>
          {presetGlyph(avatar_preset_id)}
        </span>
      )}
    </span>
  )
}
