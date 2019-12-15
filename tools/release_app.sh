#!/bin/bash
CURDIR=$(dirname "$(readlink -f "$0")")
BASEDIR=$(readlink -f "$CURDIR/..")

. ${BASEDIR}/_scripts/variables.sh

cd ${BASEDIR}

bash ${CURDIR}/build_app.sh -i -u

release-it -n

PROD_AGENT_DIR="/nodejs/development/SystemStatus_Web/agent_releases"

${SSH_CMD} root@www.hostxtra.co.uk "cd ${PROD_AGENT_DIR}; mv *.tar.gz *.zip ./archive/. >/dev/null 2>&1"

${SCP_CMD} ${BASEDIR}/release-builds/*.tar.gz ${BASEDIR}/release-builds/*.zip root@www.hostxtra.co.uk:${PROD_AGENT_DIR}/.
