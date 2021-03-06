'use strict'

const Hemera = require('../'),
  nsc = require('./support/nats_server_control'),
  Code = require('code'),
  Sinon = require('sinon'),
  Async = require("async")

const expect = Code.expect

process.setMaxListeners(0);

describe('Basic', function () {

  var PORT = 6242
  var flags = ['--user', 'derek', '--pass', 'foobar']
  var authUrl = 'nats://derek:foobar@localhost:' + PORT
  var noAuthUrl = 'nats://localhost:' + PORT
  var server

  // Start up our own nats-server
  before(function (done) {
    server = nsc.start_server(PORT, flags, done)
  })

  // Shutdown our server after we are done
  after(function () {
    server.kill()
  })

  it('Should be able to add a handler and act it', function (done) {

    const nats = require('nats').connect(authUrl)

    const hemera = new Hemera(nats)

    hemera.ready(() => {

      hemera.add({
        topic: 'math',
        cmd: 'add'
      }, (resp, cb) => {

        cb(null, {
          result: resp.a + resp.b
        })
      })

      hemera.add({
        topic: 'math',
        cmd: 'multiply'
      }, (resp, cb) => {

        cb(null, {
          result: resp.a * resp.b
        })
      })

      hemera.act({
        topic: 'math',
        cmd: 'add',
        a: 1,
        b: 2
      }, (err, resp) => {

        expect(err).not.to.be.exists()
        expect(resp.result).to.be.equals(3)

        hemera.act({
          topic: 'math',
          cmd: 'multiply',
          a: resp.result,
          b: 2
        }, (err, resp) => {

          expect(err).not.to.be.exists()
          expect(resp.result).to.be.equals(6)

          hemera.close()
          done()
        })
      })

    })

  })

  it('Should be able to act without a callback', function (done) {

    const nats = require('nats').connect(authUrl)

    const hemera = new Hemera(nats)

    hemera.ready(() => {

      hemera.add({
        topic: 'email',
        cmd: 'send'
      }, (resp, cb) => {

        cb()

      })

      hemera.act({
        topic: 'email',
        cmd: 'send',
        email: 'foobar@gmail.com',
        msg: 'Hi!'
      })

      hemera.close()
      done()

    })

  })

  it('Should be able to get list of all patterns', function (done) {

    const nats = require('nats').connect(authUrl)

    const hemera = new Hemera(nats)

    hemera.ready(() => {

      hemera.add({
        topic: 'math',
        cmd: 'send'
      }, (resp, cb) => {

      })

      let result = hemera.list()

      expect(result).to.be.an.array()

      hemera.close()
      done()

    })

  })

  it('Callback must be from type function', function (done) {

    const nats = require('nats').connect(authUrl)

    const hemera = new Hemera(nats)

    hemera.ready(() => {

      try {

        hemera.add({
          topic: 'math',
          cmd: 'send'
        }, 'no function')

      } catch (err) {

        expect(err.name).to.be.equals('HemeraError')
        expect(err.message).to.be.equals('Missing implementation')
        hemera.close()
        done()

      }

    })

  })

  it('Topic is required in a add', function (done) {

    const nats = require('nats').connect(authUrl)

    const hemera = new Hemera(nats)

    hemera.ready(() => {

      try {

        hemera.add({
          cmd: 'send'
        }, (resp, cb) => {
          cb()

        })

      } catch (err) {

        expect(err.name).to.be.equals('HemeraError')
        expect(err.message).to.be.equals('No topic to subscribe')
        hemera.close()
        done()

      }

    })

  })

  it('Should throw an error by duplicate patterns', function (done) {

    const nats = require('nats').connect(authUrl)

    const hemera = new Hemera(nats)

    hemera.ready(() => {

      try {

        hemera.add({
          topic: 'math',
          cmd: 'send'
        }, (resp, cb) => {
          cb()

        })

        hemera.add({
          topic: 'math',
          cmd: 'send'
        }, (resp, cb) => {
          cb()

        })

      } catch (err) {

        expect(err.name).to.be.equals('HemeraError')
        expect(err.message).to.be.equals('Pattern is already in use')
        hemera.close()
        done()

      }

    })

  })

  it('Topic is required in a act', function (done) {

    const nats = require('nats').connect(authUrl)

    const hemera = new Hemera(nats)

    hemera.ready(() => {

      try {

        hemera.act({
          cmd: 'send'
        }, (resp, cb) => {


        })

      } catch (err) {

        expect(err.name).to.be.equals('HemeraError')
        expect(err.message).to.be.equals('No topic to request')
        hemera.close()
        done()

      }

    })

  })

  it('Should be able to call a handler by different patterns', function (done) {

    const nats = require('nats').connect(authUrl)

    const hemera = new Hemera(nats)

    hemera.ready(() => {

      hemera.add({
        topic: 'math',
        cmd: 'add'
      }, (resp, cb) => {

        cb(null, {
          result: resp.a + resp.b
        })
      })

      hemera.add({
        topic: 'math',
        cmd: 'sub'
      }, (resp, cb) => {

        cb(null, {
          result: resp.a - resp.b
        })
      })

      hemera.act({
        topic: 'math',
        cmd: 'add',
        a: 1,
        b: 2
      }, (err, resp) => {

        expect(err).not.to.be.exists()
        expect(resp.result).to.be.equals(3)

        hemera.act({
          topic: 'math',
          cmd: 'sub',
          a: 2,
          b: 2
        }, (err, resp) => {

          expect(err).not.to.be.exists()
          expect(resp.result).to.be.equals(0)
          hemera.close()
          done()
        })
      })

    })

  })

})


