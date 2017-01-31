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
const __ = require('lodash/fp');
const he = require('he');
const moment = require('moment');

nconf.env('_').file({file: process.env.HOME + '/.balances.conf.json'});

//
// we use node v5.5 because of submitLogin() step
// see https://github.com/request/request/issues/2091
//

const NAME = 'Intermedium';
const login = nconf.get('intermedium:login');
const password = nconf.get('intermedium:password');
let viewstate = '';
let selectId = '';
let virtualKeyboard = {};
let checkingAccountButtonId = '';
let savingsAccountButtonId = '';
let viewButtonId = '';
let checkingAccountBalance = 0;
let savingsAccountBalance = 0;


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
  form[selectId] = 'CLIENTE_RENDA_FIXA';

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
  return __(body.match(/<input id="([^"]+)"[^>]*class="btsResgate"/g))
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
  selectId = response.body.match(/<select id="([^"]+)"/)[1];
  const submitId = response.body.match(/<input type="submit" name="([^"]+)"/)[1];

  let form = {
    'frmLogin': 'frmLogin',
    'javax.faces.ViewState': viewstate,
    'login': login
  };
  form[selectId] = 'CLIENTE_RENDA_FIXA';
  form[submitId] = 'Aguarde ...';

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
  const nameId = response.body.match(/<a id="([^"]+)"[^>]*panelGeral/)[1];

  let form = {
    'frmLogin': 'frmLogin',
    'javax.faces.ViewState': viewstate,
    'login': login,
    'javax.faces.source': nameId,
    'javax.faces.partial.event': 'click',
    'javax.faces.partial.execute': nameId + ' panelGeral',
    'javax.faces.partial.render': 'panelGeral',
    'javax.faces.behavior.event': 'action',
    'javax.faces.partial.ajax': 'true'
  };
  form[selectId] = 'CLIENTE_RENDA_FIXA';

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
  virtualKeyboard = __.extend(virtualKeyboard, populateVirtualKeyboard(response.body));
  return typeCharacter('!?.');
}

