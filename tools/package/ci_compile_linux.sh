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

echo -en "\nPackaging Linux (Version: \e[34m${VERSION}\e[0m)\n"

release_dir="${BASEDIR}/release-builds"
release_dir_linux="${release_dir}/linux"

rm -rf ${release_dir_linux}\* 2>&1 >/dev/null

if [ ! -d "${release_dir_linux}" ]; then
    mkdir -p "${release_dir_linux}"
fi

cd ${BASEDIR}

if [ ! -d "${BASEDIR}/assets" ]; then
    mkdir "${BASEDIR}/assets"
fi

echo -en "Version: ${VERSION}" >"${BASEDIR}/assets/version.txt"

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

ZipLinuxFileName="${release_dir}/SSM-Linux-x64-${VERSION}.tar.gz"

cd ${release_dir_linux}
tar cz --exclude='*.log' -f ${ZipLinuxFileName} ./* >/dev/null
