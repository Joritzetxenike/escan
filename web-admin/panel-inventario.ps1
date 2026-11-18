# =======================================================
# Panel de inventario: arrancar (o actualizar) en Docker
# =======================================================
#
# Uso (desde la carpeta web-admin):
#   powershell -ExecutionPolicy Bypass -File .\panel-inventario.ps1
#
# Que hace:
#   1. Arranca Docker Desktop si no lo esta y espera a que responda.
#   2. Construye y levanta el contenedor (docker compose up -d --build).
#   3. Comprueba que la web responde.
#   4. Revisa la regla del firewall y el nombre del PC.
#   5. Muestra las direcciones para conectarse.
#
# Para el nombre http://panelinventario el PC debe llamarse
# "panelinventario" (o tener esa entrada en el DNS del router).
# El script NO renombra el PC: solo avisa y muestra el comando.
# =======================================================

# 'Continue' y no 'Stop': docker escribe avisos y el progreso por
# stderr, y PowerShell 5.1 los convierte en errores. Los fallos
# reales se detectan con $LASTEXITCODE.
$ErrorActionPreference = 'Continue'

$NombreDeseado = 'panelinventario'
$Puerto = if ($env:PANEL_PUERTO) { [int]$env:PANEL_PUERTO } else { 80 }
$ReglaFirewall = 'Panel inventario'

Set-Location -Path $PSScriptRoot

function Escribir-Paso($texto) { Write-Host ""; Write-Host "==> $texto" -ForegroundColor Cyan }
function Escribir-Ok($texto) { Write-Host "    OK  $texto" -ForegroundColor Green }
function Escribir-Aviso($texto) { Write-Host "    !!  $texto" -ForegroundColor Yellow }

function Test-DockerListo {
    & docker info 2>$null | Out-Null
    return $LASTEXITCODE -eq 0
}

# ---------- 0. Configuracion de Supabase ----------

if (-not (Test-Path '.env.local')) {
    Write-Host "Falta web-admin\.env.local con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY (ver .env.example)." -ForegroundColor Red
    exit 1
}

# ---------- 1. Docker ----------

Escribir-Paso 'Docker'

if (-not (Test-DockerListo)) {
    $exe = Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'
    if (-not (Test-Path $exe)) {
        Write-Host "Docker Desktop no esta instalado ($exe)." -ForegroundColor Red
        exit 1
    }
    Write-Host '    Arrancando Docker Desktop...'
    Start-Process -FilePath $exe | Out-Null

    # El primer arranque del dia puede tardar varios minutos
    $limite = (Get-Date).AddMinutes(5)
    while (-not (Test-DockerListo)) {
        if ((Get-Date) -gt $limite) {
            Write-Host 'Docker no responde tras 5 minutos. Abre Docker Desktop y vuelve a lanzar el script.' -ForegroundColor Red
            exit 1
        }
        Start-Sleep -Seconds 3
    }
}
Escribir-Ok 'Docker responde'

# ---------- 2. Contenedor ----------

Escribir-Paso "Construyendo y arrancando el panel (puerto $Puerto)"
$env:PANEL_PUERTO = "$Puerto"
& docker compose up -d --build 2>&1 | ForEach-Object { "    $_" }
if ($LASTEXITCODE -ne 0) {
    Write-Host 'Fallo docker compose. Revisa el mensaje de arriba.' -ForegroundColor Red
    exit 1
}

# ---------- 3. Responde ----------

Escribir-Paso 'Comprobando que la web responde'
$url = if ($Puerto -eq 80) { 'http://localhost/' } else { "http://localhost:$Puerto/" }
$ok = $false
for ($i = 0; $i -lt 20 -and -not $ok; $i++) {
    try {
        $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3
        $ok = $r.StatusCode -eq 200
    } catch { Start-Sleep -Seconds 1 }
}
if ($ok) { Escribir-Ok "Responde en $url" } else { Escribir-Aviso "No responde en $url. Mira: docker compose logs" }

# ---------- 4a. Firewall ----------

Escribir-Paso 'Firewall de Windows'
$regla = Get-NetFirewallRule -DisplayName $ReglaFirewall -ErrorAction SilentlyContinue
$esAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if ($regla) {
    Escribir-Ok "Existe la regla '$ReglaFirewall'"
} elseif ($esAdmin) {
    New-NetFirewallRule -DisplayName $ReglaFirewall -Direction Inbound -Protocol TCP -LocalPort $Puerto -Action Allow -Profile Private,Domain | Out-Null
    Escribir-Ok "Regla creada: entrada TCP $Puerto (redes privadas y de dominio)"
} else {
    Escribir-Aviso 'Falta la regla del firewall: desde otros equipos no se podra entrar.'
    Write-Host "    Ejecuta UNA vez en PowerShell como administrador:"
    Write-Host "    New-NetFirewallRule -DisplayName '$ReglaFirewall' -Direction Inbound -Protocol TCP -LocalPort $Puerto -Action Allow -Profile Private,Domain"
}

$perfiles = Get-NetConnectionProfile -ErrorAction SilentlyContinue | Where-Object { $_.NetworkCategory -eq 'Public' }
if ($perfiles) {
    Escribir-Aviso "La red '$($perfiles[0].Name)' esta como PUBLICA: la regla no se aplica. Cambiala a Privada en Configuracion > Red."
}

# ---------- 4b. Nombre del PC ----------

Escribir-Paso 'Nombre del PC'
$nombre = $env:COMPUTERNAME.ToLower()
if ($nombre -eq $NombreDeseado) {
    Escribir-Ok "El PC se llama '$nombre'"
} else {
    Escribir-Aviso "El PC se llama '$nombre', no '$NombreDeseado'."
    Write-Host "    Para entrar con http://$NombreDeseado, renombralo UNA vez (PowerShell como administrador, reinicia):"
    Write-Host "    Rename-Computer -NewName '$NombreDeseado' -Restart"
}

# ---------- 5. Direcciones ----------

$sufijo = if ($Puerto -eq 80) { '' } else { ":$Puerto" }
# Solo la IP de la red real (la que tiene puerta de enlace): se
# descartan VirtualBox, WSL, Docker, VPN...
$ips = Get-NetIPConfiguration -ErrorAction SilentlyContinue |
    Where-Object { $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq 'Up' } |
    ForEach-Object { $_.IPv4Address.IPAddress }

Escribir-Paso 'Direcciones para conectarse (misma red)'
Write-Host "    http://$nombre$sufijo        (PCs con Windows)"
Write-Host "    http://$nombre.local$sufijo  (si la anterior no va)"
foreach ($ip in $ips) { Write-Host "    http://$ip$sufijo  (siempre funciona, tambien en moviles)" }
Write-Host ""
Write-Host "Parar: docker compose down   |   Ver registros: docker compose logs -f"
