#!/bin/bash

#!/bin/bash

CURDIR=$(dirname "$(readlink -f "$0")")
BASEDIR=$(readlink -f "$CURDIR/../..")

VERSION=""
LINUX=0
WINDOWS=0
FORCE=0

while [[ $# -gt 0 ]]; do
    key="$1"

    case $key in
    --version)
        VERSION="$2"
        shift # past value
        shift # past value
        ;;
    --linux)
        LINUX=1
        shift # past value
        ;;
    --windows)
        WINDOWS=1
        shift # past value
        ;;
    --force)
        FORCE=1
        shift # past value
        ;;

    esac
done

if [[ ! -f "${BASEDIR}/tools/app_config.txt" ]] && [[ $FORCE -eq 0 ]]; then
    echo "No config file was found please run configure_app.sh first"
    exit 1
fi

. ${BASEDIR}/tools/variables.sh
. ${BASEDIR}/tools/app_config.txt

echo -en "\nPackaging Application (Version: \e[34m${VERSION}\e[0m)\n"

release_dir="${BASEDIR}/release-builds"
release_dir_linux="${release_dir}/linux"
release_dir_win64="${release_dir}/win64"

rm -rf ${release_dir} 2>&1 >/dev/null

if [ ! -d "${release_dir}" ]; then
    mkdir -p "${release_dir_linux}"
    mkdir -p "${release_dir_win64}"
fi

cd ${BASEDIR}

#bash ${BASEDIR}/tools/update_SSM_exe.sh --version "${VERSION}"

if [ $? -ne 0 ]; then
    echo "Error: failed to update SSM.exe version numbers"
    exit 1
fi

if [ ! -d "${BASEDIR}/assets" ]; then
    mkdir "${BASEDIR}/assets"
fi

echo -en "Version: ${VERSION}" >"${BASEDIR}/assets/version.txt"

if [ ${LINUX} -eq 1 ]; then
    bash ${CURDIR}/package_linux.sh --version ${VERSION}
fi

if [ ${WINDOWS} -eq 1 ]; then
    printDots "* Copying Win64 Executables" 30

    find ${BASEDIR} -name "*.node" | grep -v "release-builds" >${release_dir_win64}/exe.list

    while read -r line; do
        cp ${line} ${release_dir_win64}/.
    done <${release_dir_win64}/exe.list
    rm ${release_dir_win64}/exe.list

    echo -en "\e[32m✔\e[0m\n"

    printDots "* Compiling Win64" 30
    pkg app.js -c package.json -t node16-win-x64 --out-path ${release_dir_win64} -d >${release_dir_win64}/build.log
    echo -en "\e[32m✔\e[0m\n"
fi

ZipLinuxFileName="${release_dir}/SSM-Linux-x64-${VERSION}.tar.gz"
ZipWin64FileName="${release_dir}/SSM-Win-x64-${VERSION}.zip"

printDots "* Zipping Binaries" 30

cd ${release_dir_linux}
tar cz --exclude='*.log' -f ${ZipLinuxFileName} ./* >/dev/null
cd ${release_dir_win64}
7z a -tzip ${ZipWin64FileName} ./* -xr!build.log >/dev/null
echo -en "\e[32m✔\e[0m\n"

exit 0
