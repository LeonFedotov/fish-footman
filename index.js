const limitMerge = require('./src/limitMerge')
const stalePrs = require('./src/stalePrs')

module.exports = app => {
  app.on([
    'issues.labeled', 'issues.unlabeled', 'issues.opened',
    'issues.edited', 'issues.closed', 'issues.reopened'
  ], limitMerge.revalidateRepo)

  app.on([
    'pull_request.opened', 'pull_request.reopened',
    'pull_request.synchronize', 'pull_request.unlocked'
  ], (context) => Promise.all([limitMerge.revalidatePr(context), stalePrs.revalidatePr(context)]))

  app.on(['push'], (context) => {
    const { payload: { ref } } = context
    if (ref === 'refs/heads/master') {
      return stalePrs.revalidateRepo(context)
    }
  })

  app.log('fish footman is running!')
}
