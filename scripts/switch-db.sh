#!/bin/bash
# Script para intercambiar esquemas Prisma entre desarrollo y producción

ENV=${1:-development}

if [ "$ENV" = "development" ]; then
  echo "📁 Cambiando a SQL Server (Desarrollo)..."
  cp prisma/schema.dev.prisma prisma/schema.prisma
  echo "✅ Schema actualizado para SQL Server"
elif [ "$ENV" = "production" ]; then
  echo "📁 Cambiando a PostgreSQL (Producción)..."
  cp prisma/schema.prod.prisma prisma/schema.prisma
  echo "✅ Schema actualizado para PostgreSQL"
else
  echo "❌ Uso: npm run switch-db -- [development|production]"
fi
