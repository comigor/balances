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
const moment = require('moment');

nconf.env('_').file({file: process.env.HOME + '/.balances.conf.json'});

const NAME = 'Easynvest';

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

const balance = () => {
  return Promise.all([
    genericDetails('PRIVATE'),
    genericDetails('FUTURES'),
    genericDetails('FUNDS'),
    genericDetails('GOVERNMENT'),
    genericDetails('DEPOSIT'),
    genericDetails('STOCKS')
  ]).then(__.flatten)
    .then(balances => balances
                        .filter(__.identity)
                        .reduce((m, i) => m + i.netValue, 0));
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
                        .map(b => {
                          return {
                            broker: NAME,
                            name: `${b.index} ${b.name} ${b.issuer}`,
                            dailyLiquidity: b.dailyLiquidity,
                            date: b.dailyLiquidity ? undefined :
                              moment(b.maturityDate, 'YYYY-MM-DD[T]HH:mm:ssz'),
                            balance: b.netValue
                          };
                        })
                        .value());
}

module.exports = {
  name: NAME,
  authorize: authorize,
  balance: () => {
    return Promise.resolve()
      .then(checkLogin)
      .catch(authorize)
      .then(balance);
  },
  details: () => {
    return Promise.resolve()
      .then(checkLogin)
      .catch(authorize)
      .then(details);
  }
}
