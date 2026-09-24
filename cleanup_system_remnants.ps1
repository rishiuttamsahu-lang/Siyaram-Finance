# Elevated System-Level Cleanup Script
# Run this script in PowerShell as Administrator

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Cleaning System-Level Remnants..." -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. Android Studio (Official Uninstaller + Files + Registry + Shortcuts)
Write-Host "`n[1/3] Processing Android Studio..." -ForegroundColor Yellow
$asUninstaller = "C:\Program Files\Android\Android Studio\uninstall.exe"
if (Test-Path $asUninstaller) {
    Write-Host "Running Android Studio uninstaller..." -ForegroundColor Gray
    Start-Process -FilePath $asUninstaller -ArgumentList "/S" -Wait
    Start-Sleep -Seconds 3
}

$asPaths = @(
    "C:\Program Files\Android",
    "C:\ProgramData\Microsoft\Windows\Start Menu\Programs\Android Studio"
)
foreach ($p in $asPaths) {
    if (Test-Path $p) {
        Remove-Item -Path $p -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  Removed: $p" -ForegroundColor Green
    }
}

Get-ChildItem -Path @('HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall', 'HKLM:\Software\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall') -ErrorAction SilentlyContinue |
    Where-Object { $_.GetValue('DisplayName') -match 'Android Studio' } |
    ForEach-Object {
        Remove-Item -Path $_.PSPath -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  Removed Registry Key: $($_.Name)" -ForegroundColor Green
    }

# 2. BlueStacks (Driver, Shortcuts, Registry)
Write-Host "`n[2/3] Processing BlueStacks leftovers..." -ForegroundColor Yellow
$bsPaths = @(
    "C:\Program Files\BlueStacks_nxt",
    "C:\ProgramData\BlueStacks_nxt",
    "C:\ProgramData\Microsoft\Windows\Start Menu\Programs\BlueStacks 5.lnk",
    "C:\ProgramData\Microsoft\Windows\Start Menu\Programs\BlueStacks Manager.lnk",
    "C:\ProgramData\Microsoft\Windows\Start Menu\Programs\BlueStacks Store"
)
foreach ($p in $bsPaths) {
    if (Test-Path $p) {
        Remove-Item -Path $p -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  Removed: $p" -ForegroundColor Green
    }
}

Get-ChildItem -Path @('HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall', 'HKLM:\Software\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall') -ErrorAction SilentlyContinue |
    Where-Object { $_.GetValue('DisplayName') -match 'BlueStacks' -or $_.PSChildName -match 'BlueStacks' } |
    ForEach-Object {
        Remove-Item -Path $_.PSPath -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  Removed Registry Key: $($_.Name)" -ForegroundColor Green
    }

# 3. Google Play Services / Google Play Games residual logs
Write-Host "`n[3/3] Processing Google Play residual folders..." -ForegroundColor Yellow
$gpPaths = @(
    "C:\ProgramData\Google\Play Games",
    "C:\ProgramData\Google\Play Games Services"
)
foreach ($p in $gpPaths) {
    if (Test-Path $p) {
        Remove-Item -Path $p -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  Removed: $p" -ForegroundColor Green
    }
}

Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host " System Cleanup Complete! All selected items removed." -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
