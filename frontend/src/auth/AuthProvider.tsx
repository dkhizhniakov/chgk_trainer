import React from 'react'
import {
  getCurrentUser,
  signIn as amplifySignIn,
  signUp as amplifySignUp,
  confirmSignUp as amplifyConfirmSignUp,
  signOut as amplifySignOut,
} from 'aws-amplify/auth'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { AuthContext } from './context'

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient()

  const { data: user, isLoading: isUserLoading } = useQuery({
    queryKey: ['authUser'],
    queryFn: async () => {
      try {
        return await getCurrentUser()
      } catch {
        return null
      }
    },
    staleTime: 5 * 60 * 1000,
  })

  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['me'],
    queryFn: api.getMe,
    enabled: !!user,
    retry: 1,
    staleTime: 60 * 1000,
  })

  const signIn = async (email: string, pass: string) => {
    await amplifySignIn({ username: email, password: pass })
    await queryClient.invalidateQueries({ queryKey: ['authUser'] })
    await queryClient.invalidateQueries({ queryKey: ['me'] })
  }

  const signUp = async (email: string, pass: string) => {
    await amplifySignUp({
      username: email,
      password: pass,
      options: {
        userAttributes: { email },
      },
    })
  }

  const confirmSignUp = async (email: string, code: string) => {
    await amplifyConfirmSignUp({ username: email, confirmationCode: code })
  }

  const signOut = async () => {
    await amplifySignOut()
    queryClient.setQueryData(['authUser'], null)
    queryClient.removeQueries({ queryKey: ['me'] })
  }

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        profile: profile ?? null,
        isLoading: isUserLoading,
        isProfileLoading,
        signIn,
        signUp,
        confirmSignUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
