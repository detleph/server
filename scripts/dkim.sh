#! /bin/bash


#load .env file

[[ -f .env ]] || { echo "`tput setaf 1`✗`tput sgr0` Could not find .env file are you in the correct directory (you should be in the server directory)"; exit 1;}

set -o allexport
[[ -f .env ]] && source .env
set +o allexport

#static variables
NC='tput sgr0' #No Color
GREEN='tput setaf 2'
RED='tput setaf 1'


#check dependencies
command -v opendkim-genkey >/dev/null 2>&1 || { echo >&2 "`$RED`✗`$NC` Opendkim not installed install with your favorite package manager (opendkim-tools | opendkim-utils)"; exit 1;}

#generate dkim keys
mkdir -p ./host/keys
echo "`$GREEN`✓`$NC` Created folder"

cd ./host/keys
opendkim-genkey -b 2048 -h rsa-sha256 -r -v --subdomains -s mail -d mail.$DOMAIN
sed -i 's/h=rsa-sha256/sha256/' mail.txt
mv mail.private mail.$DOMAIN.private
mv mail.txt mail.$DOMAIN.txt

echo "`$GREEN`✓`$NC` Generated dkim keys"

exit 0