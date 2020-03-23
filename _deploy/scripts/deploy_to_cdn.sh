#!/bin/bash
DEPLOYED_DIR=$(cd $(dirname $0)/..; pwd)

set -eu

if [ $# -ne 2 ]; then
  echo "Wrong number of arguments"
  exit 1
fi

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
