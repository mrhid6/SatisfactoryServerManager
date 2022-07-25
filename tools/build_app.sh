CURDIR=$(dirname "$(readlink -f "$0")")
BASEDIR=$(readlink -f "$CURDIR/..")

INSTALL=0
UPDATE=0
while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
    -i | --install)
        INSTALL=1
        shift # past value
        ;;
    -u | --update)
        UPDATE=1
        shift # past value
        ;;

    esac
done

if [ -f /etc/os-release ]; then
    # freedesktop.org and systemd
    . /etc/os-release
    OS=$NAME
    VER=$VERSION_ID
elif type lsb_release >/dev/null 2>&1; then
    # linuxbase.org
    OS=$(lsb_release -si)
    VER=$(lsb_release -sr)
elif [ -f /etc/lsb-release ]; then
    # For some versions of Debian/Ubuntu without lsb_release command
    . /etc/lsb-release
    OS=$DISTRIB_ID
    VER=$DISTRIB_RELEASE
elif [ -f /etc/debian_version ]; then
    # Older Debian/Ubuntu/etc.
    OS=Debian
    VER=$(cat /etc/debian_version)
fi

cd ${BASEDIR}
error=0
if [[ "${OS}" == "Debian" ]] || [[ "${OS}" == "Ubuntu" ]]; then
    if [ $(which -a n | wc -l) -eq 0 ]; then
        if [ $INSTALL -eq 1 ]; then
            curl -L https://git.io/n-install | bash -s -- -y -q
        else
            echo "Error: N needs to be installed!"
            error=1
        fi
    fi
fi

if [ $(which -a npm | wc -l) -eq 0 ]; then
    echo "Error: NPM needs to be installed!"
    error=1
fi

if [ $(which -a pkg | wc -l) -eq 0 ]; then
    if [ $INSTALL -eq 1 ]; then
        npm i -g pkg
    else
        echo "Error: PKG needs to be installed!"
        error=1
    fi
fi

if [ $(which -a release-it | wc -l) -eq 0 ]; then
    if [ $INSTALL -eq 1 ]; then
        npm i -g release-it
    else
        echo "Error: RELEASE-IT needs to be installed!"
        error=1
    fi
fi

if [ $(which -a yarn | wc -l) -eq 0 ]; then
    if [ $INSTALL -eq 1 ]; then
        npm i -g yarn
    else
        echo "Error: YARN needs to be installed!"
        error=1
    fi
fi

if [ $(which -a browserify | wc -l) -eq 0 ]; then
    if [ $INSTALL -eq 1 ]; then
        npm i -g browserify uglifyify
    else
        echo "Error: browserify needs to be installed!"
        error=1
    fi
fi

if [ $error -eq 1 ]; then
    exit 1
fi

if [ $UPDATE -eq 1 ]; then
    npm i -g pkg release-it yarn browserify uglifyify
fi

if [[ "${OS}" == "Ubuntu" ]] && [[ "${VER}" != "19.10" ]]; then
    check_lib=$(strings /usr/lib/x86_64-linux-gnu/libstdc++.so.6 | grep GLIBCXX_3.4.26 | wc -l)

    if [ $check_lib -eq 0 ]; then
        add-apt-repository ppa:ubuntu-toolchain-r/test -y >/dev/null 2>&1
        apt-get -qq update -y
        apt-get -qq upgrade -y
    fi

    check_lib=$(strings /usr/lib/x86_64-linux-gnu/libstdc++.so.6 | grep GLIBCXX_3.4.26 | wc -l)

    if [ $check_lib -eq 0 ]; then
        echo "Error: Couldn't install required libraries"
        exit 1
    fi
fi

yarn
resCode = $?

yarn clean-css
yarn bundle

exit $resCode
