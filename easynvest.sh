#!/bin/bash

function get_token() {
  echo -n "Easynvest login: "
  read login
  echo -n "Easynvest password: "
  read -s password
  echo

  local login_response=$(curl -s -w "\n%{http_code}" https://auth.app.easynvest.com.br/v1/users/me/tokens \
    -X POST \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    --data '{"login":"'$login'","password":"'$password'"}')

  if [[ $(echo "$login_response" | tail -n1) != 200 ]]; then
    echo "Invalid login"
    exit 1
  fi

  token=$(echo "$login_response" | sed '$d' | jq -r '.token')
  echo $token > ~/.easynvesttoken
}

function check_login() {
  local me_response=$(curl -s -w "\n%{http_code}" https://api.app.easynvest.com.br/v2/users/me/accounts/PRIVATE \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $token")

  if [[ $(echo "$me_response" | tail -n1) != 200 ]]; then
    get_token
  fi
}

if [[ -s ~/.easynvesttoken ]]
then
  token=$(cat ~/.easynvesttoken)
  check_login
else
  get_token
fi

# https://api.app.easynvest.com.br/v2/users/me/accounts/PRIVATE
# https://api.app.easynvest.com.br/v2/users/me/accounts/FUTURES
# https://api.app.easynvest.com.br/v2/users/me/accounts/FUNDS
# https://api.app.easynvest.com.br/v2/users/me/accounts/GOVERNMENT
# https://api.app.easynvest.com.br/v2/users/me/accounts/STOCKS
# https://api.app.easynvest.com.br/v2/users/me/accounts/DEPOSIT
# https://api.app.easynvest.com.br/v2/users/me/accounts/PRIVATE/investments

private=$(curl -s https://api.app.easynvest.com.br/v2/users/me/accounts/PRIVATE \
  -H "Authorization: Bearer $token" | jq '.balance')
futures=$(curl -s https://api.app.easynvest.com.br/v2/users/me/accounts/FUTURES \
  -H "Authorization: Bearer $token" | jq '.balance')
funds=$(curl -s https://api.app.easynvest.com.br/v2/users/me/accounts/FUNDS \
  -H "Authorization: Bearer $token" | jq '.balance')
government=$(curl -s https://api.app.easynvest.com.br/v2/users/me/accounts/GOVERNMENT \
  -H "Authorization: Bearer $token" | jq '.balance')
stocks=$(curl -s https://api.app.easynvest.com.br/v2/users/me/accounts/STOCKS \
  -H "Authorization: Bearer $token" | jq '.balance')
deposit=$(curl -s https://api.app.easynvest.com.br/v2/users/me/accounts/DEPOSIT \
  -H "Authorization: Bearer $token" | jq '.balance')

echo "Total balance: R$" $(echo "$private+$futures+$funds+$government+$stocks+$deposit" | bc)
