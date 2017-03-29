import redis from 'redis'

// in order to avoid short-circuit
var fromRedis = false

export default struct => {
  struct.set({
    redis: {
      type: 'struct',
      props: {
        bucket: true,
        url (struct, url) {
          const client = redis.createClient({ url })
          struct.set({ client })
          client.on('error', error => struct.get('root').emit('error', error))
          client.on('connect', () => struct.set({ connected: true }))
        },
        keyBlacklist: true,
        client: true
      },
      bucket: struct.get(['root', 'id']),
      keyBlacklist: [],
      connected: false,
      define: {
        save ({ context, path, stamp, val }) {
          const p = this

          p.get('connected')
            .once(true)
            .then(() => {
              const client = p.get('client')
              const bucket = p.get('bucket') || p.get(['root', 'id'])

              if (val === null) {
                client.hdel(
                  `${bucket}|${context}`, JSON.stringify(path),
                  error => {
                    if (error) {
                      p.get('root').emit('error', error)
                    }
                  }
                )
              } else {
                client.hset(
                  `${bucket}|${context}`, JSON.stringify(path), JSON.stringify([val, stamp]),
                  error => {
                    if (error) {
                      p.get('root').emit('error', error)
                    }
                  }
                )

                // From here on it's timeline feature
                path.unshift(stamp)

                client.hset(
                  `${bucket}|${context}|timeline`, JSON.stringify(path), JSON.stringify(val),
                  error => {
                    if (error) {
                      p.get('root').emit('error', error)
                    }
                  }
                )
              }
            })
        },
        load (context) {
          context = context || false

          const p = this
          const client = p.get('client')
          const bucket = p.get('bucket') || p.get(['root', 'id'])

          return p.get('connected')
            .once(true)
            .then(() => new Promise((resolve, reject) => {
              client.hgetall(`${bucket}|${context}`, (error, replies) => {
                if (error) {
                  reject(error)
                } else {
                  var result = []
                  for (let key in replies) {
                    let [val, stamp] = JSON.parse(replies[key])
                    result.push({ val, stamp, path: JSON.parse(key) })
                  }
                  fromRedis = true
                  resolve(result)
                  setTimeout(() => { fromRedis = false })
                }
              })
            }))
        }
      },
      on: {
        data: {
          remove (val, stamp, t) {
            if (val === null) {
              t.set({ connected: false })
              t.get('client').quit(error => {
                if (error) {
                  t.get('root').emit('error', error)
                }
              })
            }
          }
        }
      }
    },
    getContext (key, context, isNew, hub) {
      const retrieve = context(key)
      if (isNew) {
        hub.get('redis')
          .load(key)
          .then(loaded => {
            let i = loaded.length
            while (i--) {
              retrieve.get(loaded[i].path, loaded[i].val, loaded[i].stamp)
            }
          })
          .catch(error => {
            hub.emit('error', error)
          })
      }
      return retrieve
    }
  })

  // This is a deep listener
  // to save every change to redis
  struct.inherits.set({
    on: {
      data: {
        redis (val, stamp, t) {
          const p = t.get(['root', 'redis'])

          if (
            fromRedis ||
            t.val === void 0 ||
            !p ||
            ~p.keyBlacklist.indexOf(t.key) ||
            t.parent(p => p.key === 'clients') ||
            t.parent(p => p.key === 'redis')
          ) {
            return
          }

          const context = t.root(true).contextKey || false
          const path = t.path()

          if (typeof t.val === 'object' && t.val.inherits) {
            val = t.val.path()
            val.unshift('@', 'root')
          }

          p.save({ context, path, stamp: t.stamp, val })
        }
      }
    }
  })
}
