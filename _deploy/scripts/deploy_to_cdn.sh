#!/bin/bash
DEPLOYED_DIR=$(cd $(dirname $0)/..; pwd)

set -eu

if [ $# -ne 2 ]; then
  echo "Wrong number of arguments"
  exit 1
fi

usage_exit() {
        echo "Usage: $0 [-t {mapray-js | ui} ] [-a {dev | staging | production}] " 1>&2
        exit 1
}

while getopts t:a: OPT
do
    case $OPT in
        t)  FLAG_A=1
            ;;
        a)  VALUE_D=$OPTARG
            ;;
        h)  usage_exit
            ;;
        \?) usage_exit
            ;;
    esac
done

shift $((OPTIND - 1))

if [ $#=1 ]; then
  _PROJECT_ID=$1
else
  echo "run deploy_to_cdn.sh <PROJECT_ID> <TOKEN>"
  exit 1
fi

if [ $#=2 ]; then
  _TOKEN=$2
else
  echo "run deploy_to_cdn.sh <PROJECT_ID> <TOKEN>"
  exit 1
fi

echo "PROJECT_ID in deploy_to_cdn:"${_PROJECT_ID}

cd ${DEPLOYED_DIR}
firebase deploy --project ${_PROJECT_ID} --token=${_TOKEN}

