# Historia Clínica Digital

Sistema de gestión médica con historias clínicas, consultas y facturación por institución.

## Stack

- **Frontend**: Next.js 14 + React + TypeScript + Tailwind CSS
- **Backend/DB**: Supabase (PostgreSQL + Auth + Storage)
- **Deploy**: Vercel
- **Multi-dispositivo**: PWA — funciona en iPhone, Android y PC sin instalar nada

---

## Setup paso a paso

### 1. Crear proyecto en Supabase

1. Entrá a [supabase.com](https://supabase.com) y creá un nuevo proyecto
2. Anotá:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. Configurar base de datos

En Supabase → SQL Editor, ejecutar **en orden**:

```
sql/01_schema.sql      ← Tablas principales
sql/02_rls_policies.sql ← Seguridad y permisos
sql/03_admin_views.sql  ← Vistas para el dashboard admin
```

### 3. Configurar Google OAuth

En Supabase → Authentication → Providers → Google:

1. Activar Google
2. En [Google Cloud Console](https://console.cloud.google.com):
   - Crear proyecto
   - APIs & Services → Credentials → OAuth 2.0 Client ID
   - Authorized redirect URIs: `https://TU-PROYECTO.supabase.co/auth/v1/callback`
3. Copiar Client ID y Client Secret a Supabase

### 4. Crear bucket de Storage

En Supabase → Storage → New Bucket:
- Name: `medical-files`
- Public: **NO** (privado, es información médica)

Luego ejecutar las políticas de storage (comentadas al final de `02_rls_policies.sql`).

### 5. Configurar tu cuenta como superadmin

Después de loguearte por primera vez con Google, ejecutar en SQL Editor:

```sql
UPDATE public.profiles
SET role = 'superadmin'
WHERE email = 'TU_EMAIL@gmail.com';
```

### 6. Variables de entorno

Crear `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

En Vercel, agregar las mismas variables en Settings → Environment Variables.

### 7. Instalar y correr

```bash
npm install
npm run dev
```

Para deploy:
```bash
# Conectar repo a Vercel
vercel --prod
```

---

## Estructura del proyecto

```
src/
├── app/
│   ├── auth/
│   │   ├── login/          ← Pantalla de login con Google
│   │   ├── callback/       ← Redirect de OAuth
│   │   ├── pending/        ← "Tu cuenta está siendo revisada"
│   │   └── rejected/       ← "Tu cuenta fue rechazada"
│   ├── dashboard/
│   │   ├── page.tsx        ← Inicio médico (lista de pacientes)
│   │   ├── patients/       ← Listado y ficha de pacientes
│   │   ├── consultations/  ← Nueva consulta
│   │   └── billing/        ← Auditoría y facturación ← LISTO
│   └── admin/
│       └── page.tsx        ← Dashboard superadmin ← LISTO
├── components/
│   ├── patients/
│   │   └── PatientForm.tsx ← LISTO
│   └── consultations/
│       └── ConsultationForm.tsx ← LISTO
├── lib/
│   ├── supabase/
│   │   ├── client.ts       ← LISTO
│   │   └── server.ts       ← LISTO
│   ├── storage.ts          ← LISTO (upload PDFs)
│   └── errorReporter.ts    ← LISTO
└── types/
    └── index.ts            ← LISTO
```

---

## Roles de usuario

| Rol | Qué puede hacer |
|-----|----------------|
| `pending` | Solo ver pantalla de espera |
| `approved` | Acceso completo a sus pacientes, consultas y facturación |
| `rejected` | Solo ver pantalla de rechazo |
| `superadmin` | Dashboard de métricas, aprobar/rechazar médicos, ver errores |

**El superadmin NO puede ver historias clínicas ni datos de pacientes** (por diseño y RLS).

---

## Seguridad

- **Row Level Security (RLS)** activado en todas las tablas
- Cada médico solo ve sus propios pacientes y consultas
- Storage: archivos organizados por `doctorId/patientId/consultationId/`
- URLs de archivos firmadas (expiran en 1 hora, no son URLs públicas)
- `last_seen_at` se actualiza en cada request via middleware

---

## Funcionalidades principales

### Para médicos
- ✅ Login con Google
- ✅ Crear/editar pacientes (datos completos + obra social + antecedentes)
- ✅ Nueva consulta asociada a paciente + institución
- ✅ Adjuntar PDFs y estudios a cada consulta
- ✅ Auditoría mensual con filtros por institución y estado
- ✅ Exportar CSV para facturación
- ✅ Cambiar estado de cada prestación (pendiente → auditado → facturado → cobrado)

### Para superadmin (vos)
- ✅ Ver médicos pendientes con botón de aprobar/rechazar
- ✅ Dashboard: usuarios activos, nuevos, inactivos
- ✅ Gráfico de consultas últimos 30 días
- ✅ Facturación global por institución
- ✅ Log de errores del sistema
- ✅ Audit log de acciones admin

---

## Próximos pasos sugeridos

1. Agregar página `dashboard/patients/[id]` — ficha completa del paciente con historial
2. Agregar búsqueda de pacientes por DNI
3. Email de notificación cuando se aprueba/rechaza un médico (Supabase Edge Functions)
4. Generación de PDF del resumen de consulta (ya tenés `jspdf` en las deps)
5. PWA: agregar `manifest.json` para "instalar" en iPhone/Android
