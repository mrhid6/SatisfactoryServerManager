#!/bin/bash

CURDIR=$(dirname "$(readlink -f "$0")")
BASEDIR=$(readlink -f "$CURDIR/..")

. ${BASEDIR}/tools/variables.sh

if [ ! -f "${BASEDIR}/release-builds/linux/SatisfactoryServerManager" ]; then
    echo "Error: SSM Linux didn't compile correctly!"
    exit 1
fi

if [ ! -f "${BASEDIR}/release-builds/win64/SatisfactoryServerManager.exe" ]; then
    echo "Error: SSM Win64 didn't compile correctly!"
    exit 1
fi

chmod +x "${BASEDIR}/release-builds/win64/SatisfactoryServerManager.exe"

${BASEDIR}/release-builds/win64/SatisfactoryServerManager.exe >/dev/null 2>&1 &
SSM_PID=$!

while true; do
    read -p "Did SSM Start successfully? [Y/n]: " yn
    case $yn in
    [Yy]*)
        break
        ;;
    *)
        kill $SSM_PID
        echo "Error: SSM didn't start!"
        exit 1
        ;;
    esac
done

while true; do
    read -p "Login System Is working? [Y/n]: " yn
    case $yn in
    [Yy]*)
        break
        ;;
    *)
        kill $SSM_PID
        echo "Error: Cant login to SSM !"
        exit 1
        ;;
    esac
done

while true; do
    read -p "Is the SSM version correct? [Y/n]: " yn
    case $yn in
    [Yy]*)
        break
        ;;
    *)
        kill $SSM_PID
        echo "Error: SSM version is not set correctly in server_config.js!"
        exit 1
        ;;
    esac
done

while true; do
    read -p "Mods List populated? [Y/n]: " yn
    case $yn in
    [Yy]*)
        break
        ;;
    *)
        kill $SSM_PID
        echo "Error: Debug Mods List!"
        exit 1
        ;;
    esac
done

while true; do
    read -p "Is there any console errors? [Y/n]: " yn
    case $yn in
    [Yy]*)
        kill $SSM_PID
        echo "Error: There are console errors fix these first!"
        exit 1
        ;;
    *)
        break
        ;;
    esac
done

kill $SSM_PID

exit 0
