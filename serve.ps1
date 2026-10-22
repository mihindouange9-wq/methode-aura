# Petit serveur HTTP local pour tester le site. Le fond video reconstruit a
# besoin de http:// (en file:// le navigateur interdit de lire les pixels de
# la video). Lancer dans un terminal :
#   powershell -ExecutionPolicy Bypass -File .\serve.ps1
# ou clic droit > Executer avec PowerShell.
# Les requetes partielles (Range) sont servies : les videos se lisent et se cherchent.
param([int]$Port = 8080, [switch]$NoBrowser)
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host ("METHODE AURA - http://localhost:{0}/  (Ctrl+C pour arreter)" -f $Port)
if (-not $NoBrowser) { Start-Process ("http://localhost:{0}/" -f $Port) }
$types = @{ '.html'='text/html; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.mp4'='video/mp4'; '.webm'='video/webm'; '.svg'='image/svg+xml'; '.png'='image/png'; '.jpg'='image/jpeg'; '.webp'='image/webp'; '.json'='application/json'; '.woff2'='font/woff2'; '.md'='text/plain; charset=utf-8' }
try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    try {
    $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
    if ($path -eq '/') { $path = '/index.html' }
    $file = Join-Path $root ($path -replace '/', '\')
    $res = $ctx.Response
    if ((Test-Path $file) -and -not (Get-Item $file).PSIsContainer -and $file.StartsWith($root)) {
      $ext = [IO.Path]::GetExtension($file).ToLower()
      $res.ContentType = if ($types[$ext]) { $types[$ext] } else { 'application/octet-stream' }
      $bytes = [IO.File]::ReadAllBytes($file)
      $res.Headers.Add('Cache-Control', 'no-cache')
      $res.Headers.Add('Accept-Ranges', 'bytes')
      $range = $ctx.Request.Headers['Range']
      $start = [int64]0
      $end = [int64]($bytes.Length - 1)
      if ($range -and $range -match '^bytes=(\d*)-(\d*)$') {
        if ($Matches[1] -ne '') { $start = [int64]$Matches[1] }
        if ($Matches[2] -ne '') { $end = [int64]$Matches[2] }
        if ($end -ge $bytes.Length) { $end = [int64]($bytes.Length - 1) }
        $res.StatusCode = 206
        $res.Headers.Add('Content-Range', ('bytes {0}-{1}/{2}' -f $start, $end, $bytes.Length))
      }
      $len = [int]($end - $start + 1)
      $res.ContentLength64 = $len
      $res.OutputStream.Write($bytes, [int]$start, $len)
    } else {
      $res.StatusCode = 404
      $msg = [Text.Encoding]::UTF8.GetBytes('404')
      $res.OutputStream.Write($msg, 0, $msg.Length)
    }
    $res.Close()
    } catch { try { $ctx.Response.Abort() } catch {} }
  }
} finally { $listener.Stop() }
