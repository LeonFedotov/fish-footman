const { createStatus, restrictedDirs, pullrequests } = require('./lib')
const validatePr = async (context, pr, restrictions) => {
  // await createStatus(context, pr.sha, 'pending')
  if(restrictions.some(dir => dir == '*/')) {
    return false
  }
  
  for await (const file of pr.files) {
    if (restrictions.some((dir) => file.startsWith(dir))) {
      createStatus(context, pr.sha, 'failure')
      return false
    }
  }
  createStatus(context, pr.sha, 'success')
  return true
}

module.exports = async (context) => {
  context.log('Gathering restrictions')
  try {
    const restrictions = await restrictedDirs(context)
    context.log(`Got ${restrictions.length} restrictions`, restrictions)

    for await (const pr of pullrequests(context)) {
      validatePr(context, pr, restrictions)
        .then((res) => context.log(pr.number, res))
    }
  } catch (e) {
    console.log(e.message, JSON.stringify(e))
  }
}
