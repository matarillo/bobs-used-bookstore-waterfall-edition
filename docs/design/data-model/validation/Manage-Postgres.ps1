param(
  [ValidateSet('Start','Stop','Status')][string]$Action = 'Status',
  [int]$Port = 55468,
  [string]$PgBin = ''
)
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false
if (!$PgBin) { $PgBin = (& pg_config --bindir).Trim() }
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../../..'))
$runtime = Join-Path $repoRoot '.local/data-model-postgres'
$data = Join-Path $runtime 'data'
$pgctl = Join-Path $PgBin 'pg_ctl.exe'
$psql = Join-Path $PgBin 'psql.exe'
function Query([string]$Sql) {
  $output = & $psql -X -w -h 127.0.0.1 -p $Port -U bobs_model -d postgres -v ON_ERROR_STOP=1 -At -c $Sql 2>&1
  if ($LASTEXITCODE -ne 0) { throw ($output -join "`n") }
  ($output -join "`n").Trim()
}
if ($Action -eq 'Start') {
  New-Item -ItemType Directory -Force -Path $runtime | Out-Null
  if (!(Test-Path (Join-Path $data 'PG_VERSION'))) {
    & (Join-Path $PgBin 'initdb.exe') -D $data -U bobs_model --auth=trust --encoding=UTF8 --locale=C *> (Join-Path $runtime 'initdb.log')
    if ($LASTEXITCODE -ne 0) { throw 'initdb failed' }
  }
  & $pgctl status -D $data *> $null
  if ($LASTEXITCODE -ne 0) {
    $arguments = @('start','-D',('"' + $data + '"'),'-l',('"' + (Join-Path $runtime 'server.log') + '"'),'-o',('"-h 127.0.0.1 -p ' + $Port + '"'),'-w','-t','30')
    $process = Start-Process -FilePath $pgctl -ArgumentList $arguments -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtime 'start.log') -RedirectStandardError (Join-Path $runtime 'start-error.log')
    if (!$process.WaitForExit(40000) -or $process.ExitCode -ne 0) { throw 'pg_ctl start failed' }
  }
  if ([IO.Path]::GetFullPath((Query 'SHOW data_directory')) -ne [IO.Path]::GetFullPath($data)) { throw 'Unexpected PostgreSQL cluster' }
  if ((Query "SELECT count(*) FROM pg_database WHERE datname='bobs_model_validation'") -eq '0') {
    Query 'CREATE DATABASE bobs_model_validation' | Out-Null
  }
}
if ($Action -eq 'Stop' -and (Test-Path (Join-Path $data 'PG_VERSION'))) {
  & $pgctl status -D $data *> $null
  if ($LASTEXITCODE -eq 0) {
    & $pgctl stop -D $data -m fast -w -t 30 *> (Join-Path $runtime 'stop.log')
    if ($LASTEXITCODE -ne 0) { throw 'pg_ctl stop failed' }
  }
}
$running = $false
if (Test-Path (Join-Path $data 'PG_VERSION')) {
  & $pgctl status -D $data *> $null
  $running = $LASTEXITCODE -eq 0
}
[ordered]@{action=$Action; running=$running; host='127.0.0.1'; port=$Port; database='bobs_model_validation'; data=$data} | ConvertTo-Json
