#!/bin/bash
HOME=$(cd $(dirname $0)/../..; pwd)

set -eu

sage_exit() {
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

echo "TARGET in setup_deploy:"${_TARGET}
echo "NPM_TOKEN in setup_deploy:"${_NPM_TOKEN}

////
cd ${HOME}
echo "//registry.npmjs.org/:_authToken="${_NPM_TOKEN}  > .npmrc
echo "Command, npm publish, is executed in "${HOME}

_VERSION=`git describe --tags --abbrev=0`
npm publish mapray-js-${_VERSION}.tgz
