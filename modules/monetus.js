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
const table = require('easy-table');
const moment = require('moment');

nconf.env('_').file({file: process.env.HOME + '/.balances.conf.json'});

let _token = '';

const getLoginToken = () => {
  const options = {
    method: 'GET',
    uri: 'https://app.monetus.com.br/login',
    json: true,
    jar: true,
    resolveWithFullResponse: true
  };

  return rp(options)
    .then(response => {
      _token = response.body.match(/name="_token"[^>]*value="([^"]+)"/)[1];
    });
}

const login = () => {
  const options = {
    method: 'POST',
    uri: 'https://app.monetus.com.br/login',
    headers: {'Content-type': 'application/json'},
    body: {
      email: nconf.get('monetus:email'),
      password: nconf.get('monetus:password'),
      _token: _token
    },
    json: true,
    jar: true,
    simple: false,
    followRedirect: false,
    resolveWithFullResponse: true
  };

  return rp(options);
}

const savingsBalance = () => {
  return rp({
    method: 'GET',
    uri: 'https://app.monetus.com.br/portfolio',
    json: true,
    jar: true,
    resolveWithFullResponse: true
  }).then(response => {
    const portfolio = JSON.parse(response.body.match(/JSON\.parse\('([^']+)'/)[1]);
    return portfolio.reduce((m, i) => m + i.value, 0);
  }).then(balance => {
    return `Savings account balance: R$ ${balance.toFixed(2)}`;
  });
}

const savingsDetails = () => {
  return rp({
    method: 'GET',
    uri: 'https://app.monetus.com.br/portfolio',
    json: true,
    jar: true,
    resolveWithFullResponse: true
  }).then(response => {
    return JSON.parse(response.body.match(/JSON\.parse\('([^']+)'/)[1])
      .map(p => {
        return {
          name: p.asset.name,
          date: moment(p.asset.maturity, 'YYYY-MM-DD HH:mm:ss').format('MMM/YYYY'),
          balance: p.value
        };
      });
  }).then(balances => {
    return table.print(balances, {
      balance: {printer: table.number(2)}
    }, (table) => table.total('balance').toString());
  });
}

const printHeader = () => {
  console.log('-- Monetus --');
}

module.exports = {
  authorize: () => undefined,
  balances: () => {
    Promise.resolve()
      .then(getLoginToken)
      .then(login)
      .then(printHeader)
      .then(savingsBalance)
      .then(console.log);
  },
  details: () => {
    Promise.resolve()
      .then(getLoginToken)
      .then(login)
      .then(savingsDetails)
      .then(console.log);
  }
}
