const nock = require('nock')
const myProbotApp = require('./mocks/stalePrsApp')
const { createProbot } = require('probot')
const { statusName, successMessage, failureMessage } = require('../src/config').stalePrs

const fixtures = {
  pushToMaster: require('./fixtures/push-to-master'),
  prUpdated: require('./fixtures/pr-updated'),

  getUpdatedPr: require('./fixtures/fixed-pr-files'),
  getStalePrs: require('./fixtures/gql-get-stale-prs'),

  masterCommits: require('./fixtures/gql-master-log'),
  masterMovedCommits: require('./fixtures/gql-master-moved-log')
}
const stateMock = (state) => ({ state, context: statusName, description: state === 'success' ? successMessage : failureMessage })

describe('Stale prs', () => {
  let probot
  let scope
  beforeEach(() => {
    nock.disableNetConnect()
    scope = nock('https://api.github.com')
    scope.on('error', (err) => console.error(err))

    probot = createProbot({ id: 1, cert: 'test', githubToken: 'test' })
    probot.load(myProbotApp)

    // scope.log(console.log)
  })

  afterEach(() => {
    // console.log('pending mocks: ' + scope.pendingMocks())
    expect(scope.isDone()).toBe(true)
    nock.cleanAll()
    nock.enableNetConnect()
  })

  test('when master has a new commit prs are checked for staleness', async () => {
    scope
      .post('/graphql')
      .reply(200, fixtures.masterCommits)

    scope
      .post('/graphql')
      .reply(200, fixtures.getStalePrs)

    const statusChange = new Promise((resolve) => scope
      .post(
        '/repos/LeonFedotov/fish-footman/statuses/5f9ca41c7ba1f5c0ff8932782b351adf3a8ce46a',
        (body) => {
          expect(body).toMatchObject(stateMock('failure'))
          resolve()
          return true
        }
      )
      .reply(200, {})
    )

    const statusChange2 = new Promise((resolve) => scope
      .post(
        '/repos/LeonFedotov/fish-footman/statuses/16f6b75ef44c2ae5df734fc4110d25930b9b100f',
        (body) => {
          expect(body).toMatchObject(stateMock('success'))
          resolve()
          return true
        }
      )
      .reply(200, {})
    )
    await probot.receive({ name: 'push', payload: fixtures.pushToMaster })

    return Promise.all([statusChange, statusChange2])
  })

  test('when master has moved 10 commits away from the pr it is marked as stale', async () => {
    scope
      .post('/graphql')
      .reply(200, fixtures.masterMovedCommits)

    scope
      .post('/graphql')
      .reply(200, fixtures.getStalePrs)

    const statusChange = new Promise((resolve) => scope
      .post(
        '/repos/LeonFedotov/fish-footman/statuses/5f9ca41c7ba1f5c0ff8932782b351adf3a8ce46a',
        (body) => {
          expect(body).toMatchObject(stateMock('failure'))
          resolve()
          return true
        }
      )
      .reply(200, {})
    )

    const statusChange2 = new Promise((resolve) => scope
      .post(
        '/repos/LeonFedotov/fish-footman/statuses/16f6b75ef44c2ae5df734fc4110d25930b9b100f',
        (body) => {
          expect(body).toMatchObject(stateMock('failure'))
          resolve()
          return true
        }
      )
      .reply(200, {})
    )
    await probot.receive({ name: 'push', payload: fixtures.pushToMaster })

    return Promise.all([statusChange, statusChange2])
  })

  test('when a stale pr is updated it is refreshed', async () => {
    scope
      .post('/graphql')
      .reply(200, fixtures.masterCommits)

    scope
      .post('/graphql')
      .reply(200, fixtures.getUpdatedPr)

    const statusChange = new Promise((resolve) => scope
      .post(
        '/repos/LeonFedotov/fish-footman/statuses/moo',
        (body) => {
          expect(body).toMatchObject(stateMock('success'))
          resolve()
          return true
        }
      )
      .reply(200, {})
    )

    await probot.receive({ name: 'pull_request', payload: fixtures.prUpdated })
    return statusChange
  })
})
