import WS from 'ws'
import pako from 'pako'
import { WebSocket } from '../event'
import logger from '../logger'

let socket: WS
const status = {
  allowClose: false
}

const init = () => {
  // @ts-ignore
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0
  socket = new WS('wss://m2.iirose.com:8778')

  socket.binaryType = 'arraybuffer'

  socket.onopen = () => {
    logger('WebSocket').info('WebSocket 连接成功')
    WebSocket.emit('connect')
  }

  socket.onclose = (event: { code: any; reason: any }) => {
    if (status.allowClose) return
    logger('WebSocket').warn('WebSocket 断开连接, code: ', event.code, ', reason: ', event.reason)
    WebSocket.emit('disconnect')

    try {
      socket.close()
    } catch (error) { }

    setTimeout(() => {
      logger('WebSocket').warn('正在重新连接 WebSocket')
      init()
    }, 3e3)
  }

  socket.on('error', (err: any) => {
    logger('WebSocket').error('WebSocket出现错误', err)
  })

  socket.onmessage = (event: any) => {
    // @ts-ignore
    const array = new Uint8Array(event.data)

    let message
    if (array[0] === 1) {
      message = pako.inflate(array.slice(1), {
        to: 'string'
      })
    } else {
      message = Buffer.from(array).toString('utf8')
    }

    WebSocket.emit('message', message)
  }
}

export default () => {
  init()
}

export const close = () => {
  status.allowClose = true
  socket.close()
  return true
}

export const send = (data: string): Promise<Error | null> => {
  return new Promise((resolve, reject) => {
    try {
      const deflatedData = pako.gzip(data)
      const deflatedArray = new Uint8Array(deflatedData.length + 1)
      deflatedArray[0] = 1
      deflatedArray.set(deflatedData, 1)
      socket.send(deflatedArray, (err: any) => {
        if (err) return resolve(err)
        resolve(null)
      })
    } catch (error) {
      reject(error)
    }
  })
}
