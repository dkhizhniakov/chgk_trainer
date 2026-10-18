import { createContext } from 'react'
import type { AuthUser } from 'aws-amplify/auth'
import type { UserProfile } from '../api/client'

export interface AuthContextType {
  user: AuthUser | null
  profile: UserProfile | null
  isLoading: boolean
  isProfileLoading: boolean
  signIn: (email: string, pass: string) => Promise<void>
  signUp: (email: string, pass: string) => Promise<void>
  confirmSignUp: (email: string, code: string) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)
