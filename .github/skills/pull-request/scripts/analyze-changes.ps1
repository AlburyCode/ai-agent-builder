# PowerShell — Analyze pending git changes
# Used by the pull-request skill (SKILL.md Step 1)
# Outputs a structured summary for the Copilot agent to analyze

param(
    [string]$BaseBranch = "main"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  GIT CHANGE ANALYSIS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# --- Guard: check git repo ---
if (-not (Test-Path ".git")) {
    Write-Error "Not a git repository. Run from the project root."
    exit 1
}

# --- Current branch ---
$currentBranch = git branch --show-current
Write-Host "Current branch : $currentBranch" -ForegroundColor Yellow
Write-Host "Base branch    : $BaseBranch`n" -ForegroundColor Yellow

# --- Pending (uncommitted) changes ---
Write-Host "--- PENDING CHANGES (not committed) ---" -ForegroundColor Green
$statusLines = git status --porcelain
if ($statusLines) {
    $statusLines | ForEach-Object { Write-Host "  $_" }
} else {
    Write-Host "  (none — working tree clean)"
}

# --- Count by status ---
$newFiles      = @($statusLines | Where-Object { $_ -match '^\?\?' }).Count
$modifiedFiles = @($statusLines | Where-Object { $_ -match '^.M|^M.' }).Count
$deletedFiles  = @($statusLines | Where-Object { $_ -match '^.D|^D.' }).Count

Write-Host "`n  New: $newFiles  |  Modified: $modifiedFiles  |  Deleted: $deletedFiles`n"

# --- Commits ahead of base branch ---
Write-Host "--- COMMITS AHEAD OF $BaseBranch ---" -ForegroundColor Green
$aheadCommits = git log --oneline "$BaseBranch..HEAD" 2>$null
if ($aheadCommits) {
    $aheadCommits | ForEach-Object { Write-Host "  $_" }
} else {
    Write-Host "  (no commits ahead of $BaseBranch)"
}

# --- Diff stat vs base branch ---
Write-Host "`n--- DIFF STAT vs $BaseBranch ---" -ForegroundColor Green
git diff "$BaseBranch" --stat 2>$null

# --- Files grouped by area ---
Write-Host "`n--- FILES GROUPED BY AREA ---" -ForegroundColor Green
$allChanged = git diff "$BaseBranch" --name-only 2>$null
$pendingPaths = $statusLines | ForEach-Object { ($_ -replace '^.{3}', '').Trim() }
$allFiles = ($allChanged + $pendingPaths) | Sort-Object -Unique

$areas = @{
    "backend"          = @()
    "clinic-frontend"  = @()
    ".github"          = @()
    "root"             = @()
}

foreach ($file in $allFiles) {
    if ($file -match '^backend/') {
        $areas["backend"] += $file
    } elseif ($file -match '^clinic-frontend/') {
        $areas["clinic-frontend"] += $file
    } elseif ($file -match '^\.github/') {
        $areas[".github"] += $file
    } else {
        $areas["root"] += $file
    }
}

foreach ($area in $areas.Keys) {
    if ($areas[$area].Count -gt 0) {
        Write-Host "`n  [$area]" -ForegroundColor Magenta
        $areas[$area] | ForEach-Object { Write-Host "    - $_" }
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  END OF ANALYSIS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
