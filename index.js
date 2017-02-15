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
const Table = require('easy-table');
const ProgressPromise = require('progress-promise');
const modules = require('require-all')({
  dirname: __dirname + '/modules'
});

const printProgress = (proportion) => {
  const width = 46;
  const loaded = Math.ceil(width * proportion);
  const notLoaded = width - loaded;

  if (proportion == 1) {
    process.stdout.write('\r' + __.repeat(' ', width + 2) + '\r');
    return;
  }

  const output = '\r[' + __.repeat('-', loaded) + __.repeat(' ', notLoaded) + ']';
  process.stdout.write(output);
}

const printBalance = (brokers) => {
  printProgress(0);
  ProgressPromise.all(brokers.map(m => modules[m].balance()))
    .progress(progress => printProgress(progress.proportion))
    .then(__.sum)
    .then(balance => {
      return balance.toFixed(2);
    })
    .then(console.log);
}

const printDetails = (brokers, rex) => {
  printProgress(0);
  ProgressPromise.all(brokers.map(m => modules[m].details()))
    .progress(progress => printProgress(progress.proportion))
    .then(__.flatten)
    .then(p => __.orderBy(p, ['dailyLiquidity', 'date', 'balance'], ['desc', 'asc', 'asc']))
    .then(portfolio => portfolio.filter(p => new RegExp(rex, 'gi').test(p.name)))
    .then(portfolio => {
      return portfolio.map(p => {
        p.date = (p.dailyLiquidity ? '-' : p.date.format('MMM/YYYY'));
        return __.omit(p, 'dailyLiquidity');
      })
    })
    .then(allDetails => {
      return Table.print(allDetails, {
        balance: {printer: Table.number(2)}
      }, (t) => t.total('balance', {
        printer: (val, width) => {
          return val.toFixed(2);
        }
      }).toString());
    })
    .then(console.log);
}

const details = (brokers) => {
  return Promise.all(brokers.map(m => modules[m].details()))
    .then(__.flatten)
    .then(p => __.orderBy(p, ['dailyLiquidity', 'date', 'balance'], ['desc', 'asc', 'asc']));
}

module.exports = {
  printBalance: printBalance,
  printDetails: printDetails,
  details: details
}
