#!/bin/bash
HOME=$(cd $(dirname $0)/../..; pwd)

set -eu

cd ${HOME}
VERSION=`node -pe "require('./package.json').version"` && \
NEXT_VERSION=`node -pe "require('semver').inc(\"${VERSION}\", '$1')"` && \
echo ${NEXT_VERSION} && \
node -e "\
  var j = require('./package.json');\
  j.version = \"${NEXT_VERSION}\";\
  var s = JSON.stringify(j, null, 2);\
  require('fs').writeFileSync('./package.json', s);"

