/**
 * UI copy. Spanish, like every other Diagnóstica frontend. Centralized so a
 * future i18next setup only has to move these keys, not hunt through JSX.
 */
export const STRINGS = {
  app: {
    name: 'Diagnóstica Admin',
    tagline: 'Administración global',
  },
  login: {
    title: 'Iniciar sesión',
    subtitle: 'Ingresá con tu cuenta de administrador global.',
    statement: 'Un solo panel para marcas, kioscos y configuración compartida.',
    email: 'Email',
    emailPlaceholder: 'admin@diagnostica.com.ar',
    password: 'Contraseña',
    passwordPlaceholder: 'Ingresá tu contraseña',
    showPassword: 'Mostrar contraseña',
    hidePassword: 'Ocultar contraseña',
    submit: 'Ingresar',
    submitting: 'Ingresando…',
    required: 'Completá el email y la contraseña.',
    errorTitle: 'No pudimos iniciar sesión',
  },
  errors: {
    INVALID_CREDENTIALS: 'Email o contraseña inválidos.',
    ADMIN_DISABLED: 'Tu cuenta de administrador está deshabilitada. Contactá a otro administrador.',
    NETWORK: 'No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.',
    UNKNOWN: 'Ocurrió un error inesperado. Intentá de nuevo en unos minutos.',
  },
  shell: {
    dashboard: 'Dashboard',
    account: 'Cuenta',
    logout: 'Cerrar sesión',
    environment: 'Entorno',
    checkingSession: 'Verificando sesión…',
    navigation: 'Principal',
    openMenu: 'Abrir menú',
    closeMenu: 'Cerrar menú',
    sectionGeneral: 'General',
    sectionModules: 'Módulos',
    /** Short badge for a module that is not wired up yet (fits the 240px sidebar). */
    soonShort: 'Pronto',
  },
  theme: {
    label: 'Tema',
    light: 'Claro',
    dark: 'Oscuro',
    system: 'Sistema',
  },
  modules: {
    title: 'Módulos',
    hint: 'Se habilitan en próximas iteraciones.',
    soon: 'Próximamente',
    open: 'Abrir módulo',
    brands: {
      label: 'Marcas',
      title: 'Marcas',
      description: 'Alta, edición y estado de las marcas de la plataforma.',
    },
    kiosks: {
      label: 'Kioscos',
      title: 'Kioscos',
      description: 'Registro de kioscos, vínculo con cada marca y estado de conexión.',
    },
    settings: {
      /** Nav uses the short form; the module card and its page use the full one. */
      label: 'Configuración',
      title: 'Configuración global',
      description: 'Parámetros compartidos entre todas las marcas.',
    },
  },
  dashboard: {
    title: 'Dashboard',
    welcome: (name: string) => `Hola, ${name}.`,
  },
  session: {
    title: 'Sesión',
    admin: 'Administrador',
    role: 'Rol',
    lastLogin: 'Último ingreso',
    lastLoginEmpty: 'Sin registro',
  },
} as const
