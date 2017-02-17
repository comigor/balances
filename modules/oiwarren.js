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
const NAME = 'OiWarren';
let config = {};

const authorize = () => {
  const options = {
    method: 'POST',
    credentials: 'include',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      email: config.get('oiwarren:email'),
      password: config.get('oiwarren:password')
    })
  };

  return fetch('https://api.oiwarren.com/api/v2/account/login', options)
    .then(response => response.json())
    .then(body => {
      config.set('oiwarren:auth:accessToken', body.accessToken);
      config.save();
    });
}

const checkLogin = () => {
  if (!config.get('oiwarren:auth:accessToken'))
    throw new Error('Missing token');

  const options = {
    method: 'GET',
    credentials: 'include',
    headers: {'Access-Token': config.get('oiwarren:auth:accessToken')}
  };

  return fetch('https://api.oiwarren.com/api/v2/account/me', options)
    .then(response => {
      if (response.status != 200)
        throw new Error('Login failed');
    });
}

const balance = () => {
  return fetch('https://api.oiwarren.com/api/v2/portfolios/mine', {
    method: 'GET',
    credentials: 'include',
    headers: {'Access-Token': config.get('oiwarren:auth:accessToken')}
  }).then(response => response.json())
    .then(body => {
    return body.portfolios.reduce((m, i) => m + i.totalBalance, 0);
  });
}

const details = () => {
  return fetch('https://api.oiwarren.com/api/v2/portfolios/mine', {
    method: 'GET',
    credentials: 'include',
    headers: {'Access-Token': config.get('oiwarren:auth:accessToken')}
  }).then(response => response.json())
    .then(body => {
    return body.portfolios.map(p => {
      return {
        broker: NAME,
        name: p.name,
        dailyLiquidity: true,
        balance: p.totalBalance
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
