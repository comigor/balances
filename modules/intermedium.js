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
const _ = require('lodash/fp');
const he = require('he');

nconf.env('_').file({file: process.env.HOME + '/.balances.conf'});

//
// we use node v5.5 because of submitLogin() step
// see https://github.com/request/request/issues/2091
//

const login = nconf.get('intermedium:login');
const password = nconf.get('intermedium:password');
let viewstate = '';
let idSelect = '';
let virtualKeyboard = {};
let idSubmitPassword = '';
let checkingAccountButton = '';
let savingsAccountButton = '';

const serialPromise = (funcs) => {
  return funcs.reduce((promise, func) => {
    return promise.then(func);
  }, Promise.resolve())
}

const typeCharacter = (char) => {
  const keyboardCode = virtualKeyboard[char];
  let form = {
    'frmLogin': 'frmLogin',
    'javax.faces.ViewState': viewstate,
    'login': login,
    'javax.faces.source': keyboardCode,
    'javax.faces.partial.event': 'click',
    'javax.faces.partial.execute': keyboardCode + ' ' + keyboardCode,
    'javax.faces.partial.render': 'panelTeclado',
    'javax.faces.behavior.event': 'action',
    'javax.faces.partial.ajax': 'true'
  };
  form[idSelect] = 'CLIENTE_RENDA_FIXA';

  const options = {
    method: 'POST',
    uri: 'https://internetbanking.intermedium.com.br/login.jsf',
    form: form,
    jar: true,
    resolveWithFullResponse: true
  };

  return rp(options);
}

const populateVirtualKeyboard = (body) => {
  return _(body.match(/<input id="([^"]+)"[^>]*class="btsResgate"/g))
    .map((input) => [he.decode(input.match(/value="([^"]+)"/)[1]), input.match(/id="([^"]+)"/)[1]])
    .fromPairs()
    .value();
}

const fetchLoginPage = () => {
  const options = {
    method: 'GET',
    uri: 'https://internetbanking.intermedium.com.br/login.jsf',
    jar: true,
    resolveWithFullResponse: true
  };
  return rp(options);
}

const typeLogin = (response) => {
  viewstate = response.body.match(/name="javax.faces.ViewState"[^>]*value="([^"]+)"/)[1];
  idSelect = response.body.match(/<select id="([^"]+)"/)[1];
  const idSubmit = response.body.match(/<input type="submit" name="([^"]+)"/)[1];

  let form = {
    'frmLogin': 'frmLogin',
    'javax.faces.ViewState': viewstate,
    'login': login
  };
  form[idSelect] = 'CLIENTE_RENDA_FIXA';
  form[idSubmit] = 'Aguarde ...';

  const options = {
    method: 'POST',
    uri: 'https://internetbanking.intermedium.com.br/login.jsf',
    form: form,
    jar: true,
    resolveWithFullResponse: true
  };

  return rp(options);
}

const clickName = (response) => {
  viewstate = response.body.match(/name="javax.faces.ViewState"[^>]*value="([^"]+)"/)[1];
  const idName = response.body.match(/<a id="([^"]+)"[^>]*panelGeral/)[1];

  let form = {
    'frmLogin': 'frmLogin',
    'javax.faces.ViewState': viewstate,
    'login': login,
    'javax.faces.source': idName,
    'javax.faces.partial.event': 'click',
    'javax.faces.partial.execute': idName + ' panelGeral',
    'javax.faces.partial.render': 'panelGeral',
    'javax.faces.behavior.event': 'action',
    'javax.faces.partial.ajax': 'true'
  };
  form[idSelect] = 'CLIENTE_RENDA_FIXA';

  const options = {
    method: 'POST',
    uri: 'https://internetbanking.intermedium.com.br/login.jsf',
    form: form,
    jar: true,
    resolveWithFullResponse: true
  };

  return rp(options);
}

