import config from '../../config'
import * as Ran from '../../lib/api'
import logger from '../../lib/logger'
import { getImg, getRealUrl, isPorn } from './utils'

Ran.Event.on('PublicMessage', async msg => {
  if (msg.username === config.account.username) return

  // 图片检测
  const imgs = getImg(msg.message)
  if (imgs) {
    logger('SCP-079').info(`${msg.username} 的消息中包含 ${imgs.length} 张图片，检测中...`)
    for (const url of imgs) {
      logger('SCP-079').info(`正在检查第 ${imgs.indexOf(url) + 1}/${imgs.length} 张图片...`)
      const realUrl = await getRealUrl(url)
      const rate = await isPorn(realUrl)
      logger('SCP-079').info(`第 ${imgs.indexOf(url) + 1}/${imgs.length} 张图片检测完成，rate: ${rate}`)
      if (rate > config.function.scp079.nsfw_rate) {
        // 是涩图
        Ran.method.admin.mute('all', msg.username, '30m', `[YakumoRan|${config.account.username}] 涩图自动封禁`)
        Ran.method.sendPublicMessage('\n'.repeat(200), '000')
        Ran.method.sendPrivateMessage(config.app.master_uid, [
          `用户  [*${msg.username}*]  (uid: [@${msg.uid}@] ) 刚刚发送了一条包含涩图的消息`,
          `rate: ${rate * 1e2}%`,
          '原始消息: ',
          msg.message
        ].join('\n'), config.app.color)
        break
      }
    }
  }

  // 赌博检测
  const gamblingRegex = /(压|押)(完|\d+)/gm
  if (gamblingRegex.test(msg.message) && !config.function.scp079.allowGambling) {
    logger('SCP-079').info(`检测到 ${msg.username} 赌博，已移除`)
    Ran.method.sendPrivateMessage(msg.uid, '[YakumoRan] 本房禁止赌博', config.app.color)
    Ran.method.admin.kick(msg.username)
  }

  // 管理命令
  if (msg.username === config.app.master) {
    const m = msg.message.trim()
    if (m.substr(0, 1) === '/') {
      const cmd = m.substr(1).split(' ')
      if (cmd[0] === 'mute' && msg.replyMessage) {
        // @ts-ignore
        const type: 'chat' | 'music' | 'all' = cmd[1] ? cmd[1] : 'all'
        const user = msg.replyMessage.pop()
        if (user) {
          Ran.method.admin.mute(type, user.username, '30m', cmd[2] ? cmd[2] : '?')
        }
      } else if (cmd[0] === 'kick' && msg.replyMessage) {
        const user = msg.replyMessage.pop()
        if (user) {
          Ran.method.admin.kick(user.username)
        }
      } else if (cmd[0] === 'ban' && msg.replyMessage) {
        const user = msg.replyMessage.pop()
        if (user) {
          Ran.method.admin.blackList(user.username, '1d', cmd[1] ? cmd[1] : '?')
        }
      } else if (cmd[0] === 'call') {
        Ran.method.admin.notice(cmd[1])
      }
    }
  }
})
