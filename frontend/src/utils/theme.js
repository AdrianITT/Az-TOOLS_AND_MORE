// Maps Organization color fields to the CSS custom properties they override.
export const THEME_COLOR_MAP = {
  color_primario: '--color-primary',
  color_fondo: '--color-bg',
  color_superficie: '--color-surface',
  color_texto: '--color-text',
  color_menu_fondo: '--sidebar-bg',
  color_menu_texto: '--sidebar-text',
}

export function applyOrgTheme(org) {
  if (!org) return
  const root = document.documentElement
  Object.entries(THEME_COLOR_MAP).forEach(([field, cssVar]) => {
    const value = org[field]
    if (value) {
      root.style.setProperty(cssVar, value)
    } else {
      root.style.removeProperty(cssVar)
    }
  })
}

export function resetOrgTheme() {
  const root = document.documentElement
  Object.values(THEME_COLOR_MAP).forEach((cssVar) => root.style.removeProperty(cssVar))
}
