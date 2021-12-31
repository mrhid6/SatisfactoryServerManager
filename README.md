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

## Nginx Reverse Proxy Config
```
upstream ssm {
    server <SSM IP>:3000;
}

server {
    root /var/www/html;
    index index.html index.htm index.nginx-debian.html;
    server_name <WEBSITE HOSTNAME>;

    location / {
        proxy_pass http://ssm/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Fowarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Fowarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    add_header Strict-Transport-Security "max-age=31536000" always; # managed by Certbot


    listen 80;

}
```
## Troubleshooting:

**Getting a EACCES on http://0.0.0.0:3000 on Windows?**

First open powershell as a admin and check to see if windows has allocated the port using the following command:
```
netsh interface ipv4 show excludedportrange protocol=tcp
```

You will get a response simular to the one below:
```
Start Port    End Port
----------    --------
      1587        1686
      1787        1886
      1987        2086
      2931        3030
     50000       50059     *
```


As you can see the 2nd to last record windows has allocated ports 2931-3030 for something this conflicts with SSM default port of 3000

To fix this run the following commands:
```
net stop winnat
netsh int ipv4 set dynamic tcp start=49152 num=16384
netsh int ipv6 set dynamic tcp start=49152 num=16384
net start winnat
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
