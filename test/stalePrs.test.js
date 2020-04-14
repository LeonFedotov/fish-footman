const nock = require('nock')
const myProbotApp = require('./mocks/stalePrsApp')
const { createProbot } = require('probot')
// const { statusName, successMessage, failureMessage } = require('../src/config').stalePrs

// const fixtures = {
//   pushToMaster: require('./fixtures/push-to-master'),
//   prUpdated: require('./fixtures/pr-updated'),

//   getUpdatedPr: require('./fixtures/fixed-pr-files'),

//   masterCommits: require('./fixtures/gql-master-log'),
//   masterMovedCommits: require('./fixtures/gql-master-moved-log')
// }
// const stateMock = (state) => ({ state, context: statusName, description: state === 'success' ? successMessage : failureMessage })

xdescribe('Stale prs', () => {
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
  xtest('make sure stale prs are blocked from being merged ')
})
