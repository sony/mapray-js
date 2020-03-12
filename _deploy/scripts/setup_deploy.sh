#!/bin/bash
set -eu

usage_exit() {
        echo "Usage: $0 [-t {mapray | ui} ] [-a {dev | staging | production}] " 1>&2
        exit 1
}

_TARGET="null"
_APP_ID="null"

while getopts :t:a: OPT
do
    case $OPT in
        t)  _TARGET=$OPTARG
            ;;
        a)  _APP_ID=$OPTARG
            ;;
        h)  usage_exit
            ;;
        :|\?) usage_exit
            ;;
    esac
done

shift $((OPTIND - 1))

[ "${_TARGET}" != "mapray" ] && [ "${_TARGET}" != "ui" ] && usage_exit
[ "${_APP_ID}" != "dev" ] && [ "${_APP_ID}" != "staging" ] && [ "${_APP_ID}" != "production" ] && usage_exit

echo "TARGET in setup_deploy:"${_TARGET}
echo "APP ID in setup_deploy:"${_APP_ID}

PACKAGE_ROOT=$(cd $(dirname $0)/../../packages/${_TARGET}; pwd)
DIST="${PACKAGE_ROOT}/dist/umd/*"
DEPLOY_DIR=$(cd $(dirname $0)/../public; pwd)

if [ ${_TARGET} = "mapray" ]; then
  PUBLIC=${DEPLOY_DIR}/mapray-js
elif [ ${_TARGET} = "ui" ]; then
  PUBLIC=${DEPLOY_DIR}/ui
fi


echo "PACKAGE_ROOT in setup_deploy:"${PACKAGE_ROOT}

## DEV to deplo
VERSION=`node -pe "require('${PACKAGE_ROOT}/package.json').version"` && \
echo "VERSION in setup_deploy:"${VERSION}

# for Debug print
if [ ${_APP_ID} = dev ]; then
    _NEXT_VERSION=`git describe --tags`
elif [ ${_APP_ID} = staging ]; then
    _NEXT_VERSION=`git describe --tags --abbrev=0`
elif [ ${_APP_ID} = production ]; then
    _NEXT_VERSION=`node -pe "require('${PACKAGE_ROOT}/package.json').version"`
else
    echo "build for production"
    exit 1
fi

echo "NEXT VESRION is ${_NEXT_VERSION}"

# copy
mkdir -p ${PUBLIC}/v${_NEXT_VERSION} 2>/dev/null
cp -r ${DIST} ${PUBLIC}/v${_NEXT_VERSION}/ || exit $?

if [ ${_TARGET} = "ui" ]; then
  RESOURCE_VERSION=1
  cp -r ${PACKAGE_ROOT}/dist/mapray.css ${DEPLOY_DIR}/styles/v${RESOURCE_VERSION}/ || exit $?
fi

echo "coped dir URL:${PUBLIC}/v${_NEXT_VERSION}/"
