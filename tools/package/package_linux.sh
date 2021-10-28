#!/bin/bash

CURDIR=$(dirname "$(readlink -f "$0")")
BASEDIR=$(readlink -f "$CURDIR/..")

VERSION=""
COMPILEONLY=0

while [[ $# -gt 0 ]]; do
    key="$1"

    case $key in
    --version)
        VERSION="$2"
        shift # past value
        shift # past value
        ;;
    --compile)
        COMPILEONLY=1
        shift # past value
        ;;
    esac
done

. ${BASEDIR}/tools/variables.sh
. ${BASEDIR}/tools/app_config.txt

echo -en "\nPackaging Linux (Version: \e[34m${VERSION}\e[0m)\n"

if [ ${COMPILEONLY} -eq 0 ]; then

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

    sshargs="PATH+=:/root/n/bin; \
        cd /nodejs/build/SSM; \
        bash ./tools/package/package_linux.sh --version ${VERSION} --compile; \
        exit \$?
    "
    ${SSH_CMD} root@${LINUX_SERVER} "${sshargs}" >/dev/null 2>&1

else
    release_dir="${BASEDIR}/release-builds"
    release_dir_linux="${release_dir}/linux"
    release_dir_win64="${release_dir}/win64"

    rm -rf ${release_dir} 2>&1 >/dev/null

    if [ ! -d "${release_dir}" ]; then
        mkdir -p "${release_dir_linux}"
        mkdir -p "${release_dir_win64}"
    fi
    printDots "* Compiling Linux" 30

    pkg app.js -c package.json -t node16-linux-x64 --out-path ${release_dir_linux} -d >${release_dir_linux}/build.log

    if [ $? -ne 0 ]; then
        echo -en "\e[31m✘\e[0m\n"
        exit 1
    else
        echo -en "\e[32m✔\e[0m\n"
    fi

fi
