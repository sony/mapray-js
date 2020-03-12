#!/bin/bash

set -eu

usage_exit() {
        echo "Usage: $0 [-t {mapray | ui} ] [-v patch|minor|major] " 1>&2
        exit 1
}

_TARGET="null"
_HOWTO_UPDATE="null"

while getopts :t:a:v: OPT
do
    case $OPT in
        t)  _TARGET=$OPTARG
            ;;
        v)  _HOWTO_UPDATE=$OPTARG
            ;;
        h)  usage_exit
            ;;
        :|\?) usage_exit
            ;;
    esac
done

shift $((OPTIND - 1))

[ "${_TARGET}" != "mapray" ] && [ "${_TARGET}" != "ui" ] && usage_exit
[ "${_HOWTO_UPDATE}" != "patch" ] && [ "${_HOWTO_UPDATE}" != "minor" ] && [ "${_HOWTO_UPDATE}" != "major" ] && usage_exit


echo "TARGET in update_pacakge_json.sh:"${_TARGET}
echo "HOW TO UPDATE in update_pacakge_json.sh:"${_HOWTO_UPDATE}
PACKAGE_ROOT=$(cd $(dirname $0)/../../packages/${_TARGET}; pwd)

VERSION=`node -pe "require('${PACKAGE_ROOT}/package.json').version"` && \
NEXT_VERSION=`node -pe "require('semver').inc(\"${VERSION}\", '${_HOWTO_UPDATE}')"` && \
echo ${NEXT_VERSION} && \
node -e "\
  var j = require('${PACKAGE_ROOT}/package.json');\
  j.version = \"${NEXT_VERSION}\";\
  var s = JSON.stringify(j, null, 2);\
  require('fs').writeFileSync('${PACKAGE_ROOT}/package.json', s);"

