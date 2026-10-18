import { fetchAuthSession } from 'aws-amplify/auth'

export interface UserProfile {
  sub: string
  email: string
  roles: string[]
  settings: {
    defaultTimerSec: number
    autoAddMissedToReview: boolean
  }
  createdAt: string
  updatedAt: string
}

export interface HealthResponse {
  status: string
  timestamp: string
  env: string
}

export interface ApiError {
  type: string
  title: string
  status: number
  detail: string
  errors?: Array<{ field: string; message: string }>
}

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const session = await fetchAuthSession()
    const token = session.tokens?.accessToken?.toString()
    if (token) {
      return { Authorization: `Bearer ${token}` }
    }
  } catch {
    // Пользователь не залогинен
  }
  return {}
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const authHeaders = await getAuthHeader()

  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options.headers,
    },
  })

  if (!res.ok) {
    let errorDetails: ApiError
    try {
      errorDetails = await res.json()
    } catch {
      errorDetails = {
        type: 'https://chgk-trainer/errors/unknown',
        title: 'Error',
        status: res.status,
        detail: res.statusText || 'Unexpected error occurred',
      }
    }
    throw errorDetails
  }

  return res.json()
}

export const api = {
  getHealth: () => apiFetch<HealthResponse>('/api/health'),
  getMe: () => apiFetch<UserProfile>('/api/v1/me'),
}
