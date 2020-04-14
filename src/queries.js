module.exports = {
  getPrs: `
    query ($owner: String!, $repo: String!, $cursor: String) {
      repository(owner: $owner, name: $repo) {
        pullRequests(states: OPEN, first: 20, after: $cursor, orderBy:{field:CREATED_AT, direction:DESC}) {
          pageInfo { endCursor, hasNextPage }
          nodes {
            sha:headRefOid
            number
            commits(last: 1) {
              nodes {
                commit {
                  timestamp: committedDate
                  status {
                    contexts {
                      context
                      description
                      timestamp: createdAt
                      state
                     }
                  }
                }
              }
            }

            files(first:100) {
              pageInfo { endCursor, hasNextPage }
              nodes { path }
            }
          }
        }
      }
    }
  `,

  getPr: `
    query ($owner: String!, $repo: String!, $number: Int!) {
      repository(owner: $owner, name: $repo) {
        pullRequest(number: $number) {
          number
          sha:headRefOid

          files(first:100) {
            pageInfo { endCursor, hasNextPage }
            nodes { path }
          }

          commits(last: 1) {
            nodes {
              commit {
                oid
                timestamp: committedDate
                status {
                  contexts {
                    context
                    description
                    timestamp: createdAt
                    state
                   }
                }
              }
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
          result: files(first:100, after: $cursor) {
            pageInfo { hasNextPage, endCursor }
            nodes { path }
          }
        }
      }
    }
  `,

  getMasterLog: `
    query($owner: String! $repo: String!) {
      repository(name: $repo owner: $owner) {
        pullRequests(last: 20 states: MERGED) {
          nodes {
            node: mergeCommit {
              committedDate
              oid
            }
          }
        }
      }
    }
  `,

  getPrsCommits: `
    query ($owner: String!, $repo: String!, $statusName: String!, $cursor: String) {
      repository(owner: $owner, name: $repo) {
        result: pullRequests(states: OPEN, first: 100, after: $cursor, orderBy:{field:CREATED_AT, direction:DESC}) {
          pageInfo { endCursor, hasNextPage }
          nodes {
            sha: headRefOid
            number
            commits(last: 1) {
              nodes {
                commit {
                  committedDate
                  status {
                    context(name: $statusName) {
                      state
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `
}
