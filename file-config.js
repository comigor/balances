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

nconf.env('_').file({file: process.env.HOME + '/.balances.conf.json'});

module.exports = {
  get: (path) => Promise.resolve(nconf.get(path)),
  getMultiple: function() {
    return Promise.resolve(Array.prototype.slice.call(arguments).reduce((memo, path) => {
      memo[path] = nconf.get(path);
      return memo;
    }, {}))
  },
  set: (path, value) => {
    nconf.set(path, value);
    nconf.save();
  }
};
