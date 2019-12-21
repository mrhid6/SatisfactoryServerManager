# SatisfactoryServerManager

## Introduction
Satisfactory Server Manager (SSM) is a webpage designed to manage and control you satisfactory dedicated server.

As a **note** this project has not ben tested with the Satisfactory dedicated server software. SSM is subject to change.

## How To Install / Update:
**Debian / Ubuntu:**

Install: `wget -q https://git.io/Je7rx -O - | bash` <br/>
Update: `wget -q https://git.io/Je7rx -O - | bash /dev/stdin "--update"`

**Windows**

Open a PowerShell window as administrator and run the following commands:
```
Invoke-WebRequest https://git.io/JedBC -Out install.ps1
.\install.ps1

```

## Configure:
Configuration of SSM can be done in the settings page or by editing the Json file.

**Linux:**
```
    vi /opt/SSM/SSM.json
```

**Windows:**
```
    Edit C:\ProgramData\SatisfactoryServerManager\SSM.json
```

## Development:

* Install nodejs (tested on v12.13.1)
* Git clone this repo
* Fetch git submodule `git submodule update --init`
* Install Dependencies:
```
npm-workspace install
npm install
npm rebuild
```
* Run `npm start` to start the webpage
    * Open up http://localhost:3000
    * Login with the following credientals: 
    ```
        User Name: admin
        Password: ssm
    ```

* Run `npm run watch` to bundle client js files
* Run `bash ./tools/clean-css.sh` to minify css files
