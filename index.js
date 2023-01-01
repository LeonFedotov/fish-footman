const path = require('path')
const limitMerge = require('./src/limitMerge')
const stalePrs = require('./src/stalePrs')

module.exports = app => {
  process.env.NODE_ENV === 'production' && app.log.target.addStream({
    levelInString: !!process.env.LOG_LEVEL_IN_STRING,
    path: path.join('/logs/fish-footman.log')
  })

  app.on([
    'issues.labeled', 'issues.unlabeled', 'issues.opened',
    'issues.edited', 'issues.closed', 'issues.reopened'
  ], limitMerge.revalidateRepo)

  app.on([
    'pull_request.opened', 'pull_request.reopened',
    'pull_request.synchronize', 'pull_request.unlocked'
  ], (context) => Promise.all([limitMerge.revalidatePr(context), stalePrs.revalidatePr(context)]))

  app.on(['status'], stalePrs.revalidatePrFromState)

  app.on(['push'], (context) => {
    const { payload: { ref } } = context
    if (ref === 'refs/heads/master') {
      return stalePrs.revalidateRepo(context)
    }
  })

  app.log('fish footman is running!')
}