describe('Timeouts', function () {

  var PORT = 6242
  var flags = ['--user', 'derek', '--pass', 'foobar']
  var authUrl = 'nats://derek:foobar@localhost:' + PORT
  var noAuthUrl = 'nats://localhost:' + PORT
  var server

  // Start up our own nats-server
  before(function (done) {
    server = nsc.start_server(PORT, flags, done)
  })

  // Shutdown our server after we are done
  after(function () {
    server.kill()
  })

  it('Should throw timeout error when callback is not fired', function (done) {

    const nats = require('nats').connect(authUrl)

    const hemera = new Hemera(nats, {
      crashOnFatal: false,
      timeout: 150
    })

    hemera.ready(() => {

      hemera.add({
        topic: 'email',
        cmd: 'send'
      }, (resp, cb) => {

      })

      hemera.act({
        topic: 'email',
        cmd: 'send',
        email: 'foobar@gmail.com',
        msg: 'Hi!'
      }, (err, resp) => {

        setTimeout(() => {

          expect(err).to.be.exists()
          expect(resp).not.to.be.exists()
          expect(err.name).to.be.equals('TimeoutError')
          expect(err.message).to.be.equals('Timeout')
          hemera.close()
          done()

        }, 200)


      })

    })

  })

  it('Should throw timeout error when pattern is not defined on the network', function (done) {

    const nats = require('nats').connect(authUrl)

    const hemera = new Hemera(nats, {
      timeout: 20
    })

    hemera.ready(() => {

      hemera.act({
        topic: 'math',
        cmd: 'add',
        a: 1,
        b: 2
      }, (err, resp) => {

        expect(err).to.be.exists()
        expect(resp).not.to.be.exists()
        expect(err.name).to.be.equals('TimeoutError')
        expect(err.message).to.be.equals('Timeout')
        hemera.close()
        done()
      })

    })

  })

})

