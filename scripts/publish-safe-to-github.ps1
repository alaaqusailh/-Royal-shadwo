$ErrorActionPreference = "Stop"
$expectedOwner = "alaaqusailh"
$expectedRepository = "vigilant-octo-enigma"
$logPath = Join-Path (Split-Path -Parent $PSScriptRoot) ".data\github-publish.log"

function Invoke-Git {
  param([Parameter(Mandatory)][string[]]$Arguments)
  $output = & git @Arguments 2>&1
  if ($LASTEXITCODE -ne 0) {
    $message = ($output | ForEach-Object { "$_" }) -join [Environment]::NewLine
    throw "Git $($Arguments[0]) failed: $message"
  }
  return $output
}

function Test-SensitivePath {
  param([Parameter(Mandatory)][string]$Path)
  if ($Path -eq ".env.example") { return $false }

  $name = [IO.Path]::GetFileName($Path)
  return $Path -match '(^|/)\.env($|\.)' -or
    $Path -match '(^|/)(secrets?|credentials?)(/|$)' -or
    $Path -match '(^|/)(\.netrc|\.npmrc|credentials?(\.[^/]*)?|secrets?(\.[^/]*)?|service[-_]?account[^/]*|firebase-adminsdk[^/]*)$' -or
    $Path -match '\.(pem|key|p12|pfx|p7b|p7c|jks|keystore|ppk|p8|der|crt|cer|asc|mobileprovision)$' -or
    $name -match '^(id_rsa|id_dsa|id_ecdsa|id_ed25519)(\.pub)?$' -or
    $Path -match '(^|/)terraform\.tfstate(\.backup)?$'
}

function Test-PlaceholderValue {
  param([string]$Value)
  $normalized = $Value.Trim().Trim('"').Trim("'").Trim()
  if (-not $normalized) { return $true }
  if ($normalized -match '^(?i)(your[-_ ]|replace[-_ ]|change[-_ ]|example|placeholder|todo|<.*>|\$\{[^}]+\}|\{\{.*\}\})') { return $true }
  return $false
}

function Test-EnvironmentExample {
  param([Parameter(Mandatory)][string]$Path)
  foreach ($line in Get-Content -LiteralPath $Path) {
    if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$' -and
      -not (Test-PlaceholderValue $matches[2])) {
      return "contains a non-empty value for $($matches[1])"
    }
    if ($line -match '-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----') {
      return "contains private-key material"
    }
  }
  $contentProblem = Find-SecretContent $Path
  if ($contentProblem) { return $contentProblem }
  return $null
}

function Find-SecretContent {
  param([Parameter(Mandatory)][string]$Path)
  try {
    $bytes = [IO.File]::ReadAllBytes($Path)
  } catch {
    throw "Could not inspect changed file '$Path': $($_.Exception.Message)"
  }
  if ($bytes -contains 0) { return $null }

  $text = [Text.Encoding]::UTF8.GetString($bytes)
  $patterns = @(
    '-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',
    '\bAKIA[0-9A-Z]{16}\b',
    '\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})\b',
    '\bxox[baprs]-[A-Za-z0-9-]{20,}\b',
    '\bsk_live_[A-Za-z0-9]{16,}\b',
    '(?i)\b(?:password|passwd|secret|token|api[_-]?key|access[_-]?key|private[_-]?key|client[_-]?secret|database_url|connection_string)\s*[:=]\s*["'']?([^\s"'']{16,})'
  )
  foreach ($pattern in $patterns) {
    foreach ($match in [regex]::Matches($text, $pattern)) {
      $value = if ($match.Groups.Count -gt 1 -and $match.Groups[1].Success) { $match.Groups[1].Value } else { $match.Value }
      if (-not (Test-PlaceholderValue $value) -and $value -notmatch '^(?i)(process\.env|env\(|\$\{|\{\{)') {
        $lineNumber = 1 + ([regex]::Matches($text.Substring(0, $match.Index), "`n")).Count
        return "possible secret detected at line $lineNumber"
      }
    }
  }
  return $null
}

