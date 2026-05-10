# Parking Tracker Dashboard

## Descripción

Dashboard web para managers de un concesionario Volkswagen. Permite revisar inventario en vivo, movimientos, búsquedas de vehículos, empleados y herramientas administrativas usando el mismo Firebase que la app móvil.

## Stack técnico

- Next.js 15 con App Router y TypeScript
- Tailwind CSS
- shadcn/ui con primitivas Radix
- Firebase Web SDK para Auth, Firestore y Storage
- Firebase Hosting con Web Frameworks
- date-fns con locale español
- lucide-react

## Setup local

```bash
npm install
```

Crea `.env.local` a partir de `.env.local.example` y rellena los valores del proyecto Firebase `parking-tracker`.

```bash
npm run dev
```

La app carga en `http://localhost:3000`.

## Variables de entorno

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Para obtenerlas: Firebase Console → Project Settings → General → Your apps → Add web app → copia el objeto de configuración.

`.env.local` está ignorado por git. Cada persona que despliegue necesita su propio `.env.local` correctamente poblado.

## Estructura del proyecto

- `src/app/(dashboard)`: rutas protegidas del panel.
- `src/components`: componentes reutilizables de UI, inventario, actividad, búsqueda, empleados y herramientas.
- `src/contexts`: contexto de autenticación.
- `src/lib`: Firebase, queries, CSV, fechas, merge y helpers administrativos.
- `firestore.indexes.json`: índices documentados para Firestore.

## Despliegue

Verifica primero el build local:

```bash
npm run build
```

Despliega a Firebase Hosting:

```bash
npm run deploy
```

Este proyecto usa Firebase Hosting Web Frameworks con backend en `europe-west1`, configurado en `firebase.json`.

El despliegue con Web Frameworks usa Cloud Functions para las rutas dinámicas de Next.js. Si el deploy falla indicando que `cloudfunctions.googleapis.com` está deshabilitado, activa Cloud Functions API en Google Cloud Console para el proyecto `parking-tracker-3d6eb` y vuelve a ejecutar `npm run deploy`.

En Windows, si PowerShell bloquea el ejecutable `firebase.ps1`, usa:

```bash
firebase.cmd deploy --only hosting
```

Después del primer despliegue, abre la URL `.web.app`. Si Firebase Auth bloquea el login, añade el dominio en Firebase Console → Authentication → Settings → Authorized domains.

Más adelante se puede añadir un dominio propio desde Firebase Hosting → Custom domains, por ejemplo `dashboard.tuconcesionario.com`.

## Notas operativas

Solo usuarios con `role: "manager"` en `users/{uid}` pueden entrar al panel. Para promover manualmente a un usuario:

1. Abre Firestore en Firebase Console.
2. Ve a `users/{uid}`.
3. Cambia `role` a `"manager"`.
4. Actualiza `updatedAt` si quieres dejar constancia manual.

El panel registra cambios de rol y combinaciones de coches en `audit_log`.

## Repositorio relacionado

La app móvil vive en un repositorio separado y comparte Auth, Firestore y Storage con este dashboard.

## Próximos pasos / limitaciones conocidas

- Reglas de seguridad de Firestore más estrictas.
- Dominio personalizado.
- CI/CD automatizado.
- Paginación avanzada para exportaciones muy grandes.
- UI para consultar `audit_log`.
