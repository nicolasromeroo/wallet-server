# 🗄️ Guía: Desarrollo con SQL Server + Producción con PostgreSQL

## 📋 Resumen

- **DESARROLLO**: SQL Server Express local (pruebas sin límites)
- **PRODUCCIÓN**: PostgreSQL hosted (datos reales de clientes)

Esto permite desarrollar sin preocuparte por límites de conexión, mientras mantienes los datos de clientes seguros.

---

## 1️⃣ Instala SQL Server Express (Una sola vez)

### Windows:

1. Descarga **SQL Server Express 2022** (gratis):
   https://www.microsoft.com/sql-server/sql-server-express

2. Durante la instalación:
   - Elige la instancia: `SQLEXPRESS` (por defecto)
   - Autenticación: `Mixed Mode` (SQL Server y Windows Authentication)
   - SA Password: cualquiera (no es crítico en local)

3. Verifica que está corriendo:
   ```powershell
   Get-Service "SQL Server (SQLEXPRESS)" | Select-Object Name, Status
   ```

---

## 2️⃣ Crea la base de datos de desarrollo

### Opción A: Con SQL Server Management Studio (GUI)

1. Descarga **SSMS**: https://learn.microsoft.com/sql/ssms/download-sql-server-management-studio-ssms

2. Conecta a: `localhost\SQLEXPRESS`

3. Crea una nueva BD:
   ```sql
   CREATE DATABASE gastos_dev;
   GO
   ```

### Opción B: Con PowerShell (CLI)

```powershell
sqlcmd -S localhost\SQLEXPRESS -Q "CREATE DATABASE gastos_dev;"
```

---

## 3️⃣ Inicia el desarrollo

```bash
# Terminal en ./back-exp

# 1. Genera Prisma Client para SQL Server
npm install
npm run prisma:generate

# 2. Crea las migraciones en SQL Server
npm run prisma:migrate

# 3. Inicia el servidor en modo watch
npm run start:dev
```

---

## 🔄 Cambiar entre entornos

```bash
# DESARROLLO - SQL Server (pruebas)
npm run start:dev

# PRODUCCIÓN - PostgreSQL (clientes reales)
npm run start:prod
```

---

## ✅ Verifica que está funcionando

```bash
# Debe conectarse a SQL Server sin errores
npm run start:dev

# En otro terminal, prueba la API:
curl http://localhost:3000

# O accede a http://localhost:3000/docs (Swagger)
```

---

## 🚨 Protección de datos de producción

### ✅ Datos protegidos:

- PostgreSQL hosted solo se usa cuando haces `npm run start:prod`
- Las migraciones de SQL Server NO afectan PostgreSQL
- Los datos de clientes nunca se tocan

### ⚠️ Nunca:

1. NO cambies `DATABASE_URL` en `.env.production`
2. NO elimines `.env.production`
3. NO corras migraciones en `.env.production` (usa `npm run prisma:migrate` solo en desarrollo)

---

## 📊 Migraciones separadas

Cada BD tiene sus propias migraciones:

```
prisma/migrations/
├── SQL Server migrations  (para desarrollo)
└── PostgreSQL migrations  (para producción - NO crear aquí)
```

Para agregar campos:

```bash
# En desarrollo (SQL Server)
npm run start:dev
# Modifica schema.prisma
npm run prisma:migrate  # Crea migración SQL Server

# Luego en producción:
npm run start:prod
# Ejecuta: npx prisma migrate deploy
```

---

## 🐛 Troubleshooting

### Error: "Too many connections"

✅ **RESUELTO** - Ahora usas SQL Server local sin límites

### Error: "Connection refused" en SQL Server

```bash
# Verifica que SQLEXPRESS está corriendo:
Get-Service "SQL Server (SQLEXPRESS)"

# Si no, reinicia:
Restart-Service "SQL Server (SQLEXPRESS)"
```

### Error: "Could not connect to server"

- Verifica que el nombre de instancia es `SQLEXPRESS`
- Intenta con `localhost\SQLEXPRESS`
- O usa IP loopback: `127.0.0.1\SQLEXPRESS`

---

## 📝 Archivo .env.development

```env
DATABASE_URL="sqlserver://localhost\\SQLEXPRESS;database=gastos_dev;encrypt=true;trustServerCertificate=true;integratedSecurity=true"
```

Si usas autenticación de usuario/contraseña:

```env
DATABASE_URL="sqlserver://sa:TuPassword@localhost;database=gastos_dev;encrypt=true;trustServerCertificate=true"
```

---

## 🎯 Siguiente paso

Una vez todo funcione:

```bash
npm run start:dev
```

¡Ahora puedes desarrollar sin preocuparte por límites de conexión! 🚀
