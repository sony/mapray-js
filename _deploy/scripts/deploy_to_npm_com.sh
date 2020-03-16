#!/bin/bash

set -eu

usage_exit() {
        echo "Usage: $0 [-t {mapray | ui} ] [-n npm token] " 1>&2
        exit 1
}

_TARGET="null"
_NPM_TOKEN="null"

while getopts :t:a: OPT
do
    case $OPT in
        t)  _TARGET=$OPTARG
            ;;
        n)  _NPM_TOKEN=$OPTARG
            ;;
        h)  usage_exit
            ;;
        :|\?) usage_exit
            ;;
    esac
done

shift $((OPTIND - 1))

[ "${_TARGET}" != "mapray" ] && [ "${_TARGET}" != "ui" ] && usage_exit

echo "TARGET in deploy_to_npm_com:"${_TARGET}
echo "NPM_TOKEN in deploy_to_npm_com:"${_NPM_TOKEN}

PACKAGE_ROOT=$(cd $(dirname $0)/../../packages/${_TARGET}; pwd)
echo "PACKAGE_ROOT in deploy_to_npm_com:"${PACKAGE_ROOT}

cd ${PACKAGE_ROOT}
echo "//registry.npmjs.org/:_authToken="${_NPM_TOKEN}  > .npmrc
echo "Command, yarn publish, is executed in "${PACKAGE_ROOT}

#_VERSION=`git describe --tags --abbrev=0`
_VERSION=`node -pe "require('${PACKAGE_ROOT}/package.json').version"`

_NAME="null"

if [ ${_TARGET} = "mapray" ]; then
  _NAME="mapray-js-dummy"
elif [ ${_TARGET} = "ui" ]; then
  _NAME="ui-dummy"
fi

yarn publish mapray-${_NAME}-${_VERSION}.tgz --new-version ${_VERSION}
echo "Published, yarn publish "mapray-${_NAME}-${_VERSION}.tgz" version:"${_VERSION}


