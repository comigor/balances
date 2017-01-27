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
const moment = require('moment');

nconf.env('_').file({file: process.env.HOME + '/.balances.conf.json'});

const NAME = 'Monetus';
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

const balance = () => {
  return rp({
    method: 'GET',
    uri: 'https://app.monetus.com.br/portfolio',
    json: true,
    jar: true,
    resolveWithFullResponse: true
  }).then(response => {
    const portfolio = JSON.parse(response.body.match(/JSON\.parse\('([^']+)'/)[1]);
    return portfolio.reduce((m, i) => m + i.value, 0);
  });
}

const details = () => {
  return rp({
    method: 'GET',
    uri: 'https://app.monetus.com.br/portfolio',
    json: true,
    jar: true,
    resolveWithFullResponse: true
  }).then(response => {
    return JSON.parse(response.body.match(/JSON\.parse\('([^']+)'/)[1])
      .map(p => {
        const date = moment(p.asset.maturity, 'YYYY-MM-DD HH:mm:ss');
        return {
          broker: NAME,
          name: p.asset.name,
          dailyLiquidity: date.isBefore(moment()),
          date: date,
          balance: p.value
        };
      });
  });
}

module.exports = {
  name: NAME,
  authorize: () => undefined,
  balance: () => {
    return Promise.resolve()
      .then(getLoginToken)
      .then(login)
      .then(balance);
  },
  details: () => {
    return Promise.resolve()
      .then(getLoginToken)
      .then(login)
      .then(details);
  }
}
