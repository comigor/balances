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
    method: 'POST',
    uri: 'https://api.oiwarren.com/api/v2/account/me',
    headers: {
      'Content-type': 'application/json',
      'Access-Token': nconf.get('oiwarren:auth:accessToken')
    },
    body: {
      email: nconf.get('oiwarren:email'),
      password: nconf.get('oiwarren:password')
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

module.exports = {
  authorize: authorize,
  balances: () => {
    if (!nconf.get('oiwarren:auth:accessToken')) {
      authorize();
    } else {
      checkLogin().then(savingsBalance).then(console.log)
        .catch(() => authorize().then(savingsBalance).then(console.log));
    }
  }
}
