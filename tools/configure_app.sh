CURDIR=$(dirname "$(readlink -f "$0")")
BASEDIR=$(readlink -f "$CURDIR/..")

CONFIG_FILE="${CURDIR}/app_config.txt"

if [ ! -f "${CONFIG_FILE}" ]; then
    echo ""

    while true; do
        read -p "There is no config file setup! Want to create one? [Y/n]: " yn
        case $yn in
        [Yy]*)
            break
            ;;
        *) exit ;;
        esac
    done

    read -p "Enter GitHub Token: " gittoken
    echo $gittoken >${CURDIR}/TOKEN.txt

    while true; do
        read -p "Do you want to use a linux build server? [Y/n]: " yn
        case $yn in
        [Yy]*)
            read -p "Enter Linux Build Server Address: " linuxserver
            echo "USE_LINUX_SERVER=\"1\"" >${CONFIG_FILE}
            echo "LINUX_SERVER=\"${linuxserver}\"" >>${CONFIG_FILE}
            break
            ;;
        *)
            echo "USE_LINUX_SERVER=\"0\"" >${CONFIG_FILE}
            echo "LINUX_SERVER=\"\"" >>${CONFIG_FILE}
            break
            ;;
        esac
    done

fi
