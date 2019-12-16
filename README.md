# SatisfactoryServerManager

## Introduction
Satisfactory Server Manager (SSM) is a webpage designed to manage and control you satisfactory dedicated server.

## How To Install:
**Debian / Ubuntu:**

`wget -q https://raw.githubusercontent.com/mrhid6/SatisfactoryServerManager/master/install.sh -O - | bash`


## Configure:
**Linux:**
```
    vi /opt/SSM/SSM.json
```

**Windows:**
```
    Edit C:\ProgramData\SatisfactoryServerManager\SSM.json
```
## Development:

* Install nodejs
* Git clone this repo
* Fetch git submodule `git submodule update --init`
* Run `npm install`
* Run `npm start` to start the webpage
* Run `npm run watch` to bundle client js files
* Run `bash ./tools/clean-css.sh` to minify css files
