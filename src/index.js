import redis from 'redis'
import bstamp from 'stamp'

export default struct => {
  struct.set({
    redis: {
      props: {
        url: (s, u) => {
          s.set({ client: redis.createClient({ url: u }) })
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
