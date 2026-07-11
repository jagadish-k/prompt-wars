import { GoogleLogin } from '@react-oauth/google'
import { useAuthStore } from '@/stores/auth'

export function GoogleLoginButton() {
  const load = useAuthStore((s) => s.load)
  return (
    <GoogleLogin
      onSuccess={(res) => {
        if (!res.credential) return
        fetch('/api/auth/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential: res.credential }),
          credentials: 'include',
        }).then(() => load())
      }}
    />
  )
}
