const stalePrs = require('../../src/stalePrs')

module.exports = app => {
  app.on([
    'pull_request.opened',
    'pull_request.reopened',
    'pull_request.synchronize',
    'pull_request.unlocked'
  ], stalePrs.revalidatePr)

  app.on('push', async (context) => {
    const { payload: { ref } } = context
    if (ref === 'refs/heads/master') {
      return stalePrs.revalidateRepo(context)
    }
  })
  app.on(['status'], stalePrs.revalidatePrFromState)

  app.log('fish footman is running!')
}
