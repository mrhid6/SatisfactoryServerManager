#!/bin/bash

export DEBIAN_FRONTEND=noninteractive

echo "#-----------------------------#"
echo "#      _____ _____ __  __     #"
echo "#     / ____/ ____|  \/  |    #"
echo "#    | (___| (___ | \  / |    #"
echo "#     \___ \\\\___ \| |\/| |    #"
echo "#     ____) |___) | |  | |    #"
echo "#    |_____/_____/|_|  |_|    #"
echo "#-----------------------------#"
echo "# Satisfactory Server Manager #"
echo "#-----------------------------#"
echo ""
echo "Uninstalling SSM will remove all SSM files and Server instances!"
echo ""
read -p "Are you sure you want to uninstall SSM (y/n)?" choice
case "$choice" in
    y | Y)
        echo "yes"
        ;;
    *)
        exit 0
        ;;
esac

TEMP_DIR=$(mktemp -d /tmp/XXXXX)
INSTALL_DIR="/opt/SSM"
FORCE=0

while [[ $# -gt 0 ]]; do
    key="$1"

    case $key in
    --force | -f)
        FORCE=1
        shift # past value
        ;;
    --installdir)
        INSTALL_DIR=$2
        shift
        shift
        ;;
    *)
        echo "Invalid option must be: [--force, --update, --noservice, --dev, --installdir=<Location>"
        exit 1
        ;;
    esac
done

ENV_SYSTEMD=$(pidof systemd | wc -l)
ENV_SYSTEMCTL=$(which systemctl | wc -l)

if [[ ${ENV_SYSTEMD} -eq 0 ]] && [[ ${ENV_SYSTEMCTL} -eq 0 ]]; then
    echo "Error: Cant install service on this system!"
    exit 3
fi

SSM_SERVICENAME="SSM.service"
SSM_SERVICEFILE="/etc/systemd/system/SSM.service"
SSM_SERVICE=$(
    systemctl list-units --full -all | grep -Fq "${SSM_SERVICENAME}"
    echo $?
)

if [ ${SSM_SERVICE} -eq 0 ]; then
    echo "* Stopping SSM Service"
    systemctl stop ${SSM_SERVICENAME}
fi

if [ ${SSM_SERVICE} -eq 0 ]; then
    echo "* Removing SSM Service"
    systemctl disable ${SSM_SERVICENAME} >/dev/null 2>&1
    rm -r "${SSM_SERVICEFILE}" >/dev/null 2>&1
    systemctl daemon-reload >/dev/null 2>&1
fi

echo "* Removing Install Directory ${INSTALL_DIR}"

rm -r ${INSTALL_DIR} >/dev/null 2>&1

echo "* Removing SSM user"
deluser --remove-home ssm >/dev/null 2>&1
delgroup ssm >/dev/null 2>&1
rm -r "/home/ssm" >/dev/null 2>&1

echo "* Removing Docker Containers"
docker rm -f $(docker ps -a --filter="name=SSMAgent" -q) >/dev/null 2>&1

echo "* Removing Docker Containers Directory /SSMAgents"
rm -r /SSMAgents >/dev/null 2>&1

echo "Successfully Uninstalled SSM!"
exit 0
