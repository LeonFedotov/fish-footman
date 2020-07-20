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
                      targetUrl
                      timestamp: createdAt
                      state
                     }
                  }
                }
              }
            }

            files(first: 10) {
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

          files(first: 10) {
            pageInfo { endCursor, hasNextPage }
            nodes { path }
          }

          commits(last: 1) {
            nodes {
              commit {
                timestamp: committedDate
                status {
                  contexts {
                    context
                    description
                    targetUrl
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
    query($owner: String! $repo: String! $first: Int!) {
      repository(name: $repo owner: $owner) {
        ref(qualifiedName: "master" ) {
          target {
            ... on Commit {
              history(first: $first) {
                edges {
                  node {
                    sha: oid
                    timestamp: committedDate
                  }
                }
              }
            }
          }
        }
      }
    }
  `,

  getIssuesByLabel: `
    query ($owner: String!, $repo: String!, $label: [String!], $cursor: String) {
      repository(owner: $owner, name: $repo) {
        issues(states: OPEN, labels: $label, first: 20, after: $cursor, orderBy:{field:CREATED_AT, direction:DESC}) {
          pageInfo { endCursor, hasNextPage }
          nodes { body, url }
        }
      }
    }
  `
}
