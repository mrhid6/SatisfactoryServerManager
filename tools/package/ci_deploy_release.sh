#!/bin/bash

VERSION=$(cat package.json | grep version | awk '{print $2}' | sed -e 's/"//g' | sed -e 's/,//g')

CURDIR=$(dirname "$(readlink -f "$0")")
BASEDIR=$(readlink -f "$CURDIR/../..")

release_dir="${BASEDIR}/release-builds"
release_dir_win64="${release_dir}/win64"
release_dir_linux="${release_dir}/linux"

ZipWin64FileName="SSM-Win-x64-${VERSION}.zip"
ZipWin64FilePath="${release_dir}/${ZipWin64FileName}"

ZipLinuxFileName="SSM-Linux-x64-${VERSION}.tar.gz"
ZipLinuxFilePath="${release_dir}/${ZipLinuxFileName}"


PACKAGE_REGISTRY_URL="https://git.hostxtra.co.uk/api/v4/projects/${CI_PROJECT_ID}/packages/generic/ssm/${VERSION}"

echo "$PACKAGE_REGISTRY_URL"

curl --header "JOB-TOKEN: ${CI_JOB_TOKEN}" --upload-file ${ZipWin64FilePath} ${PACKAGE_REGISTRY_URL}/${ZipWin64FileName}
curl --header "JOB-TOKEN: ${CI_JOB_TOKEN}" --upload-file ${ZipLinuxFilePath} ${PACKAGE_REGISTRY_URL}/${ZipLinuxFileName}

release-cli create --name "Release $VERSION" --tag-name $VERSION \
        --assets-link "{\"name\":\"${ZipWin64FileName}\",\"url\":\"${PACKAGE_REGISTRY_URL}/${ZipWin64FileName}\"}" \
        --assets-link "{\"name\":\"${ZipLinuxFileName}\",\"url\":\"${PACKAGE_REGISTRY_URL}/${ZipLinuxFileName}\"}"
