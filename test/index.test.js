const nock = require('nock')
const myProbotApp = require('..')

const getProbot = require('./mocks/probot')

const fixtures = {
  issueCreated: require('./fixtures/fishy-issue-created'),
  issueEdited: require('./fixtures/fishy-issue-edited'),
  issueClosed: require('./fixtures/fishy-issue-closed'),
  prCreated: require('./fixtures/fishy-pr-created'),
  prFiles: require('./fixtures/fishy-pr-files'),
  fixedprFiles: require('./fixtures/fixed-pr-files'),
  prUpdated: require('./fixtures/no-longer-fishy-pr'),
  fishyIssues: require('./fixtures/fishy-issues-list'),
  openPrs: require('./fixtures/open-prs-list')
}

nock.disableNetConnect()

describe('fish footman', () => {
  let probot

  beforeEach(() => {
    probot = getProbot(myProbotApp)

    nock('https://api.github.com')
      .on('error', (err) => console.error(err))
      .post('/app/installations/1006543/access_tokens')
      .reply(200, { token: 'test' })
      .get('/repos/LeonFedotov/fish-footman/pulls?state=open')
      .reply(200, fixtures.openPrs)
  })

  test('when a fishy issue is created prs that touch fishy paths with be blocked', async () => {
    nock('https://api.github.com')
      .get('/repos/LeonFedotov/fish-footman/issues?state=open&labels=Fishy')
      .reply(200, fixtures.fishyIssues)
      .get('/repos/LeonFedotov/fish-footman/pulls/10/files')
      .reply(200, fixtures.prFiles)
      .post(
        '/repos/LeonFedotov/fish-footman/statuses/a7c2e132b30d225509f71123f3bc26a3d1754fae',
        (body) => {
          expect(body).toMatchObject({
            context: 'Directory Locks',
            state: 'pending',
            description: 'Checking mergeability'
          })
          return true
        }
      )
      .reply(200, {})
      .post(
        '/repos/LeonFedotov/fish-footman/statuses/a7c2e132b30d225509f71123f3bc26a3d1754fae',
        (body) => {
          expect(body).toMatchObject({
            context: 'Directory Locks',
            state: 'failure',
            description: 'Checking mergeability'
          })
          return true
        }
      )
      .reply(200, {})
    await probot.receive({ name: 'issues', payload: fixtures.issueCreated })
  })

  test('when a pr is created with restricted paths bot will block it', async () => {
    nock('https://api.github.com')
      .get('/repos/LeonFedotov/fish-footman/issues?state=open&labels=Fishy')
      .reply(200, fixtures.fishyIssues)
      .get('/repos/LeonFedotov/fish-footman/pulls/10/files')
      .reply(200, fixtures.prFiles)
      .post(
        '/repos/LeonFedotov/fish-footman/statuses/a7c2e132b30d225509f71123f3bc26a3d1754fae',
        (body) => {
          expect(body).toMatchObject({
            context: 'Directory Locks',
            state: 'pending',
            description: 'Checking mergeability'
          })
          return true
        }
      )
      .reply(200, {})
      .post(
        '/repos/LeonFedotov/fish-footman/statuses/a7c2e132b30d225509f71123f3bc26a3d1754fae',
        (body) => {
          expect(body).toMatchObject({
            context: 'Directory Locks',
            state: 'failure',
            description: 'Checking mergeability'
          })
          return true
        }
      )
      .reply(200, {})
    await probot.receive({ name: 'pull_request', payload: fixtures.prCreated })
  })

  test('when a pr is changed to not touch restricted paths pr is unlocked', async () => {
    nock('https://api.github.com')
      .get('/repos/LeonFedotov/fish-footman/issues?state=open&labels=Fishy')
      .reply(200, fixtures.fishyIssues)
      .get('/repos/LeonFedotov/fish-footman/pulls/10/files')
      .reply(200, fixtures.fixedprFiles)
      .post(
        '/repos/LeonFedotov/fish-footman/statuses/a7c2e132b30d225509f71123f3bc26a3d1754fae',
        (body) => {
          expect(body).toMatchObject({
            context: 'Directory Locks',
            state: 'pending',
            description: 'Checking mergeability'
          })
          return true
        }
      )
      .reply(200, {})
      .post(
        '/repos/LeonFedotov/fish-footman/statuses/a7c2e132b30d225509f71123f3bc26a3d1754fae',
        (body) => {
          expect(body).toMatchObject({
            context: 'Directory Locks',
            state: 'success',
            description: 'Checking mergeability'
          })
          return true
        }
      )
      .reply(200, {})
    await probot.receive({ name: 'pull_request', payload: fixtures.prUpdated })
  })

  test('when a fishy issue is closed affected prs are unlocked', async () => {
    nock('https://api.github.com')
      .get('/repos/LeonFedotov/fish-footman/issues?state=open&labels=Fishy')
      .reply(200, [])
      .get('/repos/LeonFedotov/fish-footman/pulls/10/files')
      .reply(200, fixtures.prFiles)
      .post(
        '/repos/LeonFedotov/fish-footman/statuses/a7c2e132b30d225509f71123f3bc26a3d1754fae',
        (body) => {
          expect(body).toMatchObject({
            context: 'Directory Locks',
            state: 'pending',
            description: 'Checking mergeability'
          })
          return true
        }
      )
      .reply(200, {})
      .post(
        '/repos/LeonFedotov/fish-footman/statuses/a7c2e132b30d225509f71123f3bc26a3d1754fae',
        (body) => {
          expect(body).toMatchObject({
            context: 'Directory Locks',
            state: 'success',
            description: 'Checking mergeability'
          })
          return true
        }
      )
      .reply(200, {})
    await probot.receive({ name: 'issues', payload: fixtures.issueClosed })
  })

  test('when a fishy issue is edited affected prs are updated', async () => {
    nock('https://api.github.com')
      .get('/repos/LeonFedotov/fish-footman/issues?state=open&labels=Fishy')
      .reply(200, [])
      .get('/repos/LeonFedotov/fish-footman/pulls/10/files')
      .reply(200, fixtures.prFiles)
      .post(
        '/repos/LeonFedotov/fish-footman/statuses/a7c2e132b30d225509f71123f3bc26a3d1754fae',
        (body) => {
          expect(body).toMatchObject({
            context: 'Directory Locks',
            state: 'pending',
            description: 'Checking mergeability'
          })
          return true
        }
      )
      .reply(200, {})
      .post(
        '/repos/LeonFedotov/fish-footman/statuses/a7c2e132b30d225509f71123f3bc26a3d1754fae',
        (body) => {
          expect(body).toMatchObject({
            context: 'Directory Locks',
            state: 'success',
            description: 'Checking mergeability'
          })
          return true
        }
      )
      .reply(200, {})
    await probot.receive({ name: 'issues', payload: fixtures.issueEdited })
  })
})
