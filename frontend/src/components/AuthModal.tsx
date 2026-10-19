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
import { useTranslation, Trans } from 'react-i18next'
import { useStore } from '@tanstack/react-store'
import { uiStore, setAuthModal } from '../stores/uiStore'
import { useAuth } from '../auth/useAuth'

export const AuthModal: React.FC = () => {
  const { t } = useTranslation(['auth', 'common'])
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
      const msg = err instanceof Error ? err.message : t('auth:messages.loginError')
      if (msg.includes('UserNotConfirmedException')) {
        setAuthModal('confirm', email)
        setError(t('auth:messages.confirmRequired'))
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
      setSuccessMsg(t('auth:messages.codeSentSuccess'))
      setAuthModal('confirm', email)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('auth:messages.registerError'))
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
      setSuccessMsg(t('auth:messages.confirmedSuccess'))
      setAuthModal('login', email || pendingEmail)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('auth:messages.invalidCode'))
    } finally {
      setLoading(false)
    }
  }

  if (authModal === 'none') return null

  return (
    <Dialog open onClose={handleClose} maxWidth="xs" fullWidth PaperProps={{ sx: { p: 1 } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" component="span" sx={{ fontFamily: "'Cinzel', serif", fontWeight: 700 }}>
          {authModal === 'login' && t('auth:titles.login')}
          {authModal === 'register' && t('auth:titles.register')}
          {authModal === 'confirm' && t('auth:titles.confirm')}
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
              label={t('auth:fields.email')}
              type="email"
              size="small"
              fullWidth
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
            <TextField
              label={t('auth:fields.password')}
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
              {loading ? <CircularProgress size={24} /> : t('auth:buttons.login')}
            </Button>
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {t('auth:prompts.noAccount')}{' '}
                <Button variant="text" size="small" onClick={() => setAuthModal('register', email)}>
                  {t('auth:buttons.register')}
                </Button>
              </Typography>
            </Box>
          </Box>
        )}

        {authModal === 'register' && (
          <Box component="form" onSubmit={handleRegister} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label={t('auth:fields.email')}
              type="email"
              size="small"
              fullWidth
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
            <TextField
              label={t('auth:fields.password')}
              type="password"
              size="small"
              fullWidth
              required
              helperText={t('auth:fields.passwordHelper')}
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
              {loading ? <CircularProgress size={24} /> : t('auth:buttons.register')}
            </Button>
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {t('auth:prompts.haveAccount')}{' '}
                <Button variant="text" size="small" onClick={() => setAuthModal('login', email)}>
                  {t('auth:buttons.login')}
                </Button>
              </Typography>
            </Box>
          </Box>
        )}

        {authModal === 'confirm' && (
          <Box component="form" onSubmit={handleConfirm} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              <Trans
                i18nKey="auth:prompts.codeSent"
                values={{ email: email || pendingEmail }}
                components={{ b: <b /> }}
              />
            </Typography>
            <TextField
              label={t('auth:fields.code')}
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
              {loading ? <CircularProgress size={24} /> : t('auth:buttons.confirm')}
            </Button>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }} />
    </Dialog>
  )
}
