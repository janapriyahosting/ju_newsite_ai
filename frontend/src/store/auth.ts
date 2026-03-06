import { create } from 'zustand'
import { Customer } from '@/types'

interface AuthState {
  customer: Customer | null
  token: string | null
  isLoggedIn: boolean
  setAuth: (token: string, customer: Customer) => void
  logout: () => void
  loadFromStorage: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  customer: null,
  token: null,
  isLoggedIn: false,

  setAuth: (token, customer) => {
    localStorage.setItem('token', token)
    localStorage.setItem('customer', JSON.stringify(customer))
    set({ token, customer, isLoggedIn: true })
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('customer')
    set({ token: null, customer: null, isLoggedIn: false })
  },

  loadFromStorage: () => {
    const token = localStorage.getItem('token')
    const customerStr = localStorage.getItem('customer')
    if (token && customerStr) {
      set({
        token,
        customer: JSON.parse(customerStr),
        isLoggedIn: true,
      })
    }
  },
}))
