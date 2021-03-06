import {ipcRenderer} from 'electron'
import _ from 'lodash'
import {SYNC_PLATFORMS} from './const'

function registerEvent(name, details) {
  return function(args) {
    if (typeof args !== 'object') {
      return Promise.reject(new Error('参数必须传对象'))
    }

    console.log(`${details} :`, args)

    return new Promise(function(resolve, reject) {
      ipcRenderer.once(`${name}-finish`, function(e, arg) {
        resolve(arg)
      })
      ipcRenderer.once(`${name}-error`, function(e, arg) {
        reject(arg)
      })
      ipcRenderer.send(`${name}-start`, args)
    })
  }
}

/**
 * NOTE
 * 这里需要针对每个平台绑定一次事件
 * electron ipcMain的事件机制决定
 * 如果共用一个事件，一个请求失败其它都失败
 */
export let SyncFactory = _.zipObject(SYNC_PLATFORMS, SYNC_PLATFORMS.map(key => {
  return registerEvent(`sync-post-${key}`, `Syncing post for ${key}`)
}))

export let checkIdentity = registerEvent('check-identity', 'Checking identity ...')

/**
 * 获取站点cookie
 * 主站和子站的cookie需要同时获取
 *
 * NOTE electron session.cookies.get({}) filter不起作用
 */
export function parseWebviewCookiesByDomain(session, domain) {
  return new Promise(function(resolve, reject) {
    session.cookies.get({}, function(error, cookies) {
      if (error) {
        reject(error)
        return
      }

      let cookie = cookies.filter(item => {
        return item.domain.indexOf(domain) > -1
      }).map(function(item) {
        return `${item.name}=${item.value};`
      })

      resolve(cookie.join(' '))
    })
  })
}

function removeCookie(session, url, name) {
  return new Promise(function(resolve, reject) {
    session.cookies.remove(url, name, (err, result) => {
      if (err) {
        console.error(err)
        reject(new Error('注销失败'))
        return
      }

      resolve()
    })
  })
}

export function destroySiteSession(session, url, name) {
  return Promise.all(name.split(',').map(item => {
    return removeCookie(session, url, item)
  }))
}
