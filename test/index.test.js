const nock = require('nock')
const myProbotApp = require('..')
const { statusName: context, successMessage, failureMessage } = require('../src/config')
const { createProbot } = require('probot')

const fixtures = {
  getIssues: require('./fixtures/gql-get-issues'),
  wildIssues: require('./fixtures/gql-wildcard-issues'),
  noIssues: require('./fixtures/gql-get-no-issues'),
  issueCreated: require('./fixtures/fishy-issue-created'),
  wildcardIssue: require('./fixtures/wildcard-issue-created'),
  issueEdited: require('./fixtures/fishy-issue-edited'),
  issueClosed: require('./fixtures/fishy-issue-closed'),

  getPrs: require('./fixtures/gql-get-prs'),
  prCreated: require('./fixtures/fishy-pr-created'),
  prUpdated: require('./fixtures/no-longer-fishy-pr'),
  fixedprFiles: require('./fixtures/fixed-pr-files')
}

const stateMock = (state) => ({ state, context, description: state === 'success' ? successMessage : failureMessage })

describe('fish footman', () => {
  let probot
  let scope
  beforeEach(() => {
    nock.disableNetConnect()

    scope = nock('https://api.github.com')
    //scope.log(console.log)
    scope.on('error', (err) => console.error(err))

    probot = createProbot({ id: 1, cert: 'test', githubToken: 'test' })
    probot.load(myProbotApp)
  })

  afterEach(() => {
    expect(scope.isDone()).toBe(true, 'pending mocks: ' + scope.pendingMocks())
    nock.cleanAll()
    nock.enableNetConnect()

  })

  test('when a fishy issue is created prs that touch fishy paths with be blocked', async () => {
    scope
      .get('/app')
      .reply(200, { events: ['issues', 'pull_request', 'push'] })

    scope
      .post('/graphql')
      .reply(200, fixtures.getIssues)

    scope
      .post('/graphql')
      .reply(200, fixtures.getPrs)

    const statusChange = new Promise((resolve) => scope
      .post(
        '/repos/LeonFedotov/fish-footman/statuses/e4e337875aef068f4f3cbe8f1831fcb1781b8c6b',
        (body) => {
          expect(body).toMatchObject(stateMock('failure'))
          resolve()
          return true;
        }
      )
      .reply(200, {})
    )

    await probot.receive({ name: 'issues', payload: fixtures.issueCreated })

    return statusChange
  })

  test('when a pr is created with restricted paths bot will block it', async () => {
    scope
      .post('/graphql')
      .reply(200, fixtures.getIssues)
      .post('/graphql')
      .reply(200, fixtures.getPrs)

    const statusChange = new Promise((resolve) => scope
      .post(
        '/repos/LeonFedotov/fish-footman/statuses/e4e337875aef068f4f3cbe8f1831fcb1781b8c6b',
        (body) => {
          expect(body).toMatchObject(stateMock('failure'))
          resolve()
          return true
        }
      )
      .reply(200, {})
    )
    await probot.receive({ name: 'pull_request', payload: fixtures.prCreated })
    return statusChange
  })

  test('when a pr is changed to not touch restricted paths pr is unlocked', async () => {
    scope
      .post('/graphql')
      .reply(200, fixtures.getIssues)
      .post('/graphql')
      .reply(200, fixtures.fixedprFiles)

    const statusChange = new Promise((resolve) => scope
      .post(
        '/repos/LeonFedotov/fish-footman/statuses/e4e337875aef068f4f3cbe8f1831fcb1781b8c6b',
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

  test('when a fishy issue is closed affected prs are unlocked', async () => {
    scope
      .post('/graphql')
      .reply(200, fixtures.noIssues)
      .post('/graphql')
      .reply(200, fixtures.getPrs)

    const statusChange = new Promise((resolve) => scope
      .post(
        '/repos/LeonFedotov/fish-footman/statuses/e4e337875aef068f4f3cbe8f1831fcb1781b8c6b',
        (body) => {
          expect(body).toMatchObject(stateMock('success'))
          resolve()
          return true
        }
      )
      .reply(200, {})
    )
    await probot.receive({ name: 'issues', payload: fixtures.issueClosed })
    return statusChange
  })

  test('when a fishy issue is edited affected prs are updated', async () => {
    scope
      .post('/graphql')
      .reply(200, fixtures.noIssues)
      .post('/graphql')
      .reply(200, fixtures.getPrs)

    const statusChange = new Promise((resolve) => scope
      .post(
        '/repos/LeonFedotov/fish-footman/statuses/e4e337875aef068f4f3cbe8f1831fcb1781b8c6b',
        (body) => {
          expect(body).toMatchObject(stateMock('success'))
          resolve()
          return true
        }
      )
      .reply(200)
    )
    await probot.receive({ name: 'issues', payload: fixtures.issueEdited })
    return statusChange
  })

  test('when a fishy issue is created with a wildcard all prs are blocked', async () => {
    scope
      .post('/graphql')
      .reply(200, fixtures.wildIssues)
      .post('/graphql')
      .reply(200, fixtures.getPrs)

    const statusChange = new Promise((resolve) => scope
      .post(
        '/repos/LeonFedotov/fish-footman/statuses/e4e337875aef068f4f3cbe8f1831fcb1781b8c6b',
        (body) => {
          expect(body).toMatchObject(stateMock('failure'))
          resolve()
          return true
        }
      )
      .reply(200)
    )
    await probot.receive({ name: 'issues', payload: fixtures.wildcardIssue })
    return statusChange
  })
})
