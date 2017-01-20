/*
Copyright (C) 2017 Igor Borges

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

'use strict';
const nconf = require('nconf');
const rp = require('request-promise');

nconf.env('_').file({file: process.env.HOME + '/.balances.conf.json'});

const authorize = () => {
  const options = {
    method: 'POST',
    uri: 'https://auth.app.easynvest.com.br/v1/users/me/tokens',
    headers: {'Content-type': 'application/json'},
    body: {
      login: nconf.get('easynvest:login'),
      password: nconf.get('easynvest:password')
    },
    json: true,
    resolveWithFullResponse: true
  };

  return rp(options)
    .then(response => {
      nconf.set('easynvest:auth:token', response.body.token);
      nconf.save();
    })
    .catch(console.error);
}

const checkLogin = () => {
  if (!nconf.get('easynvest:auth:token'))
    throw new Error('Missing token');

  const options = {
    method: 'GET',
    uri: 'https://api.app.easynvest.com.br/v2/users/me/accounts/PRIVATE',
    headers: {
      'Content-type': 'application/json',
      'Authorization': 'Bearer ' + nconf.get('easynvest:auth:token')
    },
    json: true,
    resolveWithFullResponse: true
  };

  return rp(options).then(response => {
    if (response.statusCode != 200)
      throw new Error('Login failed');
  });
}

const genericBalance = (type) => {
  return rp({
    method: 'GET',
    uri: `https://api.app.easynvest.com.br/v2/users/me/accounts/${type}`,
    headers: {
      'Authorization': 'Bearer ' + nconf.get('easynvest:auth:token')
    },
    json: true,
    resolveWithFullResponse: true
  })
  .then(response => response.body.balance);
}

const savingsBalance = () => {
  return Promise.all([
    genericBalance('PRIVATE'),
    genericBalance('FUTURES'),
    genericBalance('FUNDS'),
    genericBalance('GOVERNMENT'),
    genericBalance('STOCKS')
  ].map(p => p.catch(e => e)))
    .then(balances => balances
                        .filter(b => !b.error)
                        .reduce((m, i) => m + i, 0))
    .then(balance => {
      return `Savings account balance: R$ ${balance.toFixed(2)}`;
    });
}

const checkingBalance = () => {
  return genericBalance('DEPOSIT')
    .then(balance => {
      return `Checking account balance: R$ ${balance.toFixed(2)}`;
    });
}

const printHeader = () => {
  console.log('-- Easynvest --');
}

module.exports = {
  authorize: authorize,
  balances: () => {
    Promise.resolve()
      .then(checkLogin)
      .catch(authorize)
      .then(printHeader)
      .then(checkingBalance)
      .then(console.log)
      .then(savingsBalance)
      .then(console.log);
  }
}
