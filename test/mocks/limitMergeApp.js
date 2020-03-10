const limitMerge = require('../../src/limitMerge')

module.exports = app => {
  app.on([
    'issues.labeled',
    'issues.unlabeled',
    'issues.opened',
    'issues.edited',
    'issues.closed',
    'issues.reopened'
  ], limitMerge.revalidateRepo)

  app.on([
    'pull_request.opened',
    'pull_request.reopened',
    'pull_request.synchronize',
    'pull_request.unlocked'
  ], limitMerge.revalidatePr)

  app.log('fish footman is running!')
}
