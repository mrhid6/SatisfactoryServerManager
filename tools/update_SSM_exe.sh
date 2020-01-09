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

if [ "${VERSION}" == "" ]; then
    echo "Error: version can't be null!"
    exit 1
fi

if [ $(which -a rcedit | wc -l) -eq 0 ]; then
    echo "Error: Can't find rcedit!"
    exit 1
fi

VERSION_NUM=$(echo $VERSION | sed -e 's/v//g')

PKG_CACHE="${HOME}/.pkg-cache"
PKG_CACHE_VER=$(ls ${PKG_CACHE} | sort | tail -1)

PKG_CACHE_DIR="${PKG_CACHE}/${PKG_CACHE_VER}"

PKG_EXE=$(find ${PKG_CACHE_DIR} -name "*win-x64" | sort | head -1)

rcedit ${PKG_EXE} \
    --set-file-version "${VERSION_NUM}" \
    --set-product-version "${VERSION_NUM}" \
    --set-version-string "CompanyName" "SSM" \
    --set-version-string "ProductName" "SatisfactoryServerManager" \
    --set-version-string "FileDescription" "SatisfactoryServerManager (SSM)" \
    --set-version-string "OriginalFilename" "SatisfactoryServerManager.exe" \
    --set-version-string "InternalName" "SatisfactoryServerManager" \
    --set-version-string "LegalCopyright" "Copyright MrHid6. MIT License" \
    --set-icon "${BASEDIR}/public/images/ssm_logo256.ico"

exit 0
