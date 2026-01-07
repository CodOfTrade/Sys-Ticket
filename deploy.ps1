# Script PowerShell para deploy automatizado
$password = "123321"
$commands = @"
cd /home/ubuntu/Sys-Ticket
git pull
pm2 restart backend
exit
"@

Write-Host "Conectando ao servidor e executando comandos..." -ForegroundColor Green

# Cria um arquivo temporário com os comandos
$commandFile = [System.IO.Path]::GetTempFileName()
$commands | Out-File -FilePath $commandFile -Encoding ASCII

# Executa SSH com os comandos
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "ssh"
$psi.Arguments = "root@172.31.255.26"
$psi.RedirectStandardInput = $true
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.UseShellExecute = $false

$process = New-Object System.Diagnostics.Process
$process.StartInfo = $psi

try {
    $process.Start() | Out-Null

    # Envia a senha
    Start-Sleep -Milliseconds 500
    $process.StandardInput.WriteLine($password)

    # Envia os comandos
    Start-Sleep -Milliseconds 500
    $commands.Split("`n") | ForEach-Object {
        $process.StandardInput.WriteLine($_.Trim())
        Start-Sleep -Milliseconds 200
    }

    # Aguarda conclusão
    $process.WaitForExit(30000)

    # Mostra output
    $output = $process.StandardOutput.ReadToEnd()
    $error = $process.StandardError.ReadToEnd()

    Write-Host $output
    if ($error) {
        Write-Host "Erros/Avisos:" -ForegroundColor Yellow
        Write-Host $error
    }

    Write-Host "`nDeploy concluído!" -ForegroundColor Green
}
catch {
    Write-Host "Erro ao executar deploy: $_" -ForegroundColor Red
}
finally {
    if ($process -and !$process.HasExited) {
        $process.Kill()
    }
    Remove-Item $commandFile -ErrorAction SilentlyContinue
}
