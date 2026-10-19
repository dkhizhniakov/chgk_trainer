import React, { useState } from 'react'
import { Button, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material'
import TranslateIcon from '@mui/icons-material/Translate'
import { useTranslation } from 'react-i18next'
import { supportedLanguages, type SupportedLanguage } from '../i18n'

export const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const currentLang = supportedLanguages.find((l) => i18n.language.startsWith(l.code)) || supportedLanguages[0]

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleSelect = (code: SupportedLanguage) => {
    i18n.changeLanguage(code)
    handleClose()
  }

  return (
    <>
      <Button
        color="inherit"
        size="small"
        startIcon={<TranslateIcon fontSize="small" />}
        onClick={handleClick}
        sx={{ minWidth: 'auto', px: 1 }}
      >
        {currentLang.flag} {currentLang.code.toUpperCase()}
      </Button>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
        {supportedLanguages.map((lang) => (
          <MenuItem
            key={lang.code}
            selected={currentLang.code === lang.code}
            onClick={() => handleSelect(lang.code)}
          >
            <ListItemIcon sx={{ fontSize: 18, mr: 1 }}>{lang.flag}</ListItemIcon>
            <ListItemText>{lang.label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}
