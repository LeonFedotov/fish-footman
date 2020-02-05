const nock = require('nock')
const myProbotApp = require('..')
const { statusName: context, statusDescription: description } = require('../src/config')
const { createProbot } = require('probot')

const fixtures = {
  getIssues: require('./fixtures/gql-get-issues'),
  noIssues: require('./fixtures/gql-get-no-issues'),
  issueCreated: require('./fixtures/fishy-issue-created'),
  issueEdited: require('./fixtures/fishy-issue-edited'),
  issueClosed: require('./fixtures/fishy-issue-closed'),

  getPrs: require('./fixtures/gql-get-prs'),
  prCreated: require('./fixtures/fishy-pr-created'),
  prUpdated: require('./fixtures/no-longer-fishy-pr'),
  fixedprFiles: require('./fixtures/fixed-pr-files')
}

const stateMock = (state) => ({ state, context, description })


describe('fish footman', () => {
  let probot

  beforeEach(() => {
    nock.disableNetConnect()
    probot = createProbot({ id: 1, cert: 'test', githubToken: 'test' })
    probot.load(myProbotApp)
  })

  afterEach(() => {
    nock.cleanAll()
    nock.enableNetConnect()
  })

  test('when a fishy issue is created prs that touch fishy paths with be blocked', (done) => {
    probot.receive({ name: 'issues', payload: fixtures.issueCreated })

    nock('https://api.github.com:443')
      .post('/graphql')
      .reply(200, fixtures.getIssues)
      .post('/graphql')
      .reply(200, fixtures.getPrs)

      .post(
        '/repos/LeonFedotov/fish-footman/statuses/e4e337875aef068f4f3cbe8f1831fcb1781b8c6b',
        (body) => {
          expect(body).toMatchObject(stateMock('failure'))
          done()
          return true
        }
      )
      .reply(200, {})


  })

  test('when a pr is created with restricted paths bot will block it', (done) => {
    nock('https://api.github.com:443')
      .post('/graphql')
      .reply(200, fixtures.getIssues)
      .post('/graphql')
      .reply(200, fixtures.getPrs)

      .post(
        '/repos/LeonFedotov/fish-footman/statuses/e4e337875aef068f4f3cbe8f1831fcb1781b8c6b',
        (body) => {
          expect(body).toMatchObject(stateMock('failure'))
          done()
          return true
        }
      )
      .reply(200, {})
    probot.receive({ name: 'pull_request', payload: fixtures.prCreated })
  })

  test('when a pr is changed to not touch restricted paths pr is unlocked', (done) => {
    nock('https://api.github.com:443')
      .post('/graphql')
      .reply(200, fixtures.getIssues)
      .post('/graphql')
      .reply(200, fixtures.fixedprFiles)

      .post(
        '/repos/LeonFedotov/fish-footman/statuses/e4e337875aef068f4f3cbe8f1831fcb1781b8c6b',
        (body) => {
          expect(body).toMatchObject(stateMock('success'))
          done()
          return true
        }
      )
      .reply(200, {})
    probot.receive({ name: 'pull_request', payload: fixtures.prUpdated })
  })

  test('when a fishy issue is closed affected prs are unlocked', (done) => {
    nock('https://api.github.com:443')
      .post('/graphql')
      .reply(200, fixtures.noIssues)
      .post('/graphql')
      .reply(200, fixtures.getPrs)

      .post(
        '/repos/LeonFedotov/fish-footman/statuses/e4e337875aef068f4f3cbe8f1831fcb1781b8c6b',
        (body) => {
          expect(body).toMatchObject(stateMock('success'))
          done()
          return true
        }
      )
      .reply(200, {})
    probot.receive({ name: 'issues', payload: fixtures.issueClosed })
  })

  test('when a fishy issue is edited affected prs are updated', (done) => {
    nock('https://api.github.com:443')
      .post('/graphql')
      .reply(200, fixtures.noIssues)
      .post('/graphql')
      .reply(200, fixtures.getPrs)
      .post(
        '/repos/LeonFedotov/fish-footman/statuses/e4e337875aef068f4f3cbe8f1831fcb1781b8c6b',
        (body) => {
          expect(body).toMatchObject(stateMock('success'))
          done()
          return true
        }
      )
      .reply(200)
    probot.receive({ name: 'issues', payload: fixtures.issueEdited })
  })


})
