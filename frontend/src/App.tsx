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
import { MaterialReactTable, type MRT_ColumnDef } from 'material-react-table'

import { getAppTheme } from './theme/theme'
import { uiStore, toggleThemeMode, setAuthModal } from './stores/uiStore'
import { useAuth } from './auth/useAuth'
import { AuthModal } from './components/AuthModal'
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
        header: '№',
        size: 70,
      },
      {
        accessorKey: 'tour',
        header: 'Тур / Пакет',
        size: 150,
      },
      {
        accessorKey: 'text',
        header: 'Вопрос',
        size: 350,
      },
      {
        accessorKey: 'answer',
        header: 'Ответ',
        size: 150,
        Cell: ({ cell }) => (
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
            {cell.getValue<string>()}
          </Typography>
        ),
      },
      {
        accessorKey: 'difficulty',
        header: 'Сложность',
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
    []
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
                    ЧГК ТРЕНАЖЁР
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                    Клуб интеллектуальных тренировок
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {/* Индикатор здоровья бэкенда */}
                <Tooltip title={isHealthOk ? `API онлайн (${health?.env})` : 'Проверка соединения...'}>
                  <Chip
                    icon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
                    label={isHealthOk ? 'Go API Online' : 'Подключение...'}
                    size="small"
                    color={isHealthOk ? 'success' : 'default'}
                    variant="outlined"
                    sx={{ mr: 1 }}
                  />
                </Tooltip>

                {/* Переключатель темы */}
                <IconButton onClick={toggleThemeMode} color="inherit" size="small">
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
                          <Chip key={r} label={r} size="small" color="primary" sx={{ height: 18, fontSize: 10 }} />
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
                      Выйти
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
                    Войти в клуб
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
                  {profile ? `Добро пожаловать, ${profile.email}!` : 'Добро пожаловать в ЧГК Тренажёр'}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 700, mb: 2 }}>
                  Интеллектуальная система тренировок: вопросы турниров, единая база знаний и
                  алгоритм интервального повторения FSRS. Всё подключено к реальной базе Amazon DynamoDB и
                  работает локально.
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                  <Button variant="contained" color="primary" startIcon={<SportsEsportsIcon />}>
                    Блиц (60 секунд)
                  </Button>
                  <Button variant="outlined" color="primary" startIcon={<StorageIcon />}>
                    База вопросов
                  </Button>
                  <Button variant="outlined" color="secondary" startIcon={<AutoStoriesIcon />}>
                    База знаний
                  </Button>
                  <Button variant="outlined" color="inherit" startIcon={<SchoolIcon />}>
                    Повторение FSRS
                  </Button>
                </Box>
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <Card variant="outlined" sx={{ p: 2, bgcolor: 'background.paper' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'text.secondary' }}>
                    СТАТУС ИНФРАСТРУКТУРЫ (AWS DEV)
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2">БД DynamoDB:</Typography>
                      <Chip label="chgk-dev-*" size="small" color="success" variant="outlined" />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2">Cognito User Pool:</Typography>
                      <Chip label="Активен" size="small" color="success" variant="outlined" />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2">Go API Backend:</Typography>
                      <Chip
                        label={isHealthOk ? ':8080 OK' : 'Ожидание...'}
                        size="small"
                        color={isHealthOk ? 'success' : 'warning'}
                        variant="outlined"
                      />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2">Профиль игрока:</Typography>
                      {isProfileLoading ? (
                        <CircularProgress size={16} />
                      ) : profile ? (
                        <Chip label="Загружен из DynamoDB" size="small" color="primary" />
                      ) : (
                        <Chip label="Не авторизован" size="small" variant="outlined" />
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
              Обзор базы вопросов (Material React Table)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Полнофункциональная таблица с сортировкой, фильтрацией и адаптивным дизайном
            </Typography>
            <Card>
              <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                <MaterialReactTable
                  columns={columns}
                  data={demoData}
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
