$ErrorActionPreference = 'Stop'

git add -A
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

git diff --cached --quiet
$diffExitCode = $LASTEXITCODE
if ($diffExitCode -eq 0) {
    Write-Host 'Yayinlanacak degisiklik yok.'
    exit 0
}
if ($diffExitCode -ne 1) {
    exit $diffExitCode
}

$branch = git branch --show-current
if ($LASTEXITCODE -ne 0 -or -not $branch) {
    Write-Error 'Gecerli Git dali bulunamadi.'
    exit 1
}

$message = 'Publish changes ' + (Get-Date -Format 'yyyy-MM-dd HH:mm')
git commit -m $message -m 'Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>'
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

git push -u origin $branch
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}
