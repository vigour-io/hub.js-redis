const hub = require('hub.js')
const redis = require('redis')
const test = require('tape')

test('cleanup the bucket', t => {
  client = redis.createClient({
    url: process.env.COMPOSE_REDIS_URL
  })

  client.on('connect', () => {
    client.del('testBucket', () => {
      t.pass('bucket deleted')
      t.end()
    })
  })
})

test('connection', t => {
  const dataHub = hub({
    port: 9595,
    inject: require('../')
  })

  const client = hub({
    url: 'ws://localhost:9595',
    context: false
  })

  dataHub.set({
    redis: {
      bucket: 'testBucket',
      url: process.env.COMPOSE_REDIS_URL
    }
  })

  client.set({
    someData: { to: 'test' },
    someOther: 'data',
    andAnother: { pathOne: 2, pathTwo: 1 }
  })

  dataHub.get(['redis', 'connected'])
    .once(true)
    .then(() => {
      t.pass('dataHub is connected to redis')

      return new Promise(resolve => setTimeout(resolve, 200))
    })
    .then(() => {
      client.set(null)
      dataHub.set(null)

      t.pass('object written to redis')

      t.end()
    })
    .catch(console.error)
})

test('load from redis', t => {
  t.end()
})
