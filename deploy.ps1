# GitHub Pages Deployment Script
# Run this in PowerShell from your project directory

Write-Host "MTG Collection Manager - GitHub Pages Deployment" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green

# Check if git is available
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "Git is not installed. Please install Git first." -ForegroundColor Red
    Write-Host "Download from: https://git-scm.com/download/win" -ForegroundColor Yellow
    exit 1
}

# Check if we're in the right directory
if (-not (Test-Path "main.html")) {
    Write-Host "Please run this script from your MTGCollection directory" -ForegroundColor Red
    exit 1
}

Write-Host "Current directory: $(Get-Location)" -ForegroundColor Cyan

# Initialize git if not already done
if (-not (Test-Path ".git")) {
    Write-Host "Initializing Git repository..." -ForegroundColor Yellow
    git init
    git branch -M main
}

# Add all files
Write-Host "Adding files to git..." -ForegroundColor Yellow
git add .

# Commit changes
$commitMessage = Read-Host "Enter commit message (or press Enter for default)"
if ([string]::IsNullOrWhiteSpace($commitMessage)) {
    $commitMessage = "Deploy MTG Collection Manager"
}

git commit -m $commitMessage

# Get GitHub username
$username = Read-Host "Enter your GitHub username"

# Get repository name
$repoName = Read-Host "Enter repository name (default: MTGCollection)"
if ([string]::IsNullOrWhiteSpace($repoName)) {
    $repoName = "MTGCollection"
}

# Add remote origin
$remoteUrl = "https://github.com/$username/$repoName.git"
Write-Host "Setting remote origin to: $remoteUrl" -ForegroundColor Yellow

git remote remove origin 2>$null
git remote add origin $remoteUrl

# Push to GitHub
Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
git push -u origin main

Write-Host ""
Write-Host "Deployment complete! 🎉" -ForegroundColor Green
Write-Host "Your site will be available at:" -ForegroundColor Green
Write-Host "https://$username.github.io/$repoName" -ForegroundColor Cyan
Write-Host ""
Write-Host "To enable GitHub Pages:" -ForegroundColor Yellow
Write-Host "1. Go to https://github.com/$username/$repoName" -ForegroundColor Yellow
Write-Host "2. Click Settings > Pages" -ForegroundColor Yellow
Write-Host "3. Select 'Deploy from a branch'" -ForegroundColor Yellow
Write-Host "4. Choose 'main' branch and '/ (root)' folder" -ForegroundColor Yellow
Write-Host "5. Click Save" -ForegroundColor Yellow
