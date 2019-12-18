# SatisfactoryServerManager

## Introduction
Satisfactory Server Manager (SSM) is a webpage designed to manage and control you satisfactory dedicated server.

As a **note** this project has not ben tested with the Satisfactory dedicated server software. SSM is subject to change.

## How To Install:
**Debian / Ubuntu:**

`wget -q https://git.io/Je7rx -O - | bash`


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
