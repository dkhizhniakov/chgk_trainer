import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  IconButton,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { useStore } from '@tanstack/react-store'
import { uiStore, setAuthModal } from '../stores/uiStore'
import { useAuth } from '../auth/useAuth'

export const AuthModal: React.FC = () => {
  const { authModal, pendingEmail } = useStore(uiStore, (s) => s)
  const { signIn, signUp, confirmSignUp } = useAuth()

  const [email, setEmail] = useState(pendingEmail || '')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const handleClose = () => {
    setError(null)
    setSuccessMsg(null)
    setAuthModal('none')
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signIn(email, password)
      handleClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка при входе'
      if (msg.includes('UserNotConfirmedException')) {
        setAuthModal('confirm', email)
        setError('Пользователь не подтверждён. Введите код из email.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signUp(email, password)
      setSuccessMsg('Код подтверждения отправлен на почту!')
      setAuthModal('confirm', email)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка при регистрации')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await confirmSignUp(email || pendingEmail, code)
      setSuccessMsg('Аккаунт подтверждён! Теперь выполните вход.')
      setAuthModal('login', email || pendingEmail)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Неверный код подтверждения')
    } finally {
      setLoading(false)
    }
  }

  if (authModal === 'none') return null

  return (
    <Dialog open onClose={handleClose} maxWidth="xs" fullWidth PaperProps={{ sx: { p: 1 } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" component="span" sx={{ fontFamily: "'Cinzel', serif", fontWeight: 700 }}>
          {authModal === 'login' && 'Вход в клуб ЧГК'}
          {authModal === 'register' && 'Регистрация игрока'}
          {authModal === 'confirm' && 'Подтверждение Email'}
        </Typography>
        <IconButton size="small" onClick={handleClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ border: 'none' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {successMsg && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {successMsg}
          </Alert>
        )}

        {authModal === 'login' && (
          <Box component="form" onSubmit={handleLogin} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Email"
              type="email"
              size="small"
              fullWidth
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
            <TextField
              label="Пароль"
              type="password"
              size="small"
              fullWidth
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
              fullWidth
              sx={{ mt: 1 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Войти'}
            </Button>
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Ещё нет аккаунта?{' '}
                <Button variant="text" size="small" onClick={() => setAuthModal('register', email)}>
                  Зарегистрироваться
                </Button>
              </Typography>
            </Box>
          </Box>
        )}

        {authModal === 'register' && (
          <Box component="form" onSubmit={handleRegister} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Email"
              type="email"
              size="small"
              fullWidth
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
            <TextField
              label="Пароль"
              type="password"
              size="small"
              fullWidth
              required
              helperText="Мин. 8 символов, строчные буквы и цифры"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
              fullWidth
              sx={{ mt: 1 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Зарегистрироваться'}
            </Button>
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Уже есть аккаунт?{' '}
                <Button variant="text" size="small" onClick={() => setAuthModal('login', email)}>
                  Войти
                </Button>
              </Typography>
            </Box>
          </Box>
        )}

        {authModal === 'confirm' && (
          <Box component="form" onSubmit={handleConfirm} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Мы отправили проверочный код на <b>{email || pendingEmail}</b>. Введите его ниже:
            </Typography>
            <TextField
              label="Код подтверждения"
              size="small"
              fullWidth
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoFocus
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
              fullWidth
              sx={{ mt: 1 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Подтвердить аккаунт'}
            </Button>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }} />
    </Dialog>
  )
}
