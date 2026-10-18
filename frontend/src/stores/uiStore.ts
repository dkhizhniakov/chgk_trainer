import { Store } from '@tanstack/store'

export interface UIState {
  themeMode: 'dark' | 'light'
  drawerOpen: boolean
  authModal: 'none' | 'login' | 'register' | 'confirm'
  pendingEmail: string
}

const savedTheme = (localStorage.getItem('chgk_theme_mode') as 'dark' | 'light') || 'dark'

export const uiStore = new Store<UIState>({
  themeMode: savedTheme,
  drawerOpen: false,
  authModal: 'none',
  pendingEmail: '',
})

export const setUIState = (fn: (prev: UIState) => UIState) => {
  uiStore.setState(fn)
}

export const toggleThemeMode = () => {
  uiStore.setState((prev) => {
    const next = prev.themeMode === 'dark' ? 'light' : 'dark'
    localStorage.setItem('chgk_theme_mode', next)
    return { ...prev, themeMode: next }
  })
}

export const setAuthModal = (modal: UIState['authModal'], email = '') => {
  uiStore.setState((prev) => ({
    ...prev,
    authModal: modal,
    pendingEmail: email || prev.pendingEmail,
  }))
}
