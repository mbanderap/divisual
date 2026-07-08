# divisual — CRM

CRM interno construido en **Vue 3 + TypeScript + Vite**, con **Pinia** para el estado y **Supabase** (PostgreSQL + Auth) como backend. Migración desde el prototipo en HTML/JS a una base de código mantenible para un equipo.

## Arquitectura

```
src/
  lib/          clientes y helpers puros (supabase, formato, tipos, iconos)
  stores/       estado global con Pinia (auth, catálogos, columnas, tema, toasts, búsqueda)
  composables/  lógica reutilizable (paginación en servidor, búsqueda asíncrona)
  components/
    layout/     Sidebar, Topbar, AppShell
    ui/         DataTable, Pager, ComboSingle, MultiPicker, Modal, ColumnEditor...
    contacts|companies|deals|hotels|personnel|settings/   modales y widgets propios de cada módulo
  views/        una vista por ruta
  router/       definición de rutas y guard de autenticación
```

**Contactos, Empresas y Hoteles** son las tres tablas grandes: se paginan de verdad en el servidor (`usePagedEntity`), con búsqueda y orden resueltos por Postgres, no en el navegador. **Negocios, Personal, Etiquetas y Modelos de facturación** son catálogos pequeños que se cargan enteros una vez (`stores/catalogs.ts`) y se listan/filtran en el cliente.

## Requisitos previos en Supabase

Antes de desplegar, tu proyecto de Supabase debe tener:

1. El esquema de tablas (`companies`, `contacts`, `deals`, `hotels`, `personnel` y sus tablas puente).
2. El script de backend ejecutado: RLS activado en todas las tablas, columnas `note` en los historiales, `created_by` con valor por defecto `auth.uid()`.
3. Los índices de rendimiento (`pg_trgm` + índices por columna) para que la búsqueda y el orden sean rápidos con volúmenes grandes.
4. Al menos un usuario creado en **Authentication → Users** para poder iniciar sesión.

Si ya hiciste esto para la versión anterior de la app, no hace falta repetirlo: es la misma base de datos.

## Desarrollo local

```bash
npm install
cp .env.example .env   # rellena tus credenciales de Supabase
npm run dev
```

## Despliegue en Vercel

1. Sube este proyecto a un repositorio de GitHub (puedes arrastrar los archivos directamente en la web de GitHub al crear el repo, sin usar la terminal).
2. Ve a [vercel.com/new](https://vercel.com/new) e importa el repositorio.
3. Vercel detecta Vite automáticamente. No hace falta tocar el comando de build.
4. En **Environment Variables**, añade:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

   (Los encuentras en tu proyecto de Supabase, en Project Settings → API. Usa la clave **anon/publishable**, nunca la `service_role` ni la `sb_secret_...`.)
5. Deploy.

El archivo `vercel.json` incluido ya configura la reescritura necesaria para que las rutas de Vue Router (`/contactos`, `/hoteles`, etc.) funcionen al recargar la página o compartir un enlace directo.

### Botón de despliegue directo

Una vez el repositorio esté en tu cuenta de GitHub, puedes generar un botón "Deploy to Vercel" reemplazando la URL de tu repo aquí:

```
https://vercel.com/new/clone?repository-url=https://github.com/TU-USUARIO/TU-REPO
```

Pégalo como imagen en tu propio README si quieres que otros lo desplieguen con un clic:

```md
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/TU-USUARIO/TU-REPO)
```

## Funcionalidades incluidas

- Login con Supabase Auth (cuentas creadas por un administrador, sin registro público).
- Panel con KPIs, pipeline por etapa y desviación de planes de hoteles (agregados calculados en servidor).
- Contactos: tabla paginada, búsqueda en servidor, columnas configurables y reordenables (persistidas en el navegador), historial de interacciones.
- Empresas: vista de tarjetas o tabla, alternable, con la misma paginación real.
- Negocios: kanban con arrastrar y soltar entre etapas.
- Hoteles: tarjetas o tabla con métricas de plan (TAU, décimas, IJ, desviación), gestión de equipo asignado.
- Personal: alta, edición y baja, con sus asignaciones a hoteles visibles.
- Ajustes: importador CSV con mapeo de columnas y progreso, catálogo de modelos de facturación, exportación de catálogos a JSON.
- Modo claro/oscuro persistido.

## Próximos pasos sugeridos

- Tabla `user_preferences` en Supabase si quieres que las columnas configuradas se sincronicen entre dispositivos (hoy se guardan en `localStorage` del navegador).
- Tests (Vitest + Vue Test Utils) para los composables de paginación y los formularios críticos.
- CI en GitHub Actions que ejecute `npm run build` en cada PR antes de fusionar.
