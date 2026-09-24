Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$baseDir = "c:\Users\Rishikesh\OneDrive\Documents\GitHub\Siyaram Project"
$zipPath = Join-Path $baseDir "Siyaram-Finance.zip"

if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

$excludeDirs = @(
    '(\\|/)\.git(\\|/|$)',
    '(\\|/)\.next(\\|/|$)',
    '(\\|/)node_modules(\\|/|$)',
    '(\\|/)\.wrangler(\\|/|$)'
)

$excludeFiles = @(
    '^firebase-services\.json$',
    '^project data\.txt$',
    '^secrets_list\.json$',
    '^settings\.json$',
    '^Siyaram-Finance\.zip$',
    '^\.env.*',
    '.*\.tsbuildinfo$',
    '^create_zip\.ps1$'
)

$dirRegex = $excludeDirs -join '|'
$fileRegex = $excludeFiles -join '|'

$allFiles = Get-ChildItem -Path $baseDir -Recurse -File | Where-Object {
    $full = $_.FullName
    $name = $_.Name
    if ($full -match $dirRegex) { return $false }
    if ($name -match $fileRegex) { return $false }
    return $true
}

Write-Host "Found $($allFiles.Count) files to package."

$zip = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)

try {
    foreach ($file in $allFiles) {
        $relativePath = $file.FullName.Substring($baseDir.Length).TrimStart('\', '/')
        $entryName = $relativePath -replace '\\', '/'
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $file.FullName, $entryName, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
}
finally {
    $zip.Dispose()
}

$zipFileInfo = Get-Item $zipPath
Write-Host "Successfully created: $zipPath"
Write-Host "File count: $($allFiles.Count)"
Write-Host "Archive size: $([math]::Round($zipFileInfo.Length / 1MB, 2)) MB ($($zipFileInfo.Length) bytes)"