describe('Error handling', function () {

  var PORT = 6242
  var flags = ['--user', 'derek', '--pass', 'foobar']
  var authUrl = 'nats://derek:foobar@localhost:' + PORT
  var noAuthUrl = 'nats://localhost:' + PORT
  var server

  // Start up our own nats-server
  before(function (done) {
    server = nsc.start_server(PORT, flags, done)
  })

  // Shutdown our server after we are done
  after(function () {
    server.kill()
  })

  it('Should be able to serialize and deserialize an error back to the callee', function (done) {

    const nats = require('nats').connect(authUrl)

    const hemera = new Hemera(nats, {
      crashOnFatal: false
    })

    hemera.ready(() => {

      hemera.add({
        topic: 'email',
        cmd: 'send'
      }, (resp, cb) => {

        cb(new Error('Uups'))
      })

      hemera.act({
        topic: 'email',
        cmd: 'send',
        email: 'foobar@gmail.com',
        msg: 'Hi!'
      }, (err, resp) => {

        expect(err).to.be.exists()
        expect(err.name).to.be.equals('BusinessError')
        expect(err.message).to.be.equals('Bad implementation')
        expect(err.cause.name).to.be.equals('Error')
        expect(err.cause.message).to.be.equals('Uups')
        expect(err.ownStack).to.be.exists()
        hemera.close()
        done()


      })

    })

  })

  it('Should be able to handle parsing errors', function (done) {

    const nats = require('nats').connect(authUrl)

    const hemera = new Hemera(nats, {
      crashOnFatal: false
    })

    var stub = Sinon.stub(hemera, "parseJSON")

    stub.returns({
      error: new Error('TEST')
    })

    hemera.ready(() => {



      hemera.add({
        topic: 'email',
        cmd: 'send'
      }, (resp, cb) => {

        cb()
      })

      hemera.act({
        topic: 'email',
        cmd: 'send',
        email: 'foobar@gmail.com',
        msg: 'Hi!'
      }, (err, resp) => {

        expect(err).to.be.exists()
        expect(err.name).to.be.equals('HemeraParseError')
        expect(err.message).to.be.equals('Invalid payload')

        stub.restore()
        hemera.close()
        done()


      })

    })

  })

  it('Should be able to handle response parsing error', function (done) {

    const nats = require('nats').connect(authUrl)

    const hemera = new Hemera(nats, {
      crashOnFatal: false
    })

    hemera.ready(() => {

      hemera.add({
        topic: 'email',
        cmd: 'send'
      }, (resp, cb) => {

        cb()
      })

      var stub = Sinon.stub(hemera, "parseJSON")

      stub.onCall(1)

      stub.returns({
        error: new Error('TEST')
      })

      hemera.act({
        topic: 'email',
        cmd: 'send',
        email: 'foobar@gmail.com',
        msg: 'Hi!'
      }, (err, resp) => {

        expect(err).to.be.exists()
        expect(err.name).to.be.equals('HemeraParseError')
        expect(err.message).to.be.equals('Invalid payload')

        stub.restore()
        hemera.close()
        done()


      })

    })

  })

  it('Should be able to handle business errors', function (done) {

    const nats = require('nats').connect(authUrl)

    const hemera = new Hemera(nats, {
      crashOnFatal: false
    })

    hemera.ready(() => {

      hemera.add({
        topic: 'email',
        cmd: 'send'
      }, (resp, cb) => {

        throw new Error('Shit!')
      })

      hemera.act({
        topic: 'email',
        cmd: 'send',
        email: 'foobar@gmail.com',
        msg: 'Hi!'
      }, (err, resp) => {

        expect(err).to.be.exists()
        expect(err.name).to.be.equals('ImplementationError')
        expect(err.message).to.be.equals('Bad implementation')
        expect(err.cause.name).to.be.equals('Error')
        expect(err.cause.message).to.be.equals('Shit!')
        expect(err.ownStack).to.be.exists()
        hemera.close()
        done()


      })

    })

  })

  it('Payload valdiation error', function (done) {

    const nats = require('nats').connect(authUrl)

    const hemera = new Hemera(nats, {
      crashOnFatal: false
    })

    hemera.ready(() => {

      hemera.add({
        topic: 'email',
        cmd: 'send',
        a: {
          type$: 'number'
        }
      }, (resp, cb) => {

        throw new Error('Shit!')
      })

      hemera.act({
        topic: 'email',
        cmd: 'send',
        a: '1'
      }, (err, resp) => {

        expect(err).to.be.exists()
        expect(err.name).to.be.equals('PayloadValidationError')
        expect(err.message).to.be.equals('Invalid payload')
        expect(err.cause.name).to.be.equals('Error')
        expect(err.cause.message).to.be.equals('The value "1" is not of type \'number\' (parent: a).')
        hemera.close()
        done()


      })

    })

  })

  it('Should crash on fatal', function (done) {

    const nats = require('nats').connect(authUrl)

    const hemera = new Hemera(nats, {
      crashOnFatal: true,
      timeout: 10000
    })

    var stub = Sinon.stub(hemera, "fatal")

    stub.onCall(1)

    stub.returns(true)

    hemera.ready(() => {

      hemera.add({
        topic: 'email',
        cmd: 'send'
      }, (resp, cb) => {

        throw new Error('Shit!')
      })

      hemera.act({
        topic: 'email',
        cmd: 'send',
        email: 'foobar@gmail.com',
        msg: 'Hi!'
      }, (err, resp) => {

        //Fatal Error will be throw after the server proceed the msg
        setTimeout(() => {
          expect(stub.called).to.be.equals(true)
          stub.restore()
          hemera.close()
          done()
        }, 20)


      })

    })

  })

  it('Should crash when an unexpected error thrown during timeout issue', function (done) {

    const nats = require('nats').connect(authUrl)

    const hemera = new Hemera(nats, {
      crashOnFatal: true,
      timeout: 20
    })

    var stub = Sinon.stub(hemera, "fatal")

    stub.onCall(1)

    stub.returns(true)

    hemera.ready(() => {


      hemera.act({
        topic: 'email',
        cmd: 'send',
        email: 'foobar@gmail.com',
        msg: 'Hi!'
      }, (err, resp) => {

        //Fatal Error will be throw after the server proceed the msg
        setTimeout(() => {
          expect(stub.called).to.be.equals(true)
          stub.restore()
          hemera.close()
          done()
        }, 500)

        throw (new Error('Test'))


      })

    })

  })

  it('Should crash on unhandled business errors', function (done) {

    const nats = require('nats').connect(authUrl)

    const hemera = new Hemera(nats, {
      crashOnFatal: false
    })

    hemera.ready(() => {

      hemera.add({
        topic: 'email',
        cmd: 'send'
      }, (resp, cb) => {

        throw new Error('Shit!')
      })

      hemera.act({
        topic: 'email',
        cmd: 'send',
        email: 'foobar@gmail.com',
        msg: 'Hi!'
      }, (err, resp) => {

        expect(err).to.be.exists()
        expect(err.name).to.be.equals('ImplementationError')
        expect(err.message).to.be.equals('Bad implementation')
        expect(err.cause.name).to.be.equals('Error')
        expect(err.cause.message).to.be.equals('Shit!')
        expect(err.ownStack).to.be.exists()
        hemera.close()
        done()


      })

    })

  })

  it('Pattern not found', function (done) {

    const nats = require('nats').connect(authUrl)

    const hemera = new Hemera(nats, {
      crashOnFatal: false
    })

    hemera.ready(() => {

      hemera.add({
        topic: 'email',
        cmd: 'send'
      }, (resp, cb) => {

        cb()
      })

      hemera.act({
        topic: 'email',
        test: 'senddedede',
      }, (err, resp) => {

        expect(err).to.be.exists()
        expect(err.name).to.be.equals('PatternNotFound')
        expect(err.message).to.be.equals('No handler found for this pattern')
        hemera.close()
        done()


      })

    })

  })

  it('Should crash when an expected error happens in the ACT handler', function (done) {

    const nats = require('nats').connect(authUrl)

    const hemera = new Hemera(nats, {
      crashOnFatal: true,
      timeout: 10000
    })

    var stub = Sinon.stub(hemera, "fatal")

    stub.onCall(1)

    stub.returns(true)

    hemera.ready(() => {

      hemera.add({
        topic: 'email',
        cmd: 'send'
      }, (resp, cb) => {

        cb(true)
      })

      hemera.act({
        topic: 'email',
        cmd: 'send',
        email: 'foobar@gmail.com',
        msg: 'Hi!'
      }, (err, resp) => {

        //Fatal Error will be throw after the server proceed the msg
        setTimeout(() => {
          expect(stub.called).to.be.equals(true)
          stub.restore()
          hemera.close()
          done()
        }, 200)

        throw (new Error('Test'))


      })

    })

  })

})


