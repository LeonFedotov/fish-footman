const nock = require('nock')
const myProbotApp = require('./mocks/stalePrsApp')
const { createProbot } = require('probot')
const { statusName, successMessage, failureMessage } = require('../src/config').stalePrs

const fixtures = {
  masterCommit: require('./fixtures/push-to-master'),
  statusChange: require('./fixtures/state-success-change'),

  masterCommits: require('./fixtures/gql-master-log'),
  getPrs: require('./fixtures/gql-get-prs'),
  getPr: require('./fixtures/gql-get-pr')
}
const stateMock = (state) => ({ state, context: statusName, description: state === 'success' ? successMessage : failureMessage })
jest.setTimeout(10000)
describe('Stale prs', () => {
  let probot
  let scope
  beforeEach(() => {
    nock.disableNetConnect()

    scope = nock('https://api.github.com')

    probot = createProbot({ id: 1, cert: 'test', githubToken: 'test' })
    probot.load(myProbotApp)

    scope.on('error', (err) => probot.logger.error(err))
    scope.log((...args) => probot.logger.info(...args))
  })

  afterEach(() => {
    probot.logger.info('pending mocks: ', scope.pendingMocks())
    expect(scope.isDone()).toBe(true)

    nock.cleanAll()
    nock.enableNetConnect()
  })

  test('when a pr is fresh it is green', async () => {
    probot.logger.info('when a pr is fresh it is green')
    scope
      .post('/graphql')
      .reply(200, fixtures.masterCommits)

    scope
      .post('/graphql')
      .reply(200, fixtures.getPrs)

    const statuses = [
      ['e4e337875aef068f4f3cbe8f1831fcb1781b8c6b', 'failure'],
      ['888', 'success'],
      ['666', 'success'],
      ['777', 'success']
    ].map(([id, status]) => new Promise((resolve, reject) => scope
      .post(
        '/repos/LeonFedotov/fish-footman/statuses/' + id,
        (body) => {
          try {
            expect(body).toMatchObject(stateMock(status))
            resolve(true)
          } catch (e) {
            reject(e)
          }
          return true
        }
      )
      .reply(200, {})
    ))

    await probot.receive({ name: 'push', payload: fixtures.masterCommit })

    return Promise.all(statuses)
  })

  test('when a pr status changes stale lock should release', async () => {
    probot.logger.info('when a pr status changes stale lock should release')
    scope
      .post('/graphql')
      .reply(200, {
        data: {
          repository: {
            object: {
              associatedPullRequests: {
                nodes: [
                  {
                    number: 51
                  }
                ]
              }
            }
          }
        }
      })

    scope
      .post('/graphql')
      .reply(200, fixtures.masterCommits)

    scope
      .post('/graphql')
      .reply(200, fixtures.getPr)

    const statuses = [
      ['5f9ca41c7ba1f5c0ff8932782b351adf3a8ce46a', 'success']
    ].map(([id, status]) => new Promise((resolve, reject) => scope
      .post(
        '/repos/wix-private/santa-editor/statuses/' + id,
        (body) => {
          try {
            expect(body).toMatchObject(stateMock(status))
            resolve(true)
          } catch (e) {
            reject(e)
          }
          return true
        }
      )
      .reply(200, {})
    ))

    await probot.receive({ name: 'status', payload: fixtures.statusChange })

    return Promise.all(statuses)
  })
})