const parseVirtualKeyboard1 = (response) => {
  virtualKeyboard = {'submit': response.body.match(/<input id="([^"]+)" type="submit"[^>]*value="Confirmar"/)[1]};
  virtualKeyboard = _.extend(virtualKeyboard, populateVirtualKeyboard(response.body));
  return typeCharacter('!?.');
}

const parseVirtualKeyboard2 = (response) => {
  virtualKeyboard = _.extend(virtualKeyboard, populateVirtualKeyboard(response.body));
  return typeCharacter('ABC');
}

const typePassword = (response) => {
  // TODO: missing uppercase password characters
  return serialPromise(Array.from(password).map(c => () => typeCharacter(c)));
}

const submitLogin = (response) => {
  return typeCharacter('submit');
}

const redirectToHome = (response) => {
  const options = {
    method: 'GET',
    uri: 'https://internetbanking.intermedium.com.br/comum/home.jsf',
    jar: true,
    resolveWithFullResponse: true
  };
  return rp(options);
}

const parseCheckingAccount = (response) => {
  viewstate = response.body.match(/name="javax.faces.ViewState"[^>]*value="([^"]+)"/)[1];
  checkingAccountButton = response.body.match(/SALDO C\/C<\/b><a id="([^"]+)"[^>]*frmSaldos/)[1];

  let form = {
    'frmSaldos': 'frmSaldos',
    'javax.faces.ViewState': viewstate,
    'javax.faces.source': checkingAccountButton,
    'javax.faces.partial.event': 'click',
    'javax.faces.partial.execute': checkingAccountButton + ' ' + checkingAccountButton,
    'javax.faces.partial.render': 'frmSaldos',
    'javax.faces.behavior.event': 'action',
    'javax.faces.partial.ajax': 'true'
  };

  const options = {
    method: 'POST',
    uri: 'https://internetbanking.intermedium.com.br/comum/home.jsf',
    form: form,
    jar: true,
    resolveWithFullResponse: true
  };

  return rp(options);
}

const parseSavingsAccount = (response) => {
  savingsAccountButton = response.body.match(/INVESTIMENTOS<\/b><a id="([^"]+)"[^>]*frmSaldos/)[1];

  let form = {
    'frmSaldos': 'frmSaldos',
    'javax.faces.ViewState': viewstate,
    'javax.faces.source': savingsAccountButton,
    'javax.faces.partial.event': 'click',
    'javax.faces.partial.execute': savingsAccountButton + ' ' + savingsAccountButton,
    'javax.faces.partial.render': 'frmSaldos',
    'javax.faces.behavior.event': 'action',
    'javax.faces.partial.ajax': 'true'
  };

  const options = {
    method: 'POST',
    uri: 'https://internetbanking.intermedium.com.br/comum/home.jsf',
    form: form,
    jar: true,
    resolveWithFullResponse: true
  };

  return rp(options);
}

const balances = (response) => {
  const checkingAccountBalance = parseFloat(response.body.match(/<span class="spanValores">[^\/]*R\$ ([0-9,\.]+)<\/span>/)[1].replace('.', '').replace(',', '.')).toFixed(2);
  const savingsAccountBalance = parseFloat(response.body.match(/totalResultados">R\$ ([0-9,\.]+)/)[1].replace('.', '').replace(',', '.')).toFixed(2);
  return `-- Intermedium --
Checking account balance: R$ ${checkingAccountBalance}
Savings account balance: R$ ${savingsAccountBalance}`;
}

module.exports = {
  authorize: () => undefined,
  balances: () => {
    Promise.resolve()
      .then(fetchLoginPage)
      .then(typeLogin)
      .then(clickName)
      .then(parseVirtualKeyboard1)
      .then(parseVirtualKeyboard2)
      .then(typePassword)
      .then(submitLogin)
      .then(redirectToHome)
      .then(parseCheckingAccount)
      .then(parseSavingsAccount)
      .then(balances)
      .then(console.log);
  }
}
