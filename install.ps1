
param(
    [bool]$update=$false,
    [bool]$force=$false,
	[bool]$noservice=$false,
	[bool]$nodocker=$false,
    [string]$installDir="C:\Program Files\SSM"
)

$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if($isAdmin -eq $false){
    $noservice = $true;
}

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

write-host "# Script Options:"
write-host "# Update: `t`t$($update)"
write-host "# Force: `t`t$($force)"
write-host "# Install Service: `t$($noservice -eq $false)"
write-host "# Install Directory: `t$($installDir)"

write-host ""

$SSM_releases = "https://api.github.com/repos/mrhid6/satisfactoryservermanager/releases/latest"

$SSM_release = (Invoke-WebRequest $SSM_releases -UseBasicParsing| ConvertFrom-Json)[0]
$SSM_VER = $SSM_release[0].tag_name
$SSM_URL = $SSM_release.assets[1].browser_download_url

if((Test-Path $installDir) -eq $true){

    if($update -eq $false -and $force -eq $false){
        Write-Error "Error: SSM is already installed!"
        throw;
    }else{
        $SSM_CUR=Get-Content -path "$($installDir)\version.txt" -ErrorAction SilentlyContinue
        write-host "Updating SSM $($SSM_CUR) to $($SSM_VER)"
    }
}else{
    write-host "Installing SSM $($SSM_VER)"
    New-Item -ItemType Directory -Path "$($installDir)" -Force | out-null
}

$SSM_Service = Get-Service -Name "SSM" -ErrorAction SilentlyContinue


if($SSM_Service -ne $null -and $isAdmin -eq $true){
	write-host "Stopping SSM Service"
	$SSM_Service | Stop-Service -ErrorAction SilentlyContinue | out-null
}

if($nodocker -eq $false){
    write-host "* Installing Docker"
    Enable-WindowsOptionalFeature –Online -FeatureName Microsoft-Hyper-V –All -NoRestart |out-null
    Install-WindowsFeature RSAT-Hyper-V-Tools -IncludeAllSubFeature -Confirm:$false |out-null
    Uninstall-Package -Name docker -ProviderName DockerMSFTProvider -Confirm:$false |out-null
    Get-VM WinContainerHost | Set-VMProcessor -ExposeVirtualizationExtensions $true |out-null
    Install-Module DockerProvider -Confirm:$false -force |out-null
    Install-Package Docker -ProviderName DockerProvider -RequiredVersion preview -Confirm:$false -force |out-null
    [Environment]::SetEnvironmentVariable(“LCOW_SUPPORTED”, “1”, “Machine”)
    Restart-Service docker
}

write-host "* Downloading SSM"
Remove-Item -Path "$($installDir)\*" -Recurse | out-null

Invoke-WebRequest $SSM_URL -Out "$($installDir)\SSM.zip" -UseBasicParsing
Expand-Archive "$($installDir)\SSM.zip" -DestinationPath "$($installDir)" -Force

write-host "* Cleanup"
Remove-Item -Path "$($installDir)\SSM.zip"
Set-Content -Path "$($installDir)\version.txt" -Value "$($SSM_VER)"

if($noservice -eq $false -and $isAdmin -eq $true){
	write-host "Creating SSM Service"
	write-host "* Downloading NSSM"
	
	Invoke-WebRequest https://nssm.cc/release/nssm-2.24.zip -Out "$($installDir)\nssm.zip" -UseBasicParsing
	Expand-Archive "$($installDir)\nssm.zip" -DestinationPath "$($installDir)" -Force
	
	Move-item -Path "$($installDir)\nssm-2.24\win64\nssm.exe" -Destination "$($installDir)\nssm.exe"
	Remove-Item -Path "$($installDir)\nssm-2.24" -Recurse
	Remove-Item -Path "$($installDir)\nssm.zip"
	
	if($SSM_Service -ne $null){
		write-host "* Removing Old SSM Service"
		& "$($installDir)\nssm.exe" "remove" "SSM" "confirm" | out-null
	}
	
	write-host "* Create SSM Service"
	& "$($installDir)\nssm.exe" "install" "SSM" "$($installDir)\SatisfactoryServerManager.exe" | out-null
    & "$($installDir)\nssm.exe" "set" "SSM" "AppDirectory" "$($installDir)" | out-null
    & "$($installDir)\nssm.exe" "set" "SSM" "DisplayName" "SatisfactoryServerManager" | out-null
    & "$($installDir)\nssm.exe" "set" "SSM" "Description" "Service for SatisfactoryServerManager" | out-null

    $SSM_Service = Get-Service -Name "SSM" -ErrorAction SilentlyContinue

    sleep -m 1500
	write-host "* Start SSM Service"
	$SSM_Service | Start-Service | out-null
}else{
    write-host "SSM Service Skipped"
    $SSM_Service = Get-Service -Name "SSM" -ErrorAction SilentlyContinue
    if($SSM_Service -ne $null -and $isAdmin -eq $true){
        write-host "* Start SSM Service"
        $SSM_Service | Start-Service  | out-null
    }
}
