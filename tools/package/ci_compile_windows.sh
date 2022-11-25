#!/bin/bash

function printDots() {
    text=$1
    length=$2
    textlen=${#text}

    newlength=$((length - textlen - 1))

    v=$(printf "%-${newlength}s" ".")
    echo -en "${text} ${v// /.} "
}

CURDIR=$(dirname "$(readlink -f "$0")")
BASEDIR=$(readlink -f "$CURDIR/../..")

VERSION=$(cat package.json | grep version | awk '{print $2}' | sed -e 's/"//g' | sed -e 's/,//g')
FORCE=0

while [[ $# -gt 0 ]]; do
    key="$1"

    case $key in
    --version)
        VERSION="$2"
        shift # past value
        shift # past value
        ;;
    --force)
        FORCE=1
        shift # past value
        ;;

    esac
done

echo -en "\nPackaging Application (Version: \e[34m${VERSION}\e[0m)\n"

release_dir="${BASEDIR}/release-builds"
release_dir_win64="${release_dir}/win64"

rm -rf ${release_dir_win64}\* 2>&1 >/dev/null

if [ ! -d "${release_dir_win64}" ]; then
    mkdir -p "${release_dir_win64}"
fi

cd ${BASEDIR}

if [ ! -d "${BASEDIR}/assets" ]; then
    mkdir "${BASEDIR}/assets"
fi

echo -en "Version: ${VERSION}" >"${BASEDIR}/assets/version.txt"

yarn install

printDots "* Copying Win64 Executables" 30

find ${BASEDIR} -name "*.node" | grep -v "release-builds" >${release_dir_win64}/exe.list

while read -r line; do
    cp ${line} ${release_dir_win64}/.
done <${release_dir_win64}/exe.list
rm ${release_dir_win64}/exe.list

echo -en "\e[32m✔\e[0m\n"

printDots "* Compiling Win64" 30
pkg app.js -c package.json -t node18-win-x64 --out-path ${release_dir_win64} -d >${release_dir_win64}/build.log
echo -en "\e[32m✔\e[0m\n"

ZipWin64FileName="${release_dir}/SSM-Win-x64-${VERSION}.zip"

cd ${release_dir_win64}
/c/BuildScripts/7z.exe a -tzip ${ZipWin64FileName} ./* -xr!build.log >/dev/null
echo -en "\e[32m✔\e[0m\n"
