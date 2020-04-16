const nock = require('nock')
const myProbotApp = require('./mocks/limitMergeApp')
const { statusName, successMessage, failureMessage } = require('../src/config').limitMerge
const { createProbot } = require('probot')

const fixtures = {
  getIssues: require('./fixtures/gql-get-issues'),
  wildIssues: require('./fixtures/gql-wildcard-issues'),
  noIssues: require('./fixtures/gql-get-no-issues'),
  issueCreated: require('./fixtures/fishy-issue-created'),
  wildcardIssue: require('./fixtures/wildcard-issue-created'),
  issueEdited: require('./fixtures/fishy-issue-edited'),
  issueClosed: require('./fixtures/fishy-issue-closed'),

  getPr: require('./fixtures/gql-get-pr'),
  getPrs: require('./fixtures/gql-get-prs'),
  getOldPrs: require('./fixtures/gql-get-old-prs'),
  prCreated: require('./fixtures/fishy-pr-created'),
  prUpdated: require('./fixtures/no-longer-fishy-pr'),
  fixedprFiles: require('./fixtures/fixed-pr-files'),
  wildcardPrs: require('./fixtures/gql-get-prs-wildcard')
}

const stateMock = (state) => ({
  state,
  context: statusName,
  description: state === 'success' ? successMessage : failureMessage,
  ...(state === 'failure' ? { target_url: expect.stringMatching(/^https:\/\/github.com\/.*/) } : {})
})

jest.setTimeout(10000)

describe('LimitMerge - Limit merges to master based on directories specified in issues', () => {
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

  test('when a fishy issue is created prs that touch fishy paths with be blocked', async () => {
    probot.logger.info('when a fishy issue is created prs that touch fishy paths with be blocked')
    scope
      .post('/graphql')
      .reply(200, fixtures.getIssues)

    scope
      .post('/graphql')
      .reply(200, fixtures.getPrs)

    const statuses = [
      ['e4e337875aef068f4f3cbe8f1831fcb1781b8c6b', 'failure'],
      ['666', 'success']
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

    await probot.receive({ name: 'issues', payload: fixtures.issueCreated })

    return Promise.all(statuses)
  })

  test('when a pr is created with restricted paths bot will block it', async () => {
    probot.logger.info('when a pr is created with restricted paths bot will block it')
    scope
      .post('/graphql')
      .reply(200, fixtures.getIssues)
      .post('/graphql')
      .reply(200, fixtures.getPr)

    const statusChange = new Promise((resolve, reject) => scope
      .post(
        '/repos/LeonFedotov/fish-footman/statuses/5f9ca41c7ba1f5c0ff8932782b351adf3a8ce46a',
        (body) => {
          try {
            expect(body).toMatchObject(stateMock('failure'))
            resolve(true)
          } catch (e) {
            reject(e)
          }
          return true
        }
      )
      .reply(200, {})
    )
    await probot.receive({ name: 'pull_request', payload: fixtures.prCreated })
    return statusChange
  })

  test('when a pr is changed to not touch restricted paths pr is unlocked', async () => {
    probot.logger.info('when a pr is changed to not touch restricted paths pr is unlocked')
    scope
      .post('/graphql')
      .reply(200, fixtures.getIssues)
      .post('/graphql')
      .reply(200, fixtures.fixedprFiles)

    const statusChange = new Promise((resolve, reject) => scope
      .post(
        '/repos/LeonFedotov/fish-footman/statuses/moo',
        (body) => {
          try {
            expect(body).toMatchObject(stateMock('success'))
            resolve(true)
          } catch (e) {
            reject(e)
          }
          return true
        }
      )
      .reply(200, {})
    )
    await probot.receive({ name: 'pull_request', payload: fixtures.prUpdated })
    return statusChange
  })

  test('when a fishy issue is closed affected prs are unlocked', async () => {
    probot.logger.info('when a fishy issue is closed affected prs are unlocked')
    scope
      .post('/graphql')
      .reply(200, fixtures.noIssues)
      .post('/graphql')
      .reply(200, fixtures.getPrs)

    const statuses = [
      ['888', 'success'],
      ['666', 'success']
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

    await probot.receive({ name: 'issues', payload: fixtures.issueClosed })

    return Promise.all(statuses)
  })

  test('when a fishy issue is edited affected prs are updated', async () => {
    probot.logger.info('when a fishy issue is edited affected prs are updated')
    scope
      .post('/graphql')
      .reply(200, fixtures.noIssues)
      .post('/graphql')
      .reply(200, fixtures.getPrs)

    const statuses = [
      ['888', 'success'],
      ['666', 'success']
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
      .reply(200)
    ))

    await probot.receive({ name: 'issues', payload: fixtures.issueEdited })

    return Promise.all(statuses)
  })

  test('when a fishy issue is edited only affected prs are updated', async () => {
    probot.logger.info('when a fishy issue is edited only affected prs are updated')
    scope
      .post('/graphql')
      .reply(200, fixtures.getIssues)
      .post('/graphql')
      .reply(200, fixtures.getOldPrs)

    const statuses = [
      ['123124', 'failure'],
      ['e4e337875aef068f4f3cbe8f1831fcb1781b8c6b', 'failure']
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
      .reply(200)
    ))

    await probot.receive({ name: 'issues', payload: fixtures.issueEdited })

    return Promise.all(statuses)
  })

  test('when a fishy issue is created with a wildcard all prs are blocked', async () => {
    probot.logger.info('when a fishy issue is created with a wildcard all prs are blocked')
    scope
      .post('/graphql')
      .reply(200, fixtures.wildIssues)
      .post('/graphql')
      .reply(200, fixtures.wildcardPrs)

    const statuses = [
      ['888', 'failure'],
      ['e4e337875aef068f4f3cbe8f1831fcb1781b8c6b', 'failure'],
      ['666', 'failure'],
      ['777', 'failure']
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

    await probot.receive({ name: 'issues', payload: fixtures.wildcardIssue })

    return Promise.all(statuses)
  })
})
