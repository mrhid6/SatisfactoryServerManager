#!/bin/bash

VERSION=$(cat package.json | grep version | awk '{print $2}' | sed -e 's/"//g' | sed -e 's/,//g')

release_dir="${BASEDIR}/release-builds"
release_dir_win64="${release_dir}/win64"
release_dir_linux="${release_dir}/linux"

ZipWin64FileName="${release_dir}/SSM-Win-x64-${VERSION}.zip"
ZipLinuxFileName="${release_dir}/SSM-Linux-x64-${VERSION}.tar.gz"


PACKAGE_REGISTRY_URL="${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/packages/generic/ssm/${VERSION}"

curl --header "JOB-TOKEN: ${CI_JOB_TOKEN}" --upload-file ${ZipWin64FileName} ${PACKAGE_REGISTRY_URL}/${ZipWin64FileName}
curl --header "JOB-TOKEN: ${CI_JOB_TOKEN}" --upload-file ${ZipLinuxFileName} ${PACKAGE_REGISTRY_URL}/${ZipLinuxFileName}

release-cli create --name "Release $VERSION" --tag-name $VERSION \
        --assets-link "{\"name\":\"${ZipWin64FileName}\",\"url\":\"${PACKAGE_REGISTRY_URL}/${ZipWin64FileName}\"}" \
        --assets-link "{\"name\":\"${ZipLinuxFileName}\",\"url\":\"${PACKAGE_REGISTRY_URL}/${ZipLinuxFileName}\"}"
