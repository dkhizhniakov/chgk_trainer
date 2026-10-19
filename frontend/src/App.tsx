import React from 'react'
import {
  ThemeProvider,
  CssBaseline,
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Container,
  Grid,
  Card,
  CardContent,
  Chip,
  Avatar,
  CircularProgress,
  Tooltip,
} from '@mui/material'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import SportsEsportsIcon from '@mui/icons-material/SportsEsports'
import StorageIcon from '@mui/icons-material/Storage'
import AutoStoriesIcon from '@mui/icons-material/AutoStories'
import SchoolIcon from '@mui/icons-material/School'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import LogoutIcon from '@mui/icons-material/Logout'
import LoginIcon from '@mui/icons-material/Login'
import { useQuery } from '@tanstack/react-query'
import { useStore } from '@tanstack/react-store'
import { useTranslation } from 'react-i18next'
import { MaterialReactTable, type MRT_ColumnDef } from 'material-react-table'

import { getAppTheme } from './theme/theme'
import { uiStore, toggleThemeMode, setAuthModal } from './stores/uiStore'
import { useAuth } from './auth/useAuth'
import { AuthModal } from './components/AuthModal'
import { LanguageSelector } from './components/LanguageSelector'
import { getMrtLocalization } from './i18n'
import { api } from './api/client'

interface DemoQuestion {
  id: string
  tour: string
  text: string
  answer: string
  difficulty: number
}

const demoData: DemoQuestion[] = [
  {
    id: 'Q-01',
    tour: 'Тур 1, Вопрос 1',
    text: 'В одном из стихотворений Иосифа Бродского утверждается, что именно ОНА превращает время в пространство. Назовите ЕЁ.',
    answer: 'Память',
    difficulty: 3,
  },
  {
    id: 'Q-02',
    tour: 'Тур 1, Вопрос 2',
    text: 'Этот предмет в Древнем Риме называли «калькулус». А как мы называем науку, название которой произошло от того же корня?',
    answer: 'Калькуляция (или исчисление)',
    difficulty: 2,
  },
  {
    id: 'Q-03',
    tour: 'Тур 1, Вопрос 3',
    text: 'В 1908 году в Лондоне впервые прозвучала фраза о том, что главное — не победа, а участие. Кто её автор?',
    answer: 'Епископ Этельберт Талбот (или Пьер де Кубертен)',
    difficulty: 4,
  },
]

