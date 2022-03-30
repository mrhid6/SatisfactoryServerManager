
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

$osInfo = Get-CimInstance -ClassName Win32_OperatingSystem
$isWorkstation = ($osInfo.ProductType -eq 1);

write-host $isWorkstation

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
sleep -m 1000

if($SSM_Service -ne $null -and $isAdmin -eq $true){
	write-host "Stopping SSM Service"
    & "$($installDir)\nssm.exe" "stop" "SSM" "confirm"

    sleep -m 2000
}

if($nodocker -eq $false){
    write-host "* Installing Docker"

    if($isWorkstation -eq $false){
        Install-PackageProvider -Name NuGet -MinimumVersion 2.8.5.201 -Force|out-null
        Enable-WindowsOptionalFeature –Online -FeatureName Microsoft-Hyper-V –All -NoRestart |out-null
        Install-WindowsFeature RSAT-Hyper-V-Tools -IncludeAllSubFeature -Confirm:$false |out-null
        Uninstall-Package -Name docker -ProviderName DockerMSFTProvider -Confirm:$false |out-null
        $VM = Get-VM WinContainerHost -ErrorAction SilentlyContinue;
        if($VM){
            $VM | Set-VMProcessor -ExposeVirtualizationExtensions $true |out-null
        }
        Install-Module DockerProvider -Confirm:$false -force |out-null
        Install-Package Docker -ProviderName DockerProvider -RequiredVersion preview -Confirm:$false -force |out-null
        [Environment]::SetEnvironmentVariable(“LCOW_SUPPORTED”, “1”, “Machine”)
        Restart-Service docker
    }else{

        if($osInfo.BuildNumber -gt 19041){
            $Installed = Test-Path("HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\Docker Desktop")
	    
            if($Installed -and $update){
                $InstalledDockerVersion = (Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\Docker Desktop" -ErrorAction SilentlyContinue).DisplayVersion

                $DockerVersionFile = Join-Path $Env:Temp OnlineDockerVersion.xml
                Invoke-WebRequest "https://desktop.docker.com/win/main/amd64/appcast.xml" -OutFile $DockerVersionFile

                $versionInfo = (Select-Xml -Path $DockerVersionFile -XPath "rss/channel/item/title")
                $OnlineVersion = (($versionInfo[$versionInfo.Count -1]).Node.InnerText).Split(" ")[0];

                if($InstalledDockerVersion -ne $OnlineVersion){

                    dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
                    dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart

                    $WSLInstaller = Join-Path $Env:Temp "WSL2.0.msi"
                    Invoke-WebRequest "https://wslstorestorage.blob.core.windows.net/wslblob/wsl_update_x64.msi" -OutFile $WSLInstaller
                    msiexec.exe /I $WSLInstaller /quiet
                    wsl --set-default-version 2

                    sleep -m 3000

                    del $WSLInstaller
        
                    $DockerInstaller = Join-Path $Env:Temp InstallDocker.msi
                    Invoke-WebRequest "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe" -OutFile $DockerInstaller

                    cmd /c start /wait $DockerInstaller install --quiet

                    sleep -m 3000
                    del $DockerInstaller
		    
		    sleep -m 2000
		    
		    $dockerSettingPath = "C:\Users\$($env:UserName)\AppData\Roaming\Docker\settings.json"
	    	    $settingsContent = Get-Content $dockerSettingPath -Raw | ConvertFrom-Json
	    	    $settingsContent.exposeDockerAPIOnTCP2375 = $true
	    	    $settingsContent | ConvertTo-Json | Set-Content $dockerSettingPath
                }
            }
        }else{
            write-Error "Cant Install docker on this machine! Must be Windows 10 20H2 and Build Number 19041 or higher!"
            exit;
        }
    }
    write-host "* Docker Installed"
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
	
	Invoke-WebRequest "https://nssm.cc/ci/nssm-2.24-101-g897c7ad.zip" -Out "$($installDir)\nssm.zip" -UseBasicParsing
	Expand-Archive "$($installDir)\nssm.zip" -DestinationPath "$($installDir)" -Force
	
	Move-item -Path "$($installDir)\nssm-2.24-101-g897c7ad\win64\nssm.exe" -Destination "$($installDir)\nssm.exe" -force
	Remove-Item -Path "$($installDir)\nssm-2.24-101-g897c7ad" -Recurse
	Remove-Item -Path "$($installDir)\nssm.zip"
	
	if($SSM_Service -ne $null){
		write-host "* Removing Old SSM Service"
		& "$($installDir)\nssm.exe" "remove" "SSM" "confirm" | out-null
        sleep -m 2000
	}
	
	write-host "* Create SSM Service"
	& "$($installDir)\nssm.exe" "install" "SSM" "$($installDir)\SatisfactoryServerManager.exe" | out-null
    & "$($installDir)\nssm.exe" "set" "SSM" "AppDirectory" "$($installDir)" | out-null
    & "$($installDir)\nssm.exe" "set" "SSM" "DisplayName" "SatisfactoryServerManager" | out-null
    & "$($installDir)\nssm.exe" "set" "SSM" "Description" "Service for SatisfactoryServerManager" | out-null

    $SSM_Service = Get-Service -Name "SSM" -ErrorAction SilentlyContinue

    sleep -m 1500
	write-host "* Start SSM Service"
	& "$($installDir)\nssm.exe" "start" "SSM"
}else{
    write-host "SSM Service Skipped"
    $SSM_Service = Get-Service -Name "SSM" -ErrorAction SilentlyContinue
    if($SSM_Service -ne $null -and $isAdmin -eq $true){
        write-host "* Start SSM Service"
        $SSM_Service | Start-Service  | out-null
    }
}
