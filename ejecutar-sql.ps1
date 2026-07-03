
param([string]$Archivos)

$token = Read-Host "Pega tu token y presiona Enter"
$listaArchivos = $Archivos.Split(",")

foreach ($archivo in $listaArchivos) {
    Write-Host "--- Ejecutando $archivo ---"
    $sql = [string](Get-Content -Raw -Path $archivo)
    $body = (@{ query = $sql } | ConvertTo-Json)
    try {
        Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/qahhwfthhvacumeitgan/database/query" -Method Post -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body $body | Out-Null
        Write-Host "OK: $archivo"
    } catch {
        Write-Host "ERROR en $archivo :"
        if ($_.ErrorDetails) { Write-Host $_.ErrorDetails.Message } else { Write-Host $_.Exception.Message }
    }
}

$token = $null
Write-Host "--- Listo ---"
