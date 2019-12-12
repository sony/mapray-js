#!/bin/bash
HOME=$(cd $(dirname $0)/../..; pwd)
DIST=$(cd $(dirname $0)/../../dist; pwd)
DEPLOY_DIR=$(cd $(dirname $0)/../public; pwd)
PUBLIC=${DEPLOY_DIR}/mapray-js
RESOURCE_VERSION=1

set -eu

if [ $#=1 ]; then
  _APP_ID=$1
else
  echo "run setup_deploy.sh <APPID>"
  exit 1
fi

echo "APP ID in setup_deploy:"${_APP_ID}

## DEV to deplo
cd ${HOME}
VERSION=`node -pe "require('./package.json').version"` && \
_NEXT_VERSION=`node -pe "require('semver').inc(\"${VERSION}\", '$1')"`

# for Debug print


if [ ${_APP_ID} = dev ]; then
    _NEXT_VERSION=`git describe --tags`
elif [ ${_APP_ID} = staging ]; then
    _NEXT_VERSION=`git describe --tags --abbrev=0`
elif [ ${_APP_ID} = production ]; then
    _NEXT_VERSION=`node -pe "require('./package.json').version"`
else
    echo "build for production"
    exit 1
fi

echo "NEXT VESRION is ${_NEXT_VERSION}"

# copy
mkdir -p ${PUBLIC}/v${_NEXT_VERSION} 2>/dev/null
cp -r ${DIST}/mapray.js ${PUBLIC}/v${_NEXT_VERSION}/ || exit $?
cp -r ${DIST}/maprayui.js ${PUBLIC}/v${_NEXT_VERSION}/ || exit $?
cp -r ${DIST}/mapray.css ${PUBLIC}/styles/v${RESOURCE_VERSION}/ || exit $?

echo "mapray-js file URL:./mapray-js/v${_NEXT_VERSION}/mapray.js"
