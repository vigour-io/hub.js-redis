import redis from 'redis'
import bstamp from 'stamp'

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
        client: true
      },
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

        }
      }
    }
  })
}
