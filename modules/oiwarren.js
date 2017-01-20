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

nconf.env('_').file({file: process.env.HOME + '/.balances.conf'});

const authorize = () => {
  const options = {
    method: 'POST',
    uri: 'https://api.oiwarren.com/api/v2/account/login',
    headers: {'Content-type': 'application/json'},
    body: {
      email: nconf.get('oiwarren:email'),
      password: nconf.get('oiwarren:password')
    },
    json: true,
    resolveWithFullResponse: true
  };

  return rp(options)
    .then(response => {
      nconf.set('oiwarren:auth:accessToken', response.body.accessToken);
      nconf.save();
    });
}

const checkLogin = () => {
  const options = {
    method: 'GET',
    uri: 'https://api.oiwarren.com/api/v2/account/me',
    headers: {
      'Content-type': 'application/json',
      'Access-Token': nconf.get('oiwarren:auth:accessToken')
    },
    json: true,
    resolveWithFullResponse: true
  };

  return rp(options).then(response => {
    if (response.statusCode != 200)
      throw new Error('Login failed');
  });
}

const savingsBalance = () => {
  return rp({
    method: 'GET',
    uri: 'https://api.oiwarren.com/api/v2/portfolios/mine',
    headers: {
      'Access-Token': nconf.get('oiwarren:auth:accessToken')
    },
    json: true,
    resolveWithFullResponse: true
  }).then(response => {
    const totalBalance = response.body.portfolios.reduce((m, i) => m + i.totalBalance, 0);
    return `Savings account balance: R$ ${totalBalance.toFixed(2)}`;
  });
}

const printHeader = () => {
  console.log('-- OiWarren --');
}

module.exports = {
  authorize: authorize,
  balances: () => {
    if (!nconf.get('oiwarren:auth:accessToken')) {
      authorize();
    } else {
      checkLogin()
        .catch(authorize)
        .then(printHeader)
        .then(savingsBalance)
        .then(console.log);
    }
  }
}
