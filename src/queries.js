module.exports = {
  getIssues: `
    query ($owner: String!, $repo: String!, $label: [String!], $cursor: String) {
      repository(owner: $owner, name: $repo) {
        result: issues(states: OPEN, labels: $label, first: 100, after: $cursor) {
          pageInfo { endCursor, hasNextPage }
          nodes { body }
        }
      }
    }
  `,

  getPrs: `
    query ($owner: String!, $repo: String!, $cursor: String) {
      repository(owner: $owner, name: $repo) {
        result: pullRequests(states: OPEN, last: 100, after: $cursor) {
          pageInfo { endCursor, hasNextPage }
          nodes {
            sha:headRefOid
            number
            files(last:100) {
              pageInfo { endCursor, hasNextPage }
              nodes { path }
            }
          }
        }
      }
    }
  `,

  getFiles: `
    query ($owner: String!, $repo: String!, $number: Int!, $cursor: String) {
      repository(owner: $owner, name: $repo) {
        pullRequest(number: $number) {
          result: files(last:100, after: $cursor) {
            pageInfo { hasNextPage, endCursor }
            nodes { path }
          }
        }
      }
    }
  `
}
