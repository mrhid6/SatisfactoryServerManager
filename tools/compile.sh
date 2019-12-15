#!/bin/bash

CURDIR=$(dirname "$(readlink -f "$0")")
BASEDIR=$(readlink -f "$CURDIR/..")

. ${BASEDIR}/tools/variables.sh

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

echo -en "\nCompiling Application (Version: \e[34m${VERSION}\e[0m)\n"

if [ ! -d "${BASEDIR}/build" ]; then
    mkdir -p "${BASEDIR}/build"
fi

rm -rf ${BASEDIR}/release-builds 2>&1 >/dev/null

if [ ! -d "${BASEDIR}/release-builds" ]; then
    mkdir -p "${BASEDIR}/release-builds/linux"
    mkdir -p "${BASEDIR}/release-builds/win32"
    mkdir -p "${BASEDIR}/release-builds/win64"
    mkdir -p "${BASEDIR}/release-builds/mac"
fi

version=$1

release_dir="${BASEDIR}/release-builds"

release_dir_mac="${release_dir}/mac"
release_dir_linux="${release_dir}/linux"
release_dir_win32="${release_dir}/win32"
release_dir_win64="${release_dir}/win64"

cd ${BASEDIR}

echo -en "Version: ${VERSION}" >"${BASEDIR}/assets/version.txt"

printDots "* Compiling Mac" 30
pkg app.js -c package.json -t node12-mac-x64 --out-path ${release_dir_mac} -d >${release_dir_mac}/build.log
echo -en "\e[32m✔\e[0m\n"

printDots "* Compiling Linux" 30
pkg app.js -c package.json -t node12-linux-x64 --out-path ${release_dir_linux} -d >${release_dir_linux}/build.log
echo -en "\e[32m✔\e[0m\n"

printDots "* Compiling Win32" 30
pkg app.js -c package.json -t node12-win-x86 --out-path ${release_dir_win32} -d >${release_dir_win32}/build.log
echo -en "\e[32m✔\e[0m\n"

printDots "* Compiling Win64" 30
pkg app.js -c package.json -t node12-win-x64 --out-path ${release_dir_win64} -d >${release_dir_win64}/build.log
echo -en "\e[32m✔\e[0m\n"

ZipMacFileName="${release_dir}/SSM-Mac-x64-${VERSION}.tar.gz"
ZipLinuxFileName="${release_dir}/SSM-Linux-x64-${VERSION}.tar.gz"
ZipWin32FileName="${release_dir}/SSM-Win-x86-${VERSION}.zip"
ZipWin64FileName="${release_dir}/SSM-Win-x64-${VERSION}.zip"

printDots "* Zipping Binaries" 30

cd ${release_dir_mac}
tar czf ${ZipMacFileName} ./* >/dev/null
cd ${release_dir_linux}
tar czf ${ZipLinuxFileName} ./* >/dev/null
cd ${release_dir_win32}
7z a -tzip ${ZipWin32FileName} ./* -xr!build.log >/dev/null
cd ${release_dir_win64}
7z a -tzip ${ZipWin64FileName} ./* -xr!build.log >/dev/null
echo -en "\e[32m✔\e[0m\n"