describe('Plugin interface', function () {

  var PORT = 6242
  var flags = ['--user', 'derek', '--pass', 'foobar']
  var authUrl = 'nats://derek:foobar@localhost:' + PORT
  var noAuthUrl = 'nats://localhost:' + PORT
  var server

  // Start up our own nats-server
  before(function (done) {
    server = nsc.start_server(PORT, flags, done)
  })

  // Shutdown our server after we are done
  after(function () {
    server.kill()
  })

  it('Should be able to use a plugin', function (done) {

    const nats = require('nats').connect(authUrl)

    const hemera = new Hemera(nats)

    hemera.ready(() => {

      let pluginOptions = {
        a: '1'
      }

      //Plugin
      let plugin = function (options) {

        let hemera = this

        expect(options.a).to.be.equals('1')

        hemera.add({
          topic: 'math',
          cmd: 'add'
        }, (resp, cb) => {

          cb(null, {
            result: resp.a + resp.b
          })
        })

      }

      hemera.use({
        plugin: plugin,
        attributes: {
          name: 'myPlugin'
        },
        options: pluginOptions
      })

      hemera.act({
        topic: 'math',
        cmd: 'add',
        a: 1,
        b: 2
      }, (err, resp) => {

        expect(err).to.be.not.exists()
        expect(resp).not.to.be.equals(3)
        hemera.close()
        done()
      })

    })

  })

  it('Should be able to check duplicate registered plugins', function (done) {

    const nats = require('nats').connect(authUrl)

    const hemera = new Hemera(nats)

    hemera.ready(() => {

      let pluginOptions = {
        a: '1'
      }

      //Plugin
      let plugin = function (options) {

        let hemera = this

        hemera.add({
          topic: 'math',
          cmd: 'add'
        }, (resp, cb) => {

          cb(null, {
            result: resp.a + resp.b
          })
        })

      }

      //Plugin
      let plugin2 = function (options) {

        let hemera = this

        hemera.add({
          topic: 'math',
          cmd: 'sub'
        }, (resp, cb) => {

          cb(null, {
            result: resp.a + resp.b
          })
        })

      }

      try {

        hemera.use({
          plugin: plugin,
          attributes: {
            name: 'myPlugin'
          },
          options: pluginOptions
        })
        hemera.use({
          plugin: plugin2,
          attributes: {
            name: 'myPlugin'
          },
          options: pluginOptions
        })

      } catch (e) {

        expect(e.name).to.be.equals('HemeraError')
        expect(e.message).to.be.equals('Plugin is already registered')
        hemera.close()
        done()
      }

    })

  })

})

