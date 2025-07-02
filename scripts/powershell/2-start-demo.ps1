# Move to the repo root directory
Set-Location -Path $PSScriptRoot
Set-Location -Path ..

# Install dependencies and start the visualization app
npm install
npm run build
npm run start

# Check if the command was successful
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to start the visualization app. Please check the configuration and try again." -ForegroundColor Red
    Read-Host -Prompt "Press Enter to exit"
    exit $LASTEXITCODE
}

# Wait for user input before closing
Read-Host -Prompt "Press Enter to continue"
