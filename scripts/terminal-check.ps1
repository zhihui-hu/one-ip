param(
  [string]$BaseUrl = $env:ONE_IP_URL
)

$ErrorActionPreference = "Stop"
if ([string]::IsNullOrWhiteSpace($BaseUrl)) {
  [Console]::Error.WriteLine("用法：`$env:ONE_IP_URL='https://你的域名'; ./scripts/terminal-check.ps1")
  exit 2
}
$BaseUrl = $BaseUrl.TrimEnd('/')
$baseUri = $null
if (-not [Uri]::TryCreate($BaseUrl, [UriKind]::Absolute, [ref]$baseUri) -or $baseUri.Scheme -ne "https" -or [string]::IsNullOrWhiteSpace($baseUri.Host)) {
  [Console]::Error.WriteLine("BaseUrl 必须是 HTTPS 地址")
  exit 2
}
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$manifestPath = Join-Path $scriptDir "terminal-sources.json"
if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
  [Console]::Error.WriteLine("缺少终端来源清单：$manifestPath")
  exit 2
}
try {
  $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
} catch {
  [Console]::Error.WriteLine("终端来源清单无效：$manifestPath")
  exit 2
}
if ($manifest.schemaVersion -ne 1 -or
    [string]::IsNullOrWhiteSpace([string]$manifest.registryVersion) -or
    $null -eq $manifest.sources) {
  [Console]::Error.WriteLine("终端来源清单无效：$manifestPath")
  exit 2
}
$runId = "terminal-{0}-{1}" -f (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ"), $PID
$startedAt = (Get-Date).ToUniversalTime().ToString("o")
$results = [System.Collections.Generic.List[object]]::new()

function Add-ProbeResult([string]$SourceId, [string]$Method, [string]$Url) {
  $capturedAt = (Get-Date).ToUniversalTime().ToString("o")
  try {
    $response = Invoke-WebRequest -Uri $Url -Method Get -TimeoutSec 3 -Headers @{ Accept = "application/json" }
    $body = $response.Content
    $ip = switch ($Method) {
      "ip-json" {
        try {
          $json = $body | ConvertFrom-Json
          if ($json.ip -is [string]) { $json.ip.Trim() } else { "" }
        } catch {
          ""
        }
      }
      "ip-text" {
        $match = [regex]::Match($body, "(?:\d{1,3}\.){3}\d{1,3}")
        if ($match.Success) { $match.Value } else { "" }
      }
      default { "" }
    }
    if ($ip.Length -gt 0) {
      $results.Add([ordered]@{
        schemaVersion = 1; runId = $runId; sourceId = $SourceId; runtime = "terminal"
        execution = "client-request"; subject = "caller-egress"; provenance = "observed"
        verified = $true; ip = $ip; status = "ok"; capturedAt = $capturedAt; receivedAt = $capturedAt
      })
      return
    }
    $status = "parse_error"
  } catch {
    $status = "network_error"
  }
  $results.Add([ordered]@{
    schemaVersion = 1; runId = $runId; sourceId = $SourceId; runtime = "terminal"
    execution = "client-request"; subject = "caller-egress"; provenance = "observed"
    verified = $false; status = $status; capturedAt = $capturedAt; receivedAt = $capturedAt
  })
}

foreach ($source in @($manifest.sources)) {
  if ([string]::IsNullOrWhiteSpace([string]$source.id) -or
      @("ip-text", "ip-json") -notcontains [string]$source.method -or
      [string]::IsNullOrWhiteSpace([string]$source.url)) {
    [Console]::Error.WriteLine("终端来源清单包含无效来源：$($source.id)")
    exit 2
  }
  Add-ProbeResult ([string]$source.id) ([string]$source.method) ([string]$source.url)
}

$finishedAt = (Get-Date).ToUniversalTime().ToString("o")
[ordered]@{
  schemaVersion = 1; registryVersion = $manifest.registryVersion; runId = $runId
  startedAt = $startedAt; finishedAt = $finishedAt; results = $results
} | ConvertTo-Json -Depth 8