describe('Logging interface', function () {

  var PORT = 6242
  var flags = ['--user', 'derek', '--pass', 'foobar']
  var authUrl = 'nats://derek:foobar@localhost:' + PORT
  var noAuthUrl = 'nats://localhost:' + PORT
  var server

  // Start up our own nats-server
  before(function (done) {
    server = nsc.start_server(PORT, flags, done)
  })

  // Shutdown our server after we are done
  after(function () {
    server.kill()
  })

  it('Should be able to log', function (done) {

    const nats = require('nats').connect(authUrl)

    const hemera = new Hemera(nats)

    var logSpy = Sinon.spy(hemera, "log")

    hemera.ready(() => {

      hemera.add({
        topic: 'math',
        cmd: 'add'
      }, (resp, cb) => {

        cb(null, {
          result: resp.a + resp.b
        })
      })

      hemera.act({
        topic: 'math',
        cmd: 'add',
        a: 1,
        b: 2
      }, (err, resp) => {

        expect(err).to.be.not.exists()
        expect(resp).not.to.be.equals(3)
        expect(logSpy.called).to.be.equals(true)
        hemera.close()
        done()
      })

    })

  })

})

describe('Metadata', function () {

  var PORT = 6242
  var flags = ['--user', 'derek', '--pass', 'foobar']
  var authUrl = 'nats://derek:foobar@localhost:' + PORT
  var noAuthUrl = 'nats://localhost:' + PORT
  var server

  // Start up our own nats-server
  before(function (done) {
    server = nsc.start_server(PORT, flags, done)
  })

  // Shutdown our server after we are done
  after(function () {
    server.kill()
  })

  it('Should be able to pass metadata', function (done) {

    const nats = require('nats').connect(authUrl)

    const hemera = new Hemera(nats)

    hemera.ready(() => {

      hemera.add({
        topic: 'math',
        cmd: 'add'
      }, function (resp, cb) {

        expect(resp.meta$).to.be.equals('test')

        cb(null, {
          result: resp.a + resp.b
        })
      })

      hemera.act({
        topic: 'math',
        cmd: 'add',
        a: 1,
        b: 2,
        meta$: 'test'
      }, function (err, resp) {

        expect(err).to.be.not.exists()
        expect(resp).not.to.be.equals(3)

        this.act({
          topic: 'math',
          cmd: 'add',
          a: 1,
          b: 2
        }, function (err, resp) {

          expect(err).to.be.not.exists()
          expect(resp).not.to.be.equals(3)
          hemera.close()
          done()
        })
      })

    })

  })

})

