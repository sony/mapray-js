#!/bin/bash

set -eu

usage_exit() {
        echo "Usage: $0 [-t {mapray | ui} ] [-n npm token] [-d development flag] " 1>&2
        exit 1
}

_TARGET="null"
_NPM_TOKEN="null"
_DEV_FLAG=0

while getopts :t:n:d OPT
do
    case $OPT in
        t)  _TARGET=$OPTARG
            ;;
        n)  _NPM_TOKEN=$OPTARG
            ;;
        d)  _DEV_FLAG=1
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

PACKAGE_ROOT=$(cd $(dirname $0)/../../packages/${_TARGET}; pwd)
echo "PACKAGE_ROOT in deploy_to_npm_com:"${PACKAGE_ROOT}

cd ${PACKAGE_ROOT}
echo "//registry.npmjs.org/:_authToken="${_NPM_TOKEN}  > .npmrc
echo "Command, yarn publish, is executed in "${PACKAGE_ROOT}

_NAME="null"

if [ ${_TARGET} = "mapray" ]; then
  _NAME="mapray-js"
elif [ ${_TARGET} = "ui" ]; then
  _NAME="ui"
fi

#_VERSION=`git describe --tags --abbrev=0`
_CURRENT_VERSION=`node -pe "require('${PACKAGE_ROOT}/package.json').version"`
_VERSION=${_CURRENT_VERSION} 
_FILE_NAME=mapray-${_NAME}-v${_VERSION}.tgz

if [ ${_DEV_FLAG} = 1 ]; then
  _VERSION=`git describe --tags`
  echo "dev mode _VERSION:"${_VERSION}
    echo "dev mode tag:"`git tag`
  
  sed -i -e "s/@mapray\/${_NAME}/@mapray\/${_NAME}-dev/g" ${PACKAGE_ROOT}/package.json
  sed -i -e 's/\"version\": \"'${_CURRENT_VERSION}'\"/\"version\": \"'${_VERSION}'\"/g' ${PACKAGE_ROOT}/package.json

  # replace dependency in ui
  if [ ${_TARGET} = "ui" ]; then
    sed -i -e "s/\"@mapray\/mapray-js\": \"^${_CURRENT_VERSION}\"/\"@mapray\/mapray-js-dev\": \"${_VERSION}\"/g" ${PACKAGE_ROOT}/package.json

    ## NOTICE!! replace builded files directly, if depencency would be added, you would add other depencncy 
    ## Following will replace from mapray-js to mapray-js-dev 
    sed -i -e "s/@mapray\/mapray-js/@mapray\/mapray-js-dev/g" ${PACKAGE_ROOT}/dist/es/maprayui.js
    sed -i -e "s/@mapray\/mapray-js/@mapray\/mapray-js-dev/g" ${PACKAGE_ROOT}/dist/es/maprayui.js.map
    sed -i -e "s/@mapray\/mapray-js/@mapray\/mapray-js-dev/g" ${PACKAGE_ROOT}/dist/es/maprayui.mjs
    sed -i -e "s/@mapray\/mapray-js/@mapray\/mapray-js-dev/g" ${PACKAGE_ROOT}/dist/umd/maprayui.js
    sed -i -e "s/@mapray\/mapray-js/@mapray\/mapray-js-dev/g" ${PACKAGE_ROOT}/dist/umd/maprayui.js.map
    sed -i -e "s/@mapray\/mapray-js/@mapray\/mapray-js-dev/g" ${PACKAGE_ROOT}/dist/umd/maprayui.min.js

    _FILE_NAME=mapray-ui-dev-v${_VERSION}.tgz
    echo "dev mode and ui target: repacked packages and new FileName is "${_FILE_NAME}

    cd ${PACKAGE_ROOT}
    yarn pack
    cd -
  fi
  
  cat ${PACKAGE_ROOT}/package.json
fi

cd ${PACKAGE_ROOT}
echo "Will publish, yarn publish "${_FILE_NAME}" version:"${_VERSION}" on `node -pe "require('${PACKAGE_ROOT}/package.json').name"`"
yarn publish ${_FILE_NAME}
