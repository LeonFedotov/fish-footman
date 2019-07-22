const nock = require('nock')
const myProbotApp = require('..')
const { statusName: context, statusDescription: description } = require('../src/config')
const getProbot = require('./mocks/probot')

const fixtures = {
  getIssues: require('./fixtures/gql-get-issues.json'),
  noIssues: require('./fixtures/gql-get-no-issues.json'),
  issueCreated: require('./fixtures/fishy-issue-created'),
  issueEdited: require('./fixtures/fishy-issue-edited'),
  issueClosed: require('./fixtures/fishy-issue-closed'),

  getPrs: require('./fixtures/gql-get-prs.json'),
  prCreated: require('./fixtures/fishy-pr-created'),
  prUpdated: require('./fixtures/no-longer-fishy-pr'),
  fixedprFiles: require('./fixtures/fixed-pr-files')
}

const stateMock = (state) => ({ state, context, description })

nock.disableNetConnect()

describe('fish footman', () => {
  const probot = getProbot(myProbotApp)

  beforeEach(() => {
    nock('https://api.github.com')
      .on('error', (err) => console.error(err))
      .post('/app/installations/1006543/access_tokens')
      .reply(200, { token: 'test' })
      // .get('/repos/LeonFedotov/fish-footman/pulls?state=open')
      // .reply(200, fixtures.openPrs)
  })

  test('when a fishy issue is created prs that touch fishy paths with be blocked', async () => {
    nock('https://api.github.com')
      .post('/graphql')
      .reply(200, fixtures.getIssues)
      .post('/graphql')
      .reply(200, fixtures.getPrs)
      // .post(
      //   '/repos/LeonFedotov/fish-footman/statuses/e4e337875aef068f4f3cbe8f1831fcb1781b8c6b',
      //   (body) => {
      //     expect(body).toMatchObject(stateMock('pending'))
      //     return true
      //   }
      // )
      // .reply(200, {})
      .post(
        '/repos/LeonFedotov/fish-footman/statuses/e4e337875aef068f4f3cbe8f1831fcb1781b8c6b',
        (body) => {
          expect(body).toMatchObject(stateMock('failure'))
          return true
        }
      )
      .reply(200, {})
    await probot.receive({ name: 'issues', payload: fixtures.issueCreated })
  })

  test('when a pr is created with restricted paths bot will block it', async () => {
    nock('https://api.github.com')
      .post('/graphql')
      .reply(200, fixtures.getIssues)
      .post('/graphql')
      .reply(200, fixtures.getPrs)
      // .post(
      //   '/repos/LeonFedotov/fish-footman/statuses/e4e337875aef068f4f3cbe8f1831fcb1781b8c6b',
      //   (body) => {
      //     expect(body).toMatchObject(stateMock('pending'))
      //     return true
      //   }
      // )
      // .reply(200, {})
      .post(
        '/repos/LeonFedotov/fish-footman/statuses/e4e337875aef068f4f3cbe8f1831fcb1781b8c6b',
        (body) => {
          expect(body).toMatchObject(stateMock('failure'))
          return true
        }
      )
      .reply(200, {})
    await probot.receive({ name: 'pull_request', payload: fixtures.prCreated })
  })

  test('when a pr is changed to not touch restricted paths pr is unlocked', async () => {
    nock('https://api.github.com')
      .post('/graphql')
      .reply(200, fixtures.getIssues)
      .post('/graphql')
      .reply(200, fixtures.fixedprFiles)
      // .post(
      //   '/repos/LeonFedotov/fish-footman/statuses/e4e337875aef068f4f3cbe8f1831fcb1781b8c6b',
      //   (body) => {
      //     expect(body).toMatchObject(stateMock('pending'))
      //     return true
      //   }
      // )
      // .reply(200, {})
      .post(
        '/repos/LeonFedotov/fish-footman/statuses/e4e337875aef068f4f3cbe8f1831fcb1781b8c6b',
        (body) => {
          expect(body).toMatchObject(stateMock('success'))
          return true
        }
      )
      .reply(200, {})
    await probot.receive({ name: 'pull_request', payload: fixtures.prUpdated })
  })

  test('when a fishy issue is closed affected prs are unlocked', async () => {
    nock('https://api.github.com')
      .post('/graphql')
      .reply(200, fixtures.noIssues)
      .post('/graphql')
      .reply(200, fixtures.getPrs)
      // .post(
      //   '/repos/LeonFedotov/fish-footman/statuses/e4e337875aef068f4f3cbe8f1831fcb1781b8c6b',
      //   (body) => {
      //     expect(body).toMatchObject(stateMock('pending'))
      //     return true
      //   }
      // )
      // .reply(200, {})
      .post(
        '/repos/LeonFedotov/fish-footman/statuses/e4e337875aef068f4f3cbe8f1831fcb1781b8c6b',
        (body) => {
          expect(body).toMatchObject(stateMock('success'))
          return true
        }
      )
      .reply(200, {})
    await probot.receive({ name: 'issues', payload: fixtures.issueClosed })
  })

  test('when a fishy issue is edited affected prs are updated', async () => {
    nock('https://api.github.com')
      .post('/graphql')
      .reply(200, fixtures.noIssues)
      .post('/graphql')
      .reply(200, fixtures.getPrs)
      // .post(
      //   '/repos/LeonFedotov/fish-footman/statuses/e4e337875aef068f4f3cbe8f1831fcb1781b8c6b',
      //   (body) => {
      //     expect(body).toMatchObject(stateMock('pending'))
      //     return true
      //   }
      // )
      // .reply(200, {})
      .post(
        '/repos/LeonFedotov/fish-footman/statuses/e4e337875aef068f4f3cbe8f1831fcb1781b8c6b',
        (body) => {
          expect(body).toMatchObject(stateMock('success'))
          return true
        }
      )
      .reply(200, {})
    await probot.receive({ name: 'issues', payload: fixtures.issueEdited })
  })

  test.todo('issues paging')
  test.todo('prs paging')
  test.todo('pr files paging')
})