describe('Context', function () {

  var PORT = 6242
  var flags = ['--user', 'derek', '--pass', 'foobar']
  var authUrl = 'nats://derek:foobar@localhost:' + PORT
  var noAuthUrl = 'nats://localhost:' + PORT
  var server

  // Start up our own nats-server
  before(function (done) {
    server = nsc.start_server(PORT, flags, done)
  })

  // Shutdown our server after we are done
  after(function () {
    server.kill()
  })

  it('Should be able to create a context', function (done) {

    const nats = require('nats').connect(authUrl)

    const hemera = new Hemera(nats)

    hemera.ready(() => {

      hemera.add({
        topic: 'math',
        cmd: 'add'
      }, function (resp, cb) {

        cb(null, {
          result: resp.a + resp.b
        })
      })

      hemera.act({
        topic: 'math',
        cmd: 'add',
        a: 1,
        b: 2,
        context$: 'test'
      }, function (err, resp) {

        expect(this.context$).to.be.equals('test')
        expect(err).to.be.not.exists()
        expect(resp).not.to.be.equals(3)

        this.act({
          topic: 'math',
          cmd: 'add',
          a: 1,
          b: 2
        }, function (err, resp) {

          expect(this.context$).to.be.equals('test')
          expect(err).to.be.not.exists()
          expect(resp).not.to.be.equals(3)
          hemera.close()
          done()
        })
      })

    })

  })

})

describe('Memory leak test', function () {

  var PORT = 6242
  var flags = ['--user', 'derek', '--pass', 'foobar']
  var authUrl = 'nats://derek:foobar@localhost:' + PORT
  var noAuthUrl = 'nats://localhost:' + PORT
  var server

  // Start up our own nats-server
  before(function (done) {
    server = nsc.start_server(PORT, flags, done)
  })

  // Shutdown our server after we are done
  after(function () {
    server.kill()
  })

  it('Test memory leak', function (done) {

    const Memwatch = require('memwatch-next')

    var hd = new Memwatch.HeapDiff()

    const nats = require('nats').connect(authUrl)

    const hemera = new Hemera(nats)

    hemera.ready(() => {


      Memwatch.on('leak', function (info) {

        consoe.log(info)
        throw new Error('memory leak')

      })

      var doAdd = function (id) {

        hemera.add({
          topic: 'math',
          cmd: 'add' + id
        }, (resp, cb) => {

          cb(null, {
            result: resp.a + resp.b
          })
        })

      }

      var doAct = function (id, callback) {
        hemera.act({
          topic: 'math',
          cmd: 'add' + id,
          a: 1,
          b: 2
        }, (err, resp) => {

          callback(err, resp)
        })
      }

      for (var index = 0; index < 1000; index++) {
        doAdd(index)

      }

      Async.times(1000, function (n, next) {
        doAct(n, function (err, result) {
          next(err, result)
        })
      }, function (err, results) {

        var diff = hd.end()
        hemera.close()
        done()
      })

    })

  })

})