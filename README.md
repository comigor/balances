# balances

Your checking and savings accounts balances on banks and brokers.

It currently supports [OiWarren](https://oiwarren.com/), [Easynvest](https://www.easynvest.com.br/), [Intermedium](https://www.intermedium.com.br/) and [Monetus](https://monetus.com.br/).

## Install

```bash
$ npm install --global balances
```

## Usage

For authentication, you can either write you credentials on `~/.balances.conf.json` or pass a environment variable, eg:
```json
{
  "intermedium": {
    "password": "password",
    "login": "account_number-digit"
  },
  "oiwarren": {
    "password": "password",
    "login": "email"
  },
  "easynvest": {
    "password": "password",
    "login": "number"
  },
  "monetus": {
    "password": "password",
    "login": "email"
  }
}
```

```bash
$ oiwarren_email="hello@example.com" oiwarren_password="123456" balances oiwarren
```
