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
const __ = require('lodash');
const nconf = require('nconf');
const rp = require('request-promise');
const table = require('easy-table');
const moment = require('moment');

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
    simple: false,
    resolveWithFullResponse: true
  })
  .then(response => response.body.balance);
}

const genericDetails = (type) => {
  return rp({
    method: 'GET',
    uri: `https://api.app.easynvest.com.br/v2/users/me/accounts/${type}/investments`,
    headers: {
      'Authorization': 'Bearer ' + nconf.get('easynvest:auth:token')
    },
    json: true,
    simple: false,
    resolveWithFullResponse: true
  })
  .then(response => response.statusCode == 200 ? response.body : undefined);
}

const savingsBalance = () => {
  return Promise.all([
    genericBalance('PRIVATE'),
    genericBalance('FUTURES'),
    genericBalance('FUNDS'),
    genericBalance('GOVERNMENT'),
    genericBalance('STOCKS')
  ]).then(balances => balances
                        .filter(__.identity)
                        .reduce((m, i) => m + i, 0))
    .then(balance => {
      return `Savings account balance: R$ ${balance.toFixed(2)}`;
    });
}

const details = () => {
  return Promise.all([
    genericDetails('PRIVATE'),
    genericDetails('FUTURES'),
    genericDetails('FUNDS'),
    genericDetails('GOVERNMENT'),
    genericDetails('DEPOSIT'),
    genericDetails('STOCKS')
  ]).then(balances => __(balances)
                        .filter(__.identity)
                        .flatten()
                        .orderBy(['dailyLiquidity', 'maturityDate'], ['desc', 'asc'])
                        .map(b => { return {
                          name: `[${b.index}] ${b.name} ${b.issuer}`,
                          date: b.dailyLiquidity ? '-' :
                            moment(b.maturityDate, 'YYYY-MM-DD[T]HH:mm:ssz').format('MMM/YYYY'),
                          balance: b.netValue
                        }})
                        .value())
    .then(balances => {
      return table.print(balances, {
        balance: {printer: table.number(2)}
      }, (table) => table.total('balance').toString());
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
  },
  details: () => {
    Promise.resolve()
      .then(checkLogin)
      .catch(authorize)
      .then(details)
      .then(console.log);
  }
}