export const App: React.FC = () => {
  const { t, i18n } = useTranslation(['common', 'dashboard'])
  const themeMode = useStore(uiStore, (s) => s.themeMode)
  const theme = React.useMemo(() => getAppTheme(themeMode), [themeMode])

  const { user, profile, isProfileLoading, signOut } = useAuth()

  const { data: health, isSuccess: isHealthOk } = useQuery({
    queryKey: ['health'],
    queryFn: api.getHealth,
    refetchInterval: 30000,
  })

  const columns = React.useMemo<MRT_ColumnDef<DemoQuestion>[]>(
    () => [
      {
        accessorKey: 'id',
        header: t('dashboard:table.colNumber'),
        size: 70,
      },
      {
        accessorKey: 'tour',
        header: t('dashboard:table.colTour'),
        size: 150,
      },
      {
        accessorKey: 'text',
        header: t('dashboard:table.colQuestion'),
        size: 350,
      },
      {
        accessorKey: 'answer',
        header: t('dashboard:table.colAnswer'),
        size: 150,
        Cell: ({ cell }) => (
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
            {cell.getValue<string>()}
          </Typography>
        ),
      },
      {
        accessorKey: 'difficulty',
        header: t('dashboard:table.colDifficulty'),
        size: 100,
        Cell: ({ cell }) => (
          <Chip
            size="small"
            label={`★ ${cell.getValue<number>()}`}
            color="primary"
            variant="outlined"
          />
        ),
      },
    ],
    [t]
  )

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Верхняя панель навигации */}
        <AppBar position="sticky">
          <Container maxWidth="xl">
            <Toolbar disableGutters sx={{ justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar
                  sx={{
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    fontFamily: "'Cinzel', serif",
                    fontWeight: 700,
                  }}
                >
                  Ч
                </Avatar>
                <Box>
                  <Typography
                    variant="h6"
                    sx={{
                      fontFamily: "'Cinzel', serif",
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      lineHeight: 1.2,
                    }}
                  >
                    {t('common:brand.title')}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                    {t('common:brand.subtitle')}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {/* Индикатор здоровья бэкенда */}
                <Tooltip
                  title={
                    isHealthOk
                      ? t('common:status.apiHealthy', { env: health?.env })
                      : t('common:status.checking')
                  }
                >
                  <Chip
                    icon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
                    label={isHealthOk ? t('common:status.apiOnline') : t('common:status.connecting')}
                    size="small"
                    color={isHealthOk ? 'success' : 'default'}
                    variant="outlined"
                    sx={{ mr: 0.5 }}
                  />
                </Tooltip>

                {/* Селектор языка */}
                <LanguageSelector />

                {/* Переключатель темы */}
                <IconButton
                  onClick={toggleThemeMode}
                  color="inherit"
                  size="small"
                  aria-label={t('common:nav.switchTheme')}
                >
                  {themeMode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
                </IconButton>

                {/* Авторизация */}
                {user ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {profile?.email || user.username}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                        {profile?.roles?.map((r) => (
                          <Chip
                            key={r}
                            label={t(`common:roles.${r}`, { defaultValue: r })}
                            size="small"
                            color="primary"
                            sx={{ height: 18, fontSize: 10 }}
                          />
                        ))}
                      </Box>
                    </Box>
                    <Button
                      variant="outlined"
                      color="inherit"
                      size="small"
                      startIcon={<LogoutIcon />}
                      onClick={signOut}
                    >
                      {t('common:nav.logout')}
                    </Button>
                  </Box>
                ) : (
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    startIcon={<LoginIcon />}
                    onClick={() => setAuthModal('login')}
                  >
                    {t('common:nav.login')}
                  </Button>
                )}
              </Box>
            </Toolbar>
          </Container>
        </AppBar>

        {/* Главный контент */}
        <Container maxWidth="xl" sx={{ flex: 1, py: 4 }}>
          {/* Приветственный блок */}
          <Card
            sx={{
              mb: 4,
              p: { xs: 2, md: 4 },
              background:
                themeMode === 'dark'
                  ? 'linear-gradient(135deg, rgba(20, 36, 29, 0.9) 0%, rgba(12, 22, 18, 0.9) 100%)'
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(245, 247, 246, 0.9) 100%)',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Grid container spacing={3} alignItems="center">
              <Grid size={{ xs: 12, md: 8 }}>
                <Typography variant="h4" gutterBottom sx={{ color: 'primary.main' }}>
                  {profile
                    ? t('dashboard:hero.welcomeUser', { email: profile.email })
                    : t('dashboard:hero.welcomeGuest')}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 700, mb: 2 }}>
                  {t('dashboard:hero.description')}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                  <Button variant="contained" color="primary" startIcon={<SportsEsportsIcon />}>
                    {t('dashboard:hero.blitzBtn')}
                  </Button>
                  <Button variant="outlined" color="primary" startIcon={<StorageIcon />}>
                    {t('dashboard:hero.questionsBtn')}
                  </Button>
                  <Button variant="outlined" color="secondary" startIcon={<AutoStoriesIcon />}>
                    {t('dashboard:hero.knowledgeBtn')}
                  </Button>
                  <Button variant="outlined" color="inherit" startIcon={<SchoolIcon />}>
                    {t('dashboard:hero.fsrsBtn')}
                  </Button>
                </Box>
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <Card variant="outlined" sx={{ p: 2, bgcolor: 'background.paper' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'text.secondary' }}>
                    {t('dashboard:infra.title')}
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2">{t('dashboard:infra.dynamodb')}</Typography>
                      <Chip label="chgk-dev-*" size="small" color="success" variant="outlined" />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2">{t('dashboard:infra.cognito')}</Typography>
                      <Chip label={t('dashboard:infra.cognitoActive')} size="small" color="success" variant="outlined" />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2">{t('dashboard:infra.backend')}</Typography>
                      <Chip
                        label={isHealthOk ? ':8080 OK' : t('dashboard:infra.waiting')}
                        size="small"
                        color={isHealthOk ? 'success' : 'warning'}
                        variant="outlined"
                      />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2">{t('dashboard:infra.playerProfile')}</Typography>
                      {isProfileLoading ? (
                        <CircularProgress size={16} />
                      ) : profile ? (
                        <Chip label={t('dashboard:infra.profileLoaded')} size="small" color="primary" />
                      ) : (
                        <Chip label={t('dashboard:infra.guest')} size="small" variant="outlined" />
                      )}
                    </Box>
                  </Box>
                </Card>
              </Grid>
            </Grid>
          </Card>

          {/* Демонстрация таблицы material-react-table */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="h5" sx={{ mb: 1.5, fontFamily: "'Cinzel', serif" }}>
              {t('dashboard:table.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('dashboard:table.subtitle')}
            </Typography>
            <Card>
              <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                <MaterialReactTable
                  columns={columns}
                  data={demoData}
                  localization={getMrtLocalization(i18n.language)}
                  enableColumnFilters
                  enableGlobalFilter
                  enablePagination
                  enableDensityToggle
                  enableFullScreenToggle
                  initialState={{ density: 'comfortable' }}
                  muiTablePaperProps={{
                    sx: {
                      boxShadow: 'none',
                      backgroundColor: 'transparent',
                    },
                  }}
                />
              </CardContent>
            </Card>
          </Box>
        </Container>
      </Box>

      {/* Модальное окно авторизации */}
      <AuthModal />
    </ThemeProvider>
  )
}
