# 📦 Sistema de Gestión de Inventario Distribuido

Este proyecto es un sistema de gestión de inventario para controlar stock en múltiples ubicaciones (bodegas, tiendas, etc.).

## 🏗️ Estructura del Proyecto

*   **[/backend](./backend)**: API REST desarrollada con Node.js, Express, Prisma y PostgreSQL.
*   **[/frontend](./frontend)**: Aplicación cliente (pendientes detalles de implementación).

## 🚀 Inicio Rápido (Backend)

1. Ve a la carpeta `backend`
2. Instala dependencias: `pnpm install`.
3. Configura el `.env` con tu base de datos.
4. Crea cliente Prisma: `pnpm prisma generate`
4. Ejecuta migraciones y seed: `pnpm prisma migrate dev` y `pnpm run db:seed`.
5. Inicia: `pnpm run dev`.

Para más detalles, consulta el **[README de Backend](./backend/README.md)**.

## 🚀 Inicio Rápido (Frontend)

1. Ve a la carpeta `frontend`.
2. Instala dependencias: `pnpm install`.
3. Inicia el servidor de desarrollo: `pnpm run dev`.
4. Abre en el navegador la url http://localhost:5173.