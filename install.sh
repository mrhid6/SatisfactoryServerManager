#!/bin/bash

echo "#-----------------------------#"
echo "#      _____ _____ __  __     #"
echo "#     / ____/ ____|  \/  |    #"
echo "#    | (___| (___ | \  / |    #"
echo "#     \___ \\\\___ \| |\/| |    #"
echo "#     ____) |___) | |  | |    #"
echo "#    |_____/_____/|_|  |_|    #"
echo "#-----------------------------#"
echo "# Satisfactory Server Manager #"
echo "#-----------------------------#"

TEMP_DIR=$(mktemp -d /tmp/XXXXX)
INSTALL_DIR="/opt/SSM"

FORCE=0
UPDATE=0

while [[ $# -gt 0 ]]; do
    key="$1"

    case $key in
    --force)
        FORCE=1
        shift # past value
        ;;

    --update)
        UPDATE=1
        shift # past value
        ;;

    esac
done

PLATFORM="$(uname -s)"

if [ ! "${PLATFORM}" == "Linux" ]; then
    echo "Error: Install Script Only Works On Linux Platforms!"
    exit 1
fi

if [ -f /etc/os-release ]; then
    # freedesktop.org and systemd
    . /etc/os-release
    OS=$NAME
    VER=$VERSION_ID
elif type lsb_release >/dev/null 2>&1; then
    # linuxbase.org
    OS=$(lsb_release -si)
    VER=$(lsb_release -sr)
elif [ -f /etc/lsb-release ]; then
    # For some versions of Debian/Ubuntu without lsb_release command
    . /etc/lsb-release
    OS=$DISTRIB_ID
    VER=$DISTRIB_RELEASE
elif [ -f /etc/debian_version ]; then
    # Older Debian/Ubuntu/etc.
    OS=Debian
    VER=$(cat /etc/debian_version)
else
    echo "Error: This version of Linux is not supported for SSM"
    exit 2
fi

if [[ "${OS}" == "Debian" ]] || [[ "${OS}" == "Ubuntu" ]]; then
    apt update -y
    apt install curl wget jq
else
    echo "Error: This version of Linux is not supported for SSM"
    exit 2
fi

curl --silent "https://api.github.com/repos/mrhid6/satisfactoryservermanager/releases/latest" >${TEMP_DIR}/SSM_releases.json
curl --silent "https://api.github.com/repos/mircearoata/SatisfactoryModLauncherCLI/releases/latest" >${TEMP_DIR}/SMLauncherCLI_releases.json

SSM_VER=$(cat ${TEMP_DIR}/SSM_releases.json | jq -r ".tag_name")
SSM_URL=$(cat ${TEMP_DIR}/SSM_releases.json | jq -r ".assets[].browser_download_url" | sort | head -1)

SMLauncher_VER=$(cat ${TEMP_DIR}/SMLauncherCLI_releases.json | jq -r ".tag_name")
SMLauncher_URL=$(cat ${TEMP_DIR}/SMLauncherCLI_releases.json | jq -r ".assets[].browser_download_url" | sort | head -1)

if [ -d "${INSTALL_DIR}" ]; then
    if [[ ${UPDATE} -eq 0 ]] && [[ ${FORCE} -eq 0 ]]; then
        echo "Error: SSM is already installed!"
        exit 1
    else
        SSM_CUR=$(cat ${INSTALL_DIR}/version.txt)
        echo "Updating SSM ${SSM_CUR} to ${SSM_VER} ..."
    fi
else
    echo "Installing SSM ${SSM_VER} ..."
    mkdir -p ${INSTALL_DIR}
fi

rm -r ${INSTALL_DIR}/* 2>&1 >/dev/null

mkdir -p "${INSTALL_DIR}/SMLauncher"

wget -q "${SSM_URL}" -O "${INSTALL_DIR}/SSM.tar.gz"
tar xzfv "${INSTALL_DIR}/SSM.tar.gz" -C "${INSTALL_DIR}"
rm "${INSTALL_DIR}/SSM.tar.gz"
rm "${INSTALL_DIR}/build.log"
echo ${SSM_VER} >"${INSTALL_DIR}/version.txt"

wget -q "${SMLauncher_URL}" -O "${INSTALL_DIR}/SMLauncher/SatisfactoryModLauncherCLI.exe"
echo ${SMLauncher_VER} >"${INSTALL_DIR}/SMLauncher/version.txt"

rm -r ${TEMP_DIR}
