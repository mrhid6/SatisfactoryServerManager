#!/bin/bash

CURDIR=$(dirname "$(readlink -f "$0")")
BASEDIR=$(readlink -f "$CURDIR/..")

if [ ! -f "${BASEDIR}/tools/app_config.txt" ]; then
    echo "No config file was found please run configure_app.sh first"
    exit 1
fi

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

echo -en "\nCompiling Application (Version: \e[34m${VERSION}\e[0m)\n"

if [ ! -d "${BASEDIR}/build" ]; then
    mkdir -p "${BASEDIR}/build"
fi

rm -rf ${BASEDIR}/release-builds 2>&1 >/dev/null

if [ ! -d "${BASEDIR}/release-builds" ]; then
    mkdir -p "${BASEDIR}/release-builds/linux"
    mkdir -p "${BASEDIR}/release-builds/win64"
fi

version=$1

release_dir="${BASEDIR}/release-builds"

release_dir_linux="${release_dir}/linux"
release_dir_win64="${release_dir}/win64"

cd ${BASEDIR}

bash ${BASEDIR}/tools/update_SSM_exe.sh --version "${VERSION}"

if [ $? -ne 0 ]; then
    echo "Error: failed to update SSM.exe version numbers"
    exit 1
fi

echo -en "Version: ${VERSION}" >"${BASEDIR}/assets/version.txt"

if [ "${USE_LINUX_SERVER}" == "1" ]; then
    echo "* Building Linux Executables: "

    printDots "* Cleaning Build Folder" 30
    sshargs="mkdir -p /nodejs/build >/dev/null 2>&1; \
        cd /nodejs/build; \
        rm -r SSM; >/dev/null 2>&1\
    "

    ${SSH_CMD} root@${LINUX_SERVER} "${sshargs}" >/dev/null 2>&1
    echo -en "\e[32m✔\e[0m\n"

    printDots "* Cloning SSM Repo" 30
    sshargs="cd /nodejs/build; \
        git clone https://github.com/mrhid6/SatisfactoryServerManager.git SSM; \
        exit \$?
    "
    ${SSH_CMD} root@${LINUX_SERVER} "${sshargs}" >/dev/null 2>&1
    if [ $? -ne 0 ]; then
        echo -en "\e[31m✘\e[0m\n"
        exit 1
    else
        echo -en "\e[32m✔\e[0m\n"
    fi

    printDots "* Building App" 30
    sshargs="PATH+=:/root/n/bin; \
        cd /nodejs/build/SSM; \
        bash ./tools/build_app.sh -i -u; \
        exit \$?
    "
    ${SSH_CMD} root@${LINUX_SERVER} "${sshargs}" >/dev/null 2>&1

    if [ $? -ne 0 ]; then
        echo -en "\e[31m✘\e[0m\n"
        exit 1
    else
        echo -en "\e[32m✔\e[0m\n"
    fi

    sshargs="cd /nodejs/build/SSM; \
        find /nodejs/build/SSM -name \"*.node\" | grep -v \"obj\"
    "

    printDots "* Copying Executables" 30
    ${SSH_CMD} root@${LINUX_SERVER} "${sshargs}" >${release_dir_linux}/exe.list
    while read -r line; do
        ${SCP_CMD} root@${LINUX_SERVER}:${line} ${release_dir_linux}/.
    done <${release_dir_linux}/exe.list

    rm ${release_dir_linux}/exe.list
    echo -en "\e[32m✔\e[0m\n"
fi

printDots "* Copying Win64 Executables" 30

find ${BASEDIR} -name "*.node" | grep -v "release-builds" >${release_dir_win64}/exe.list

while read -r line; do
    cp ${line} ${release_dir_win64}/.
done <${release_dir_win64}/exe.list
rm ${release_dir_win64}/exe.list

echo -en "\e[32m✔\e[0m\n"

printDots "* Compiling Linux" 30
pkg app.js -c package.json -t node12-linux-x64 --out-path ${release_dir_linux} -d >${release_dir_linux}/build.log
echo -en "\e[32m✔\e[0m\n"

printDots "* Compiling Win64" 30
pkg app.js -c package.json -t node12-win-x64 --out-path ${release_dir_win64} -d >${release_dir_win64}/build.log
echo -en "\e[32m✔\e[0m\n"

ZipLinuxFileName="${release_dir}/SSM-Linux-x64-${VERSION}.tar.gz"
ZipWin64FileName="${release_dir}/SSM-Win-x64-${VERSION}.zip"

printDots "* Zipping Binaries" 30

cd ${release_dir_linux}
tar cz --exclude='*.log' -f ${ZipLinuxFileName} ./* >/dev/null
cd ${release_dir_win64}
7z a -tzip ${ZipWin64FileName} ./* -xr!build.log >/dev/null
echo -en "\e[32m✔\e[0m\n"

exit 0
