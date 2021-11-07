#!/bin/bash

CURDIR=$(dirname "$(readlink -f "$0")")
BASEDIR=$(readlink -f "$CURDIR/../..")

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

release_dir="${BASEDIR}/release-builds"
release_dir_linux="${release_dir}/linux"

rm -rf ${release_dir_linux} 2>&1 >/dev/null

if [ ! -d "${release_dir_linux}" ]; then
    mkdir -p "${release_dir_linux}"
fi

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

    sshargs="PATH+=:/root/n/bin; \
        cd /nodejs/build/SSM; \
        bash ./tools/package/package_linux.sh --version ${VERSION} --compile; \
        exit \$?
    "
    ${SSH_CMD} root@${LINUX_SERVER} "${sshargs}"

    ${SCP_CMD} root@${LINUX_SERVER}:/nodejs/build/SSM/release-builds/linux/* ${release_dir_linux}/.

else
    release_dir="${BASEDIR}/release-builds"
    release_dir_linux="${release_dir}/linux"

    rm -rf ${release_dir} 2>&1 >/dev/null

    if [ ! -d "${release_dir}" ]; then
        mkdir -p "${release_dir_linux}"
    fi

    printDots "* Copying Linux Executables" 30

    find ${BASEDIR} -name "*.node" | grep -v "release-builds" | grep -v "obj.target" >${release_dir_linux}/exe.list

    while read -r line; do
        cp ${line} ${release_dir_linux}/.
    done <${release_dir_linux}/exe.list
    rm ${release_dir_linux}/exe.list

    printDots "* Compiling Linux" 30

    pkg app.js -c package.json -t node16-linux-x64 --out-path ${release_dir_linux} -d >${release_dir_linux}/build.log

    if [ $? -ne 0 ]; then
        echo -en "\e[31m✘\e[0m\n"
        exit 1
    else
        echo -en "\e[32m✔\e[0m\n"
    fi

fi
