# SatisfactoryServerManager

## Introduction
Satisfactory Server Manager (SSM) is a webpage designed to manage and control you satisfactory dedicated server.

As a **note** this project has been tested with the Experimental Satisfactory dedicated servers. SSM is subject to change.

## Tests & Approvals:

SSM Has been tested and approved on Windows 10 Pro, Windows Server 2019 and Ubuntu 20.04.
When installing on Windows 10/11 you **MUST** have the Pro edition installed.
It is advised that SSM is installed on one of these operating systems.

If you are running on a Windows 10/11 workstation make sure you have enabled Virtualisation in the BIOS.

## How To Install / Update:
**Debian / Ubuntu:**

Install: `wget -q https://git.io/Je7rx -O - | bash` <br/>
Update: `wget -q https://git.io/Je7rx -O - | bash /dev/stdin "--update"`

**Windows:**

Open a PowerShell window as administrator and run the following commands:

Download Install Script: `Invoke-WebRequest https://git.io/JedBC -Out install.ps1`<br/>
Install: `.\install.ps1`<br/>
Update: `.\install.ps1 -update $true`


## Configure:
Configuration of SSM can be done in the settings page or by editing the Json file.

**Linux:**
```
    vi /home/ssm/.SatisfactoryServerManager/SSM.json
```

**Windows:**
```
    Edit C:\ProgramData\SatisfactoryServerManager\SSM.json
```

## Development:

* Install nodejs (tested on v12.13.1)
* Install Docker Desktop
* Git clone this repo
* Fetch git submodule `git submodule update --init`
* Install Dependencies:
```
bash ./tools/build_app.sh -i -u
```
* Run `yarn start` to start the webpage
    * Open up http://localhost:3000
    * Login with the following credientals: 
    ```
        User Name: admin
        Password: ssm
    ```

* Run `yarn watch` to bundle client js files
* Run `bash ./tools/clean-css.sh` to minify css files
