#!/bin/bash

CURDIR=$(dirname "$(readlink -f "$0")")
BASEDIR=$(readlink -f "$CURDIR/..")

. ${BASEDIR}/tools/variables.sh
. ${BASEDIR}/tools/app_config.txt

VERSION=""

while [[ $# -gt 0 ]]; do
    key="$1"

    case $key in
    --version)
        VERSION="$2"
        shift # past value
        shift # past value
        ;;

    esac
done

release_dir="${BASEDIR}/release-builds"

release_dir_linux="${release_dir}/linux"
release_dir_win64="${release_dir}/win64"

if [ ! -f "${release_dir_linux}/SatisfactoryServerManager" ]; then
    echo "Error: Linux Executable not created!"
    exit 1
fi

if [ ! -f "${release_dir_win64}/SatisfactoryServerManager.exe" ]; then
    echo "Error: Windows Executable not created!"
    exit 1
fi

ZipLinuxFileName="${release_dir}/SSM-Linux-x64-${VERSION}.tar.gz"
ZipWin64FileName="${release_dir}/SSM-Win-x64-${VERSION}.zip"

if [ ! -f "${ZipLinuxFileName}" ]; then
    echo "Error: Linux Tar not created!"
    exit 1
fi

if [ ! -f "${ZipWin64FileName}" ]; then
    echo "Error: Windows Zip not created!"
    exit 1
fi

exit 0
