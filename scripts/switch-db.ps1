# Script para intercambiar esquemas Prisma (Windows)
param(
    [string]$Environment = "development"
)

if ($Environment -eq "development") {
    Write-Host "📁 Cambiando a SQL Server (Desarrollo)..."
    Copy-Item -Path "prisma/schema.dev.prisma" -Destination "prisma/schema.prisma" -Force
    Write-Host "✅ Schema actualizado para SQL Server"
    Write-Host ""
    Write-Host "🔄 Generando Prisma Client..."
    npm run prisma:generate
}
elseif ($Environment -eq "production") {
    Write-Host "📁 Cambiando a PostgreSQL (Producción)..."
    Copy-Item -Path "prisma/schema.prod.prisma" -Destination "prisma/schema.prisma" -Force
    Write-Host "✅ Schema actualizado para PostgreSQL"
    Write-Host ""
    Write-Host "🔄 Generando Prisma Client..."
    npm run prisma:generate
}
else {
    Write-Host "❌ Uso: .\switch-db.ps1 -Environment [development|production]"
    exit 1
}
