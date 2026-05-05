# Parking Tracker Dashboard

Panel web para managers de un concesionario Volkswagen que usan Parking Tracker para revisar inventario, actividad diaria, búsquedas de vehículos y gestión de empleados.

Este dashboard comparte el mismo backend Firebase que la app móvil existente: Auth, Firestore y Storage del proyecto `parking-tracker`.

## Stack

- Next.js 15 con App Router y TypeScript
- Tailwind CSS
- shadcn/ui con primitivas Radix
- Firebase Web SDK
- date-fns con locale español
- lucide-react

## Puesta en marcha

1. Clona el repositorio.
2. Instala dependencias:

```bash
npm install
```

3. Crea `.env.local` a partir de `.env.local.example`.
4. Rellena la configuración Firebase:
   - Firebase Console
   - Project Settings
   - General
   - Your apps
   - Add web app
   - Copia el objeto de configuración
   - Pega los valores correspondientes en `.env.local`

5. Arranca el entorno local:

```bash
npm run dev
```

La app carga en `http://localhost:3000`.

## Firebase

El proyecto Firebase compartido es `parking-tracker`. Esta app usa el SDK web modular para:

- Auth: inicio y cierre de sesión.
- Firestore: lectura del documento `users/{uid}` para comprobar el rol.
- Storage: preparado para futuras pantallas con fotos de vehículos.

Solo los usuarios con `role: "manager"` pueden entrar al dashboard. Los empleados ven una pantalla de acceso denegado.

## Deploy

El despliegue en Firebase Hosting se configurará en una sesión posterior.

## App móvil

La app móvil vive en un repositorio separado. Este dashboard no importa código de la app móvil, pero mantiene tipos compatibles con sus modelos Firestore.
