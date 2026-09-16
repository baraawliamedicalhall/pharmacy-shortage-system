$ErrorActionPreference = 'Stop'

$sourceUrl = 'http://180.211.137.202:9310/Allopathic/Medicine_Information_Ajax.php?action=export'
$outputPath = Join-Path $PSScriptRoot '..\data\dgda-allopathic-medicines.json'
$outputDirectory = Split-Path -Parent $outputPath
$temporaryCsv = Join-Path ([System.IO.Path]::GetTempPath()) 'dgda-allopathic-medicines.csv'

New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
Invoke-WebRequest -Uri $sourceUrl -UseBasicParsing -TimeoutSec 120 -OutFile $temporaryCsv

$records = Import-Csv -LiteralPath $temporaryCsv | ForEach-Object {
  [ordered]@{
    sl = [int]$_.SL
    company = $_.Company
    tradeName = $_.'Trade Name'
    genericNameWithStrength = $_.'Generic Name With Strength'
    dosageForm = $_.'Dosage Form'
    darNo = $_.'DAR No'
  }
}

$payload = [ordered]@{
  source = 'Directorate General of Drug Administration (DGDA)'
  sourceUrl = $sourceUrl
  category = 'Allopathic'
  fetchedAt = (Get-Date).ToUniversalTime().ToString('o')
  recordCount = @($records).Count
  medicines = @($records)
}

$payload | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $outputPath -Encoding utf8
Remove-Item -LiteralPath $temporaryCsv -Force

Write-Output "Wrote $($payload.recordCount) records to $outputPath"
