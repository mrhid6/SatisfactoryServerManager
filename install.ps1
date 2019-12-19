
param(
    [bool]$update=$false,
    [bool]$force=$false
)

echo "#-----------------------------#"
echo "#      _____ _____ __  __     #"
echo "#     / ____/ ____|  \/  |    #"
echo "#    | (___| (___ | \  / |    #"
echo "#     \___ \\___ \| |\/| |    #"
echo "#     ____) |___) | |  | |    #"
echo "#    |_____/_____/|_|  |_|    #"
echo "#-----------------------------#"
echo "# Satisfactory Server Manager #"
echo "#-----------------------------#"

$installDir = "C:\Program Files\SSM"

$SSM_releases = "https://api.github.com/repos/mrhid6/satisfactoryservermanager/releases/latest"
$SMLauncher_releases = "https://api.github.com/repos/mircearoata/SatisfactoryModLauncherCLI/releases/latest"

$SSM_release = (Invoke-WebRequest $SSM_releases -UseBasicParsing| ConvertFrom-Json)[0]
$SSM_VER = $SSM_release[0].tag_name
$SSM_URL = $SSM_release.assets[1].browser_download_url

$SMLauncher_release = (Invoke-WebRequest $SMLauncher_releases -UseBasicParsing| ConvertFrom-Json)[0]
$SMLauncher_VER = $SMLauncher_release[0].tag_name
$SMLauncher_URL = $SMLauncher_release.assets[0].browser_download_url

if((Test-Path $installDir) -eq $true){

    if($update -eq $false -and $force -eq $false){
        Write-Error "Error: SSM is already installed!"
        throw;
    }else{
        $SSM_CUR=Get-Content -path "$($installDir)\version.txt"
        write-host "Updating SSM $($SSM_CUR) to $($SSM_VER)"
    }
}else{
    write-host "Installing SSM $($SSM_VER)"
    New-Item -ItemType Directory -Path "$($installDir)" -Force | out-null
}

Remove-Item -Path "$($installDir)\*" -Recurse | out-null
New-Item -ItemType Directory -Path "$($installDir)\SMLauncher" -Force | out-null

Invoke-WebRequest $SSM_URL -Out "$($installDir)\SSM.zip" -UseBasicParsing
Expand-Archive "$($installDir)\SSM.zip" -DestinationPath "$($installDir)" -Force

Invoke-WebRequest $SMLauncher_URL -Out "$($installDir)\SMLauncher\SatisfactoryModLauncherCLI.exe" -UseBasicParsing

Remove-Item -Path "$($installDir)\SSM.zip"

Set-Content -Path "$($installDir)\version.txt" -Value "$($SSM_VER)"