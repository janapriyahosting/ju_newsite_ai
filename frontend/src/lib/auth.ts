import { useAuthStore } from '@/store/auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function useRequireAuth() {
  const { isLoggedIn, loadFromStorage } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    loadFromStorage()
    if (!isLoggedIn) {
      router.push('/login?redirect=' + window.location.pathname)
    }
  }, [isLoggedIn])

  return isLoggedIn
}
