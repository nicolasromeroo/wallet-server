# LIGA · Server

Backend de una plataforma deportiva de cartas coleccionables de fútbol con enfrentamientos en tiempo real. Los usuarios canjean puntos por sobres de jugadores, arman su equipo ideal y compiten en partidas 5 vs 5 resueltas según las estadísticas de las cartas, mientras siguen los resultados del fútbol argentino en vivo.

Construido con **NestJS + TypeScript**, siguiendo una arquitectura modular por capas.

---

## Concepto

LIGA es una plataforma web pensada en torno al fútbol argentino donde cada usuario:

1. **Se registra y recibe 1000 puntos** iniciales para gastar dentro de la economía del juego.
2. **Canjea puntos por sobres de cartas** de jugadores de fútbol (con jugadores a nivel mundial), en un sistema de apertura de sobres.
3. **Arma su equipo** — un plantel de 11 jugadores a partir de las cartas obtenidas.
4. **Compite 5 vs 5 en salas en tiempo real**, donde el enfrentamiento se resuelve según las estadísticas (rating) de cada carta. El ganador se lleva los puntos en disputa.
5. **Sigue los partidos en vivo** del fútbol argentino, con resultados actualizados en tiempo real al estilo Promiedos.

Este repositorio contiene el **servidor / API**. El frontend es un cliente SPA independiente que consume esta API.

---

## Características técnicas

- **Autenticación y autorización** con JWT y control de acceso basado en roles.
- **Economía de puntos**: asignación inicial, débito/crédito por apertura de sobres y por resultados de partidas.
- **Sistema de sobres y cartas**: modelado de jugadores, rareza y estadísticas; lógica de apertura de sobres.
- **Gestión de plantel**: creación y edición del equipo del usuario a partir de sus cartas.
- **Partidas 5 vs 5 en tiempo real** mediante WebSockets: salas de juego, emparejamiento de usuarios y resolución del enfrentamiento en base al rating de las cartas.
- **Resultados en vivo**: integración con una API deportiva externa para obtener y sincronizar resultados de partidos.
- **Caché y estado en tiempo real** con Redis.
- **Documentación de la API** con Swagger / OpenAPI.
- **Tests** unitarios y end-to-end.
- **Contenerización** con Docker y manifiestos de **Kubernetes** para el despliegue.

---

## Stack

| Capa | Tecnología |
|------|------------|
| Framework | NestJS (Node.js) |
| Lenguaje | TypeScript |
| Base de datos | PostgreSQL |
| ORM | Prisma |
| Tiempo real | WebSockets (Socket.io) |
| Caché / estado | Redis |
| Autenticación | JWT |
| Documentación | Swagger / OpenAPI |
| Testing | Jest (unitarios y E2E) |
| Contenedores | Docker · Docker Compose |
| Orquestación | Kubernetes |

---

## Arquitectura

El proyecto sigue una organización modular de NestJS, separando responsabilidades por dominio (autenticación, usuarios, cartas/sobres, equipos, partidas en tiempo real, resultados en vivo). La comunicación en tiempo real de las partidas 5 vs 5 se maneja mediante un gateway de WebSockets, mientras que la API REST expone el resto de las operaciones. Redis se utiliza para caché y para el manejo de estado de las salas de juego, y la integración con la API deportiva externa alimenta la sección de resultados en vivo.

```
src/
├── auth/          # Registro, login, JWT, guards y roles
├── users/         # Perfil, puntos y economía del usuario
├── cards/         # Jugadores, sobres y lógica de apertura
├── teams/         # Armado y gestión del plantel
├── matches/       # Salas 5 vs 5 en tiempo real (WebSocket gateway)
├── live/          # Integración con API deportiva externa
└── ...
```

---

## Requisitos previos

- Node.js 18+
- npm o pnpm
- Docker (opcional, recomendado)
- kubectl (opcional, para despliegue en Kubernetes)

---

## Instalación

```bash
# Clonar el repositorio
git clone https://github.com/nicolasromeroo/LIGA-Server.git
cd LIGA-Server

# Instalar dependencias
npm install

# Crear el archivo .env a partir del ejemplo
cp .env.example .env
# Completar las variables en .env (ver más abajo)

# Ejecutar las migraciones de Prisma
npx prisma migrate dev
```

## Variables de entorno

El proyecto se configura mediante variables de entorno. Copiá `.env.example` a `.env` y completá los valores:

```
DATABASE_URL=postgresql://usuario:password@localhost:5432/footsport
JWT_SECRET=
REDIS_URL=redis://localhost:6379
SPORTDB_BASE_URL=
SPORTDB_API_KEY=
NODE_ENV=development
```

> Ningún secreto se versiona en el repositorio. Los valores reales se cargan localmente desde `.env` (ignorado por Git) o, en Kubernetes, mediante `Secret` objects.

---

## Ejecución

```bash
# Desarrollo (con hot reload)
npm run start:dev

# Producción
npm run start:prod

# Con Docker Compose (levanta API + PostgreSQL + Redis)
docker compose up -d
```

## Tests

```bash
# Tests unitarios
npm run test

# Tests end-to-end
npm run test:e2e
```

## Documentación de la API

Con el servidor levantado, la documentación interactiva de Swagger está disponible en:

```
http://localhost:3000/api
```

---

## Despliegue

### Docker

El proyecto incluye `Dockerfile` y `docker-compose.yml`:

```bash
docker compose up -d
```

### Kubernetes

Los manifiestos están en la carpeta `k8s/`. Los secretos se aplican por separado a partir de la plantilla `k8s/secret.example.yaml` (no se versionan valores reales):

```bash
kubectl apply -f k8s/
```

Actualmente el proyecto está **desplegado y en funcionamiento en un homelab propio**, corriendo de forma continua sobre esta infraestructura contenerizada.

---

## Estado del proyecto

Proyecto personal en desarrollo activo, construido de punta a punta: diseño de la arquitectura, modelado de datos, implementación del backend, integración en tiempo real, despliegue y operación.

## Licencia

MIT
