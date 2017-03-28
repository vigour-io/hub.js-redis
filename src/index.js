import redis from 'redis'

// in order to avoid short-circuit
var fromRedis = false

export default struct => {
  struct.set({
    redis: {
      props: {
        url: (struct, url) => {
          const client = redis.createClient({ url })
          struct.set({ client })
          client.on('error', error => struct.get('root').emit('error', error))
          client.on('connect', () => struct.set({ connected: true }))
        },
        keyBlacklist: true,
        client: true
      },
      keyBlacklist: [],
      connected: false,
      define: {
        load: (context, path) => {
          context = context || false
          path = path || []
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
    }
  })
  struct.inherits.set({
    on: {
      data: {
        redis (val, stamp, t) {
          const p = t.get(['root', 'redis'])

          if (!fromRedis || !p || ~p.keyBlacklist.indexOf(t.key)) {
            return
          }

          const context = t.root(true).contextKey || false

          if (val === null) {

          } else if (typeof t.val === 'object' && t.val.inherits) {

          } else {
            val = t.val.path()
          }
        }
      }
    }
  })
}