function Write-PublishLog {
  param([Parameter(Mandatory)][string]$Message)
  try {
    $directory = Split-Path -Parent $logPath
    [IO.Directory]::CreateDirectory($directory) | Out-Null
    Add-Content -LiteralPath $logPath -Value "$(Get-Date -Format 'yyyy-MM-ddTHH:mm:ssK') $Message" -Encoding UTF8
  } catch {
    Write-Warning "Could not write the local publish log: $($_.Exception.Message)"
  }
}

Set-Location (Split-Path -Parent $PSScriptRoot)

try {
  $root = (Invoke-Git @("rev-parse", "--show-toplevel") | Select-Object -First 1).Trim()
  if ([IO.Path]::GetFullPath($root) -ne [IO.Path]::GetFullPath((Get-Location).Path)) {
    throw "Run this task from the fashion-store repository root."
  }

  $branch = (Invoke-Git @("branch", "--show-current") | Select-Object -First 1).Trim()
  if (-not $branch) {
    throw "The repository is in detached-HEAD state. Check out a branch before publishing."
  }
  if ($branch -match '^(security/|dependabot/|renovate/)') {
    Write-Warning "The current branch '$branch' looks like an automation/security branch. Verify it is the intended publishing branch."
  }

  $remote = (Invoke-Git @("remote", "get-url", "origin") | Select-Object -First 1).Trim()
  if ($remote -match '^https://github\.com/([^/]+)/([^/]+?)(?:\.git)?$') {
    $owner = $matches[1]
    $repository = $matches[2]
  } elseif ($remote -match '^git@github\.com:([^/]+)/([^/]+?)(?:\.git)?$') {
    $owner = $matches[1]
    $repository = $matches[2]
  } else {
    throw "The origin remote is not a supported GitHub HTTPS/SSH URL. Inspect it with 'git remote -v'; no files were staged."
  }
  if ($owner -ne $expectedOwner -or $repository -ne $expectedRepository) {
    throw "origin does not point to the expected repository '$expectedOwner/$expectedRepository'. No files were staged."
  }

  $gitDirectory = (Invoke-Git @("rev-parse", "--git-dir") | Select-Object -First 1).Trim()
  if (-not [IO.Path]::IsPathRooted($gitDirectory)) { $gitDirectory = Join-Path (Get-Location).Path $gitDirectory }
  foreach ($marker in @("MERGE_HEAD", "CHERRY_PICK_HEAD", "REVERT_HEAD", "rebase-merge", "rebase-apply")) {
    if (Test-Path (Join-Path $gitDirectory $marker)) {
      throw "Git operation '$marker' is in progress. Resolve it before publishing."
    }
  }

  $unmerged = @(Invoke-Git @("diff", "--name-only", "--diff-filter=U"))
  if ($unmerged.Count -gt 0) { throw "Unmerged conflicts exist. Resolve them before publishing." }

  $stagedChanges = @(Invoke-Git @("diff", "--cached", "--name-only"))
  if ($stagedChanges.Count -gt 0) {
    throw "The Git index already contains staged changes. Review and commit them separately before running this task; nothing was staged or pushed."
  }

  $remoteCheck = & git ls-remote --symref origin HEAD 2>&1
  if ($LASTEXITCODE -ne 0) {
    $message = ($remoteCheck | ForEach-Object { "$_" }) -join [Environment]::NewLine
    throw "Could not access GitHub or authenticate to origin: $message"
  }

  $changed = @(
    Invoke-Git @("diff", "--name-only", "--diff-filter=ACMRTUXB")
    Invoke-Git @("diff", "--name-only", "--diff-filter=D")
    Invoke-Git @("ls-files", "--others", "--exclude-standard")
  ) | Where-Object { $_ } | Sort-Object -Unique

  if ($changed.Count -eq 0) {
    Write-Host "No non-ignored changes to publish."
    Write-PublishLog "branch=$branch added=0 modified=0 deleted=0 result=no-changes"
    exit 0
  }

  $deleted = @(Invoke-Git @("diff", "--name-only", "--diff-filter=D"))
  $trackedSensitive = @(
    Invoke-Git @("ls-tree", "-r", "--name-only", "HEAD")
  ) | Where-Object { (Test-SensitivePath $_) -and $_ -notin $deleted }
  if ($trackedSensitive.Count -gt 0) {
    throw "The current commit still tracks sensitive paths ($($trackedSensitive -join ', ')). Remove their values, rotate exposed credentials, and commit their removal before pushing. Nothing was staged."
  }

  $allowed = [Collections.Generic.List[string]]::new()
  $excluded = [Collections.Generic.List[string]]::new()
  foreach ($path in $changed) {
    if (Test-SensitivePath $path) {
      if (Test-Path -LiteralPath $path) {
        $excluded.Add("$path (sensitive filename)")
        continue
      }
      $allowed.Add($path)
      continue
    }

    $null = & git check-ignore --quiet --no-index -- $path
    if ($LASTEXITCODE -eq 0) {
      $excluded.Add("$path (.gitignore)")
      continue
    }
    if ($LASTEXITCODE -ne 1) { throw "Could not check .gitignore for '$path'." }

    if (Test-Path -LiteralPath $path) {
      $item = Get-Item -LiteralPath $path -Force
      if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
        $excluded.Add("$path (symbolic link/reparse point)")
        continue
      }
    }

    if ($path -eq ".env.example") {
      $problem = Test-EnvironmentExample $path
      if ($problem) {
        $excluded.Add("$path ($problem)")
        continue
      }
    }

    if (Test-Path -LiteralPath $path -PathType Leaf) {
      $problem = Find-SecretContent $path
      if ($problem) {
        $excluded.Add("$path ($problem)")
        continue
      }
    }
    $allowed.Add($path)
  }

  $unpublishedHistory = @(
    Invoke-Git @("log", "--format=", "--name-only", "HEAD")
  ) | Where-Object { $_ -and (Test-SensitivePath $_) } | Sort-Object -Unique
  if ($unpublishedHistory.Count -gt 0) {
    Write-Warning "Sensitive file paths exist in reachable Git history: $($unpublishedHistory -join ', '). A new commit cannot erase those past contents; ensure every exposed credential has been rotated."
  }

  $tracked = @(Invoke-Git @("diff", "--name-only"))
  $untracked = @(Invoke-Git @("ls-files", "--others", "--exclude-standard"))
  $addedCount = @($allowed | Where-Object { $untracked -contains $_ -and $_ -notin $deleted }).Count
  $deletedCount = @($allowed | Where-Object { $deleted -contains $_ }).Count
  $modifiedCount = @($allowed | Where-Object { $tracked -contains $_ -and $_ -notin $deleted }).Count

  Write-Host ""
  Write-Host "Repository: $expectedOwner/$expectedRepository"
  Write-Host "Branch:     $branch"
  Write-Host "Remote:     origin (GitHub reachable)"
  Write-Host ""
  Write-Host "Files to include:"
  if ($allowed.Count -eq 0) { Write-Host "  (none)" }
  foreach ($path in $allowed) { Write-Host "  $path" }
  Write-Host ""
  Write-Host "Excluded for safety:"
  if ($excluded.Count -eq 0) { Write-Host "  (none)" }
  foreach ($path in $excluded) { Write-Host "  $path" }
  Write-Host ""
  Write-Host "Summary: $addedCount added, $modifiedCount modified, $deletedCount deleted; $($excluded.Count) excluded."

  if ($allowed.Count -eq 0) {
    Write-PublishLog "branch=$branch added=0 modified=0 deleted=0 excluded=$($excluded.Count) result=no-safe-files"
    throw "There are no safe files to publish. Excluded files were left untouched."
  }

  Write-Host ""
  Write-Host "A push to this branch publishes its existing commit history too; excluding a file now cannot remove its earlier contents from Git history."
  $confirmation = Read-Host "Type PUSH to stage these files, create a commit, and push only to '$branch'"
  if ($confirmation -cne "PUSH") {
    Write-Host "Cancelled. No files were staged, committed, or pushed."
    Write-PublishLog "branch=$branch added=$addedCount modified=$modifiedCount deleted=$deletedCount result=cancelled"
    exit 0
  }

  $addArguments = @("add", "--") + @($allowed)
  Invoke-Git $addArguments | Out-Null

  $stagedPaths = @(Invoke-Git @("diff", "--cached", "--name-only") | Sort-Object -Unique)
  $expectedPaths = @($allowed | Sort-Object -Unique)
  if (Compare-Object -ReferenceObject $expectedPaths -DifferenceObject $stagedPaths) {
    throw "Staged files differ from the reviewed list. No commit or push was made."
  }
  foreach ($path in $stagedPaths) {
    if (Test-SensitivePath $path -and (Test-Path -LiteralPath $path)) {
      throw "A sensitive file reached the Git index. No commit or push was made."
    }
    if (Test-Path -LiteralPath $path -PathType Leaf) {
      $entry = @(Invoke-Git @("ls-files", "--stage", "--", $path) | Select-Object -First 1)
      if ($entry.Count -eq 0 -or $entry[0] -notmatch '^100(?:644|755) [0-9a-f]{40,64} 0\t') {
        throw "The staged file '$path' is not a regular file. No commit or push was made."
      }
      $indexHash = [regex]::Match($entry[0], '^\d+ ([0-9a-f]{40,64}) 0\t').Groups[1].Value
      $workingHash = (Invoke-Git @("hash-object", "--path=$path", "--", $path) | Select-Object -First 1).Trim()
      if ($indexHash -ne $workingHash) {
        throw "The staged content for '$path' changed during review. No commit or push was made."
      }
      $problem = Find-SecretContent $path
      if ($problem) { throw "Secret content was detected again in '$path'. No commit or push was made." }
      $verifiedHash = (Invoke-Git @("hash-object", "--path=$path", "--", $path) | Select-Object -First 1).Trim()
      if ($indexHash -ne $verifiedHash) {
        throw "The file '$path' changed during the final safety scan. No commit or push was made."
      }
    }
  }

  Invoke-Git @("diff", "--cached", "--check") | Out-Null
  Invoke-Git @("commit", "-m", "chore: publish safe workspace changes") | Out-Null
  $commit = (Invoke-Git @("rev-parse", "--short", "HEAD") | Select-Object -First 1).Trim()
  Write-Host "Created commit $commit. Pushing to origin/$branch ..."

  try {
    Invoke-Git @("push", "--set-upstream", "origin", $branch) | Out-Host
  } catch {
    Write-PublishLog "branch=$branch commit=$commit added=$addedCount modified=$modifiedCount deleted=$deletedCount result=push-failed"
    throw "Commit $commit was created locally, but push failed. Review 'git status' and the Git error; do not force-push. $($_.Exception.Message)"
  }

  $headSha = (Invoke-Git @("rev-parse", "HEAD") | Select-Object -First 1).Trim()
  $remoteLine = (Invoke-Git @("ls-remote", "--heads", "origin", "refs/heads/$branch") | Select-Object -First 1).ToString()
  $remoteSha = ($remoteLine -split '\s+')[0]
  if ($headSha -ne $remoteSha) {
    Write-PublishLog "branch=$branch commit=$commit added=$addedCount modified=$modifiedCount deleted=$deletedCount result=verification-failed"
    throw "Push command completed, but the remote branch SHA did not match local HEAD. Verify GitHub before treating this as successful."
  }

  Write-Host ""
  Write-Host "Verified: origin/$branch points to $headSha."
  Write-Host "Result: $addedCount added, $modifiedCount modified, $deletedCount deleted."
  Write-Host "Log: $logPath"
  Write-PublishLog "branch=$branch commit=$headSha added=$addedCount modified=$modifiedCount deleted=$deletedCount excluded=$($excluded.Count) result=success"
} catch {
  Write-Error $_
  Write-PublishLog "result=failed"
  exit 1
}
