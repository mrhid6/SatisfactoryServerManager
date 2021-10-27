#!/bin/bash
CURDIR=$(dirname "$(readlink -f "$0")")
BASEDIR=$(readlink -f "$CURDIR/..")

. ${BASEDIR}/tools/variables.sh

cd ${BASEDIR}

#bash ${CURDIR}/build_app.sh -i -u

release-it --ci -VV
