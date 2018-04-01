import request from 'request';
import _ from 'lodash';

export const getToken = (item) => {

  const {username, password, env='qa'} = item;
  let host = getURL_login(item);

  let url = `${host}/auth/realms/hotschedules/protocol/openid-connect/token`
    const form = {
      username,
      password: password || username,
      grant_type: 'password',
      client_id: 'admin-cli'
    };

  const fetchParams = {
    method: 'POST',
    url,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    form,
  }

  return new Promise((resolve, reject) => {
    request(fetchParams, (err, res, body) => {
      console.log('bdbdsbasda', JSON.parse(body))
      if(!err) {
        resolve(JSON.parse(body));
      }
      else {
        reject(err)
      }
    })
  })
}

export const getNamespace = async (item) => {
  const {token} = item;
  let host = getURL_api(item);

  let url = `${host}/api-docs`
  const cookie = request.cookie(`ID_TOKEN=${token}`);
  
  const fetchParams = {
    url,
    headers: {
      'Cookie': cookie.toString(),
      'Accept': 'application/json',
    },
  }

  return new Promise((resolve, reject) => {
    request(fetchParams, (err, res, body) => {
      if(!err) {
        resolve(JSON.parse(body));
      }
      else {
        reject(err)
      }
    })
  })
}

export const getURL_authz = ({env}) => {
  switch(env) {
    case 'qa':
    case 'dev':
    case 'stg':
      return `https://authz.bodhi-${env}.io`
    case 'prd':
    default:
      return;
  }    
}

export const getURL_apps = ({env, fe}) => {
  if(fe) {
    if(['localhost', 'local'].indexOf(_.trim(fe)) >= 0) {
      return 'http://localhost:4000'
    }
    else {
      return fe
    }
  }
  switch(env) {
    case 'qa':
    case 'dev':
    case 'stg':
      return `https://apps.bodhi-${env}.io`
    case 'prd':
    default:
      return;
  }    
}

export const getURL_api = ({env}) => {
  switch(env) {
    case 'qa':
    case 'dev':
    case 'stg':
      return `https://api.bodhi-${env}.io`
    case 'prd':
    default:
      return;
  }    
}

export const getURL_inventory = ({env}) => {
  switch(env) {
    case 'qa':
    case 'dev':
    case 'stg':
      return `https://inventory.bodhi-${env}.io`
    case 'prd':
    default:
      return;
  }    
}

export const getURL_login = ({env}) => {
  switch(env) {
    case 'qa':
    case 'dev':
    case 'stg':
      return `https://login.bodhi-${env}.io`
    case 'prd':
      return `https://login.hotschedules.io`
    default:
      return;
  }    
}
