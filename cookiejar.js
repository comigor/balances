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

let cookies = {};

module.exports = {
  mergeCookies: (response) => {
    const cookieHeaders = ((response.headers || {})._headers || {})['set-cookie'] || [];
    cookieHeaders
      .map(cookie => cookie.split(';')[0])
      .forEach(cookie => {
        const c = cookie.split('=');
        cookies[c[0]] = c[1];
      });
    return response;
  },

  cookieHeader: () => {
    return __.toPairs(cookies).map(c => c.join('=')).join('; ');
  }
}
