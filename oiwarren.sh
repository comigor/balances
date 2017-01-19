#!/bin/bash

function get_token() {
  echo -n "OiWarren email: "
  read email
  echo -n "OiWarren password: "
  read -s password
  echo

  local login_response=$(curl -s -w "\n%{http_code}" https://api.oiwarren.com/api/v2/account/login \
    -X POST \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    --data '{"email":"'$email'","password":"'$password'"}')

  if [[ $(echo "$login_response" | tail -n1) != 200 ]]; then
    echo "Invalid login"
    exit 1
  fi

  token=$(echo "$login_response" | sed '$d' | jq -r '.accessToken')
  echo $token > ~/.oiwarrentoken
}

function check_login() {
  local me_response=$(curl -s -w "\n%{http_code}" https://api.oiwarren.com/api/v2/account/me \
    -H "Content-Type: application/json" \
    -H "Access-Token: $token")

  if [[ $(echo "$me_response" | tail -n1) != 200 ]]; then
    get_token
  fi

  name=$(echo "$me_response" | sed '$d' | jq -r '.customer.name')
}

if [[ -s ~/.oiwarrentoken ]]
then
  token=$(cat ~/.oiwarrentoken)
  check_login
else
  get_token
fi

# echo "Oi, $name"
# echo

portfolios=$(curl -s https://api.oiwarren.com/api/v2/portfolios/mine \
  -H "Access-Token: $token" \
  -H "Accept: application/json" | jq '.portfolios')

# echo "Portfolios:"
# echo $portfolios | jq '[to_entries[] | {name: .value.name, balance: .value.totalBalance, earnings: .value.totalEarnings}]'
echo "Total balance: R$" $(echo $portfolios | jq '.[].totalBalance' | jq -s 'add')
# echo "Total earnings: R$" $(echo $portfolios | jq '.[].totalEarnings' | jq -s 'add')
