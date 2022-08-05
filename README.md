# SatisfactoryServerManager

## Introduction
Satisfactory Server Manager (SSM) is a webpage designed to manage and control multiple satisfactory dedicated server instances.

As a **note** this project has been tested with the Early Access Satisfactory dedicated servers. SSM is subject to change.

## Tests & Approvals:

SSM Has been tested and approved on Windows 10 Pro, Windows Server 2019 and Ubuntu 20.04.

When installing on Windows 10/11 you **MUST** have the Pro edition installed.

It is advised that SSM is installed on one of these operating systems.

If you are running on a Windows 10/11 workstation make sure you have enabled Virtualisation in the BIOS.

## Recommendations:
During our testing we have found that running more than 4 server instances can be detrimental to dedicated server gameplay.

We Recommend not installing SSM in a docker/container but rather on the Host or in a VM.

## How To Install / Update:
**Debian / Ubuntu:**

Install: `wget -q https://git.io/Je7rx -O - | bash` <br/>
Update: `wget -q https://git.io/Je7rx -O - | bash /dev/stdin "--update"`

**Windows:**

Open a PowerShell window as administrator and run the following commands:

Download Install Script: `Invoke-WebRequest https://git.io/JedBC -Out install.ps1`<br/>
Install: `.\install.ps1`<br/>
Update: `.\install.ps1 -update $true`


## Development:

* Install nodejs (tested on v12.13.1)
* Install Docker Desktop
* Git clone this repo
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