const parseVirtualKeyboard2 = (response) => {
  virtualKeyboard = __.extend(virtualKeyboard, populateVirtualKeyboard(response.body));
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

const authorize = () => {
  return Promise.resolve()
    .then(fetchLoginPage)
    .then(typeLogin)
    .then(clickName)
    .then(parseVirtualKeyboard1)
    .then(parseVirtualKeyboard2)
    .then(typePassword)
    .then(submitLogin)
    .then(redirectToHome);
}

const showCheckingAccountBalance = (response) => {
  viewstate = response.body.match(/name="javax.faces.ViewState"[^>]*value="([^"]+)"/)[1];
  checkingAccountButtonId = response.body.match(/SALDO C\/C<\/b><a id="([^"]+)"[^>]*frmSaldos/)[1];

  let form = {
    'frmSaldos': 'frmSaldos',
    'javax.faces.ViewState': viewstate,
    'javax.faces.source': checkingAccountButtonId,
    'javax.faces.partial.event': 'click',
    'javax.faces.partial.execute': checkingAccountButtonId + ' ' + checkingAccountButtonId,
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

const showSavingsAccountBalance = (response) => {
  savingsAccountButtonId = response.body.match(/INVESTIMENTOS<\/b><a id="([^"]+)"[^>]*frmSaldos/)[1];

  let form = {
    'frmSaldos': 'frmSaldos',
    'javax.faces.ViewState': viewstate,
    'javax.faces.source': savingsAccountButtonId,
    'javax.faces.partial.event': 'click',
    'javax.faces.partial.execute': savingsAccountButtonId + ' ' + savingsAccountButtonId,
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

const balance = (response) => {
  checkingAccountBalance = parseFloat(response.body.match(/<span class="spanValores">[^\/]*R\$ ([0-9,\.]+)<\/span>/)[1].replace('.', '').replace(',', '.'));
  savingsAccountBalance = parseFloat(response.body.match(/totalResultados">R\$ ([0-9,\.]+)/)[1].replace('.', '').replace(',', '.'));
  return checkingAccountBalance + savingsAccountBalance;
}

const redirectToSavingsDetails = (response) => {
  const options = {
    method: 'GET',
    uri: 'https://internetbanking.intermedium.com.br/investimento/extrato.jsf',
    jar: true,
    resolveWithFullResponse: true
  };
  return rp(options);
}

const selectSimpleDetails = (response) => {
  viewstate = response.body.match(/name="javax.faces.ViewState"[^>]*value="([^"]+)"/)[1];
  const detailsTypeSelectBoxId = response.body.match(/selectPadrao"><select id="([^"]+)"[^>]*panelGeralExtrato/)[1];

  let form = {
    'frm': 'frm',
    'javax.faces.ViewState': viewstate,
    'javax.faces.source': detailsTypeSelectBoxId,
    'javax.faces.partial.event': 'change',
    'javax.faces.partial.execute': detailsTypeSelectBoxId + ' ' + detailsTypeSelectBoxId,
    'javax.faces.partial.render': 'panelGeralExtrato',
    'javax.faces.behavior.event': 'valueChange',
    'javax.faces.partial.ajax': 'true'
  };
  form[detailsTypeSelectBoxId] = 'SIMPLIFICADO';

  const options = {
    method: 'POST',
    uri: 'https://internetbanking.intermedium.com.br/investimento/extrato.jsf',
    form: form,
    jar: true,
    resolveWithFullResponse: true
  };

  return rp(options);
}

const selectSimpleDetailsDate = (response) => {
  viewButtonId = response.body.match(/<input id="([^"]+)"[^>]*Visualizar/)[1];

  let form = {
    'javax.faces.partial.ajax': 'true',
    'javax.faces.source': 'dataFimSimplificado',
    'javax.faces.partial.execute': 'dataFimSimplificado',
    'javax.faces.behavior.event': 'dateSelect',
    'javax.faces.partial.event': 'dateSelect',
    'frm': 'frm',
    'javax.faces.ViewState': viewstate,
    'dataFimSimplificado_input': moment().format('DD/MM/YYYY')
  };

  const options = {
    method: 'POST',
    uri: 'https://internetbanking.intermedium.com.br/investimento/extrato.jsf',
    form: form,
    jar: true,
    resolveWithFullResponse: true
  };

  return rp(options);
}

const submitSimpleDetailsDate = (response) => {
  let form = {
    'frm': 'frm',
    'javax.faces.ViewState': viewstate,
    'dataFimSimplificado_input': moment().format('DD/MM/YYYY'),
    'javax.faces.source': viewButtonId,
    'javax.faces.partial.event': 'click',
    'javax.faces.partial.execute': viewButtonId + ' ' + viewButtonId,
    'javax.faces.partial.render': 'panelExtratoSimplificado',
    'javax.faces.behavior.event': 'action',
    'javax.faces.partial.ajax': 'true'
  };

  const options = {
    method: 'POST',
    uri: 'https://internetbanking.intermedium.com.br/investimento/extrato.jsf',
    form: form,
    jar: true,
    resolveWithFullResponse: true
  };

  return rp(options);
}

const parseSimpleDetails = (response) => {
  return __(response.body.match(/<tr[^>]+linhaUm(.*?)<\/tr/g))
    .map(line => {
      const regexMatches = line.match(new RegExp('<tr[^>]+>(<td([^>]+>){2}){2}<td[^>]+>([^<]+)[^>]+><td[^>]+>([^<]+)[^>]+><td[^>]+>([^<]+)[^>]+>(<td([^>]+>){2}){6}<td[^>]+>([^<]+)'));

      if (regexMatches && regexMatches.length > 8) {
        const maturity = moment(regexMatches[3], 'DD/MM/YYYY');
        const index = regexMatches[4];
        const type = regexMatches[5];
        const netValue = parseFloat(regexMatches[8].replace('.', '').replace(',', '.'));

        return {
          broker: NAME,
          name: type + ' ' + index,
          dailyLiquidity: maturity.isBefore(moment()),
          date: maturity,
          balance: netValue
        };
      }
    })
    .filter(__.identity)
    .concat({
      broker: NAME,
      name: 'Checking account',
      dailyLiquidity: true,
      balance: checkingAccountBalance
    })
    .value();
}

module.exports = {
  name: NAME,
  authorize: authorize,
  balance: () => {
    return Promise.resolve()
      .then(authorize)
      .then(showCheckingAccountBalance)
      .then(showSavingsAccountBalance)
      .then(balance);
  },
  details: () => {
    return Promise.resolve()
      .then(authorize)
      .then(showCheckingAccountBalance)
      .then(showSavingsAccountBalance)
      .then(balance)
      .then(redirectToSavingsDetails)
      .then(selectSimpleDetails)
      .then(selectSimpleDetailsDate)
      .then(submitSimpleDetailsDate)
      .then(parseSimpleDetails);
  }
}
