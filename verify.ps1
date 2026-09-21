$ErrorActionPreference = "Stop"

function Run-Step {
    param (
        [string]$Name,
        [scriptblock]$Script
    )
    Write-Host "=== $Name ===" -ForegroundColor Cyan
    $global:LASTEXITCODE = 0
    try {
        & $Script
        if ($LASTEXITCODE -ne 0) {
            throw "Command exited with code $LASTEXITCODE"
        }
        Write-Host "[PASS] $Name`n" -ForegroundColor Green
    }
    catch {
        Write-Host "[FAIL] $Name failed: $_" -ForegroundColor Red
        exit 1
    }
}

Run-Step "Flutter Analyze" {
    Push-Location apps\mobile
    try {
        flutter analyze
    } finally {
        Pop-Location
    }
}

Run-Step "Flutter Test" {
    Push-Location apps\mobile
    try {
        flutter test
    } finally {
        Pop-Location
    }
}

Run-Step "React Build" {
    Push-Location apps\dashboard
    try {
        npm run build
    } finally {
        Pop-Location
    }
}

Run-Step "Python Syntax Checks" {
    python -m py_compile backend/main.py ml/__init__.py identity/__init__.py ocr/__init__.py
}

Run-Step "FastAPI Health Check" {
    $currentPath = (Get-Location).Path
    $job = Start-Job -ScriptBlock { 
        Set-Location "$using:currentPath\backend"
        python -m uvicorn main:app --port 8000
    }
    
    try {
        Write-Host "Waiting for server to start..."
        $success = $false
        for ($i = 0; $i -lt 15; $i++) {
            try {
                $response = Invoke-RestMethod -Uri http://localhost:8000/health -ErrorAction Stop
                Write-Host "Health Check Response:"
                $response | ConvertTo-Json -Depth 5
                $success = $true
                break
            } catch {
                Start-Sleep -Seconds 1
            }
        }
        if (-not $success) {
            throw "Health check failed after 15 seconds"
        }
    }
    finally {
        Stop-Job -Job $job
        Remove-Job -Job $job
    }
}

Run-Step "Git Status" {
    git status
}

Write-Host "All Phase 1 verifications PASSED." -ForegroundColor Green
