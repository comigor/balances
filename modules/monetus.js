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
const moment = require('moment');
const cookiejar = require('../cookiejar');

const NAME = 'Monetus';
let config = {};
let _token = '';

const getLoginToken = () => {
  const options = {
    method: 'GET',
    credentials: 'include'
  };

  return fetch('https://app.monetus.com.br/login', options)
    .then(cookiejar.mergeCookies)
    .then(response => response.text())
    .then(body => {
      _token = body.match(/name="_token"[^>]*value="([^"]+)"/)[1];
    });
}

const login = () => {
  config.getMultiple('monetus:login', 'monetus:password')
    .then(credentials => {
      return {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-type': 'application/json',
          'Cookie': cookiejar.cookieHeader()
        },
        body: JSON.stringify({
          email: credentials['monetus:login'],
          password: credentials['monetus:password'],
          _token: _token
        })
      };
    })
    .then(options => fetch('https://app.monetus.com.br/login', options))
    .then(cookiejar.mergeCookies);
}

const authorize = () => {
  return Promise.resolve()
    .then(getLoginToken)
    .then(login);
}

const checkLogin = () => {
  const options = {
    method: 'GET',
    credentials: 'include'
  };

  return fetch('https://app.monetus.com.br/login', options)
    .then(cookiejar.mergeCookies)
    .then(response => response.text())
    .then(body => {
      const isLoggedIn = /JSON\.parse\('[^']+'/.test(body);
      if (!isLoggedIn)
        throw new Error('Not logged in');
    });
}

const balance = () => {
  return fetch('https://app.monetus.com.br/portfolio', {
    method: 'GET',
    credentials: 'include',
    headers: {'Cookie': cookiejar.cookieHeader()},
  }).then(cookiejar.mergeCookies)
    .then(response => response.text())
    .then(body => {
      const portfolio = JSON.parse(body.match(/JSON\.parse\('([^']+)'/)[1]);
      return portfolio.reduce((m, i) => m + i.value, 0);
    });
}

const details = () => {
  return fetch('https://app.monetus.com.br/portfolio', {
    method: 'GET',
    credentials: 'include',
    headers: {'Cookie': cookiejar.cookieHeader()}
  }).then(cookiejar.mergeCookies)
    .then(response => response.text())
    .then(body => {
      return JSON.parse(body.match(/JSON\.parse\('([^']+)'/)[1])
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

module.exports = (configuration) => {
  config = configuration;

  return {
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
  };
}
