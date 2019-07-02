#!/bin/bash
HOME=$(cd $(dirname $0)/../..; pwd)

set -eu

if [ $#=1 ]; then
  _NPM_TOKEN=$1
else
  echo "run deploy_to_cdn.sh <PROJECT_ID> <TOKEN>"
  exit 1
fi

cd ${HOME}
echo "//registry.npmjs.org/:_authToken="${_NPM_TOKEN}  > .npmrc
echo "Command, npm publish, is executed in "${HOME}

_VERSION=`git describe --tags --abbrev=0`
npm publish mapray-js-${_VERSION}.tgz
