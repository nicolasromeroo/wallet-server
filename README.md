# Wallet · Server

Backend de una aplicación de finanzas personales, diseñado en torno al patrón **CQRS** para separar la lógica de escritura (comandos) de la de lectura (queries) y soportar el procesamiento analítico de los datos financieros del usuario. Incluye una capa experimental de predicción de gastos.

Construido con **NestJS + TypeScript**, aplicando el módulo `@nestjs/cqrs` y una arquitectura orientada a eventos.

---

## Concepto

Wallet es una aplicación para la gestión de finanzas personales donde el usuario registra sus ingresos y gastos, los organiza por categorías y accede a un dashboard analítico con métricas sobre sus hábitos financieros. Sobre esos datos históricos, el sistema ofrece además una estimación experimental de gastos futuros.

Este repositorio contiene el **servidor / API**. El frontend (dashboard en React) es un cliente independiente que consume esta API.

---

## Características técnicas

- **Arquitectura CQRS** con el módulo `@nestjs/cqrs`: separación explícita de comandos, queries, eventos y sus handlers.
- **Arquitectura orientada a eventos**: las operaciones financieras emiten eventos de dominio, desacoplando la escritura de los efectos secundarios (proyecciones, métricas).
- **Autenticación y autorización** con JWT.
- **Gestión financiera**: modelado de ingresos, gastos y categorías con persistencia en PostgreSQL.
- **Capa analítica**: queries optimizadas para alimentar un dashboard con métricas y agregados de los hábitos de gasto.
- **Predicción experimental de gastos** con TensorFlow, complementada con lógica de negocio sobre los datos históricos del usuario.
- **API REST** consumida por el frontend en React.
- Desplegada en entorno productivo y disponible para uso real.

---

## Stack

| Capa | Tecnología |
|------|------------|
| Framework | NestJS (Node.js) |
| Lenguaje | TypeScript |
| Patrón | CQRS (`@nestjs/cqrs`) + eventos de dominio |
| Base de datos | PostgreSQL |
| ORM | Prisma |
| Autenticación | JWT |
| Predicción (experimental) | TensorFlow |
| API | REST |

---

## Arquitectura

El proyecto está organizado siguiendo CQRS: cada operación de escritura se modela como un **Command** con su handler, y cada lectura como una **Query** con el suyo. Las operaciones relevantes emiten **eventos de dominio**, lo que permite desacoplar la lógica principal de sus efectos secundarios (por ejemplo, la actualización de proyecciones o métricas del dashboard). Esta separación mantiene la escritura y la lectura independientes y facilita la evolución de cada lado por separado.

```
src/
├── auth/              # Autenticación JWT
├── transactions/      # Comandos y queries de ingresos/gastos
│   ├── commands/      # Escritura (crear/editar/eliminar)
│   ├── queries/       # Lectura (listados, agregados)
│   └── events/        # Eventos de dominio
├── categories/        # Gestión de categorías financieras
├── analytics/         # Métricas y proyecciones para el dashboard
└── ...
```

> La estructura de carpetas es orientativa; ajustá los nombres para que coincidan con los módulos reales del repositorio.

---

## Requisitos previos

- Node.js 18+
- npm o pnpm
- PostgreSQL
- Docker (opcional)

---

## Instalación

```bash
# Clonar el repositorio
git clone https://github.com/nicolasromeroo/wallet-server.git
cd wallet-server

# Instalar dependencias
npm install

# Crear el archivo .env a partir del ejemplo
cp .env.example .env
# Completar las variables en .env

# Ejecutar las migraciones de Prisma
npx prisma migrate dev
```

## Variables de entorno

Copiá `.env.example` a `.env` y completá los valores:

```
DATABASE_URL=postgresql://usuario:password@localhost:5432/wallet
JWT_SECRET=
NODE_ENV=development
```

> Ningún secreto se versiona en el repositorio. Los valores reales se cargan localmente desde `.env` (ignorado por Git).

---

## Ejecución

```bash
# Desarrollo (con hot reload)
npm run start:dev

# Producción
npm run start:prod
```

## Tests

```bash
# Tests unitarios
npm run test

# Tests end-to-end
npm run test:e2e
```

---

## Predicción de gastos

El proyecto incluye una implementación **experimental** de estimación de gastos mensuales, que combina un modelo de TensorFlow con lógica de negocio sobre el historial de transacciones del usuario. Es una funcionalidad en exploración, no un módulo central del sistema.

---

## Frontend

El dashboard está desarrollado en React como aplicación independiente y consume esta API.

Demo: https://wallet-frnt-v1.vercel.app

---

## Estado del proyecto

Proyecto personal desplegado en producción y disponible para uso real. Construido de punta a punta: diseño de la arquitectura CQRS, modelado de datos, implementación del backend, capa analítica y despliegue.

## Licencia

MIT
