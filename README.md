# nodejs-typescript-rest-boilerplate

[![CI](https://github.com/the-vishal-kumar/nodejs-typescript-rest-boilerplate/actions/workflows/ci.yml/badge.svg)](https://github.com/the-vishal-kumar/nodejs-typescript-rest-boilerplate/actions/workflows/ci.yml)
![Node.js](https://img.shields.io/badge/node-%3E%3D22-339933?logo=node.js&logoColor=white)

A [NodeJs] / [TypeScript] rest application boilerplate with [Express] framework and uses [MongoDB] as a persistent layer.

- It contains an application that allows authenticated users to go through a loan application.
- It uses [MongoDB] as a persistent database layer with [Mongoose] as a ODM.
- It uses [Joi] for schema validation.
- It can be run with [Docker] and [Docker-Compose] containerization software.
- It has some end-to-end and unit tests written using [Jest].
- It uses [ESLint], [Prettier], [CommitLint], [Husky] for maintaining code quality.
- It uses [Winston] for logging.
- It uses [New Relic] for error logging, application performance monitoring, log monitoring.

## Problem Statement

- Create an application that allows authenticated users to go through a loan application. It doesn’t have to contain too many fields, but at least “amount required” and “loan term”.
- All the loans will be assumed to have a “weekly” repayment frequency.
- After the loan is approved by an admin, the user must be able to submit the weekly loan repayments with an amount greater than or equal to the scheduled repayment amount.
- It can be a simplified repay functionality, which won’t need to check if the dates are correct but will just set the weekly amount to be repaid.

  [Read more...](./PROBLEM.md)

## Solution

- There are four entities - User, Token, Loan, Repayment
- Admin can signup, signin, approve a loan request, singoff, or reset password
- User can signup, signin, raise a loan request, view all their loans, view a particular loan, make a repayment, singoff, or reset password

  [Read more...](./SOLUTION.md)

## Initial setup

1. Clone from Github
   ```bash
   git clone https://github.com/the-vishal-kumar/nodejs-typescript-rest-boilerplate.git
   ```
1. Setup Docker and Docker Compose

   - Install `docker` and `docker-compose` on your machine
   - Copy `docker-compose.sample.yml` as `docker-compose.yml`

1. Install dependencies using npm

   ```bash
   cd nodejs-typescript-rest-boilerplate
   npm i
   ```

1. Set environment variables

   - Copy `.env.sample` to root directory as `.env`
     - (Optional) Replace the value of `NEW_RELIC_LICENSE_KEY`. Generate key from [here](https://docs.newrelic.com/docs/apm/agents/nodejs-agent/getting-started/introduction-new-relic-nodejs/)

## Development

1. Execute the command to start the application
   ```bash
   npm start
   ```

## Testing

1. Some end-to-end and unit tests are included in `src/test` directory
1. Tests are run using [Jest]
1. Execute the command to run the tests
   ```bash
   npm test
   ```

### Continuous integration

[`.github/workflows/ci.yml`](./.github/workflows/ci.yml) runs on every push to `main` and every pull request, on Node.js 22 (read from `.nvmrc`):

1. `npm ci`
1. `npm run pretty:check` and `npm run lint` (ESLint 9 flat config, type-aware rules)
1. `npm run build`
1. Starts the built API against a MongoDB 6 service container, then runs Jest (unit + e2e) with `--coverage` and uploads the report as a build artifact

Coverage at the time of writing (Jest, 34 tests): **58% statements, 58% lines**. This counts only code loaded in the Jest process. The e2e suites call the API over HTTP in a separate process, so the routes, controllers and models they exercise are not instrumented and the number understates what the tests cover.

## API Documentation

1. [Postman Collection](./Postman/nodejs-typescript-rest-boilerplate.postman_collection.json) : [Postman Environment](./Postman//nodejs-typescript-rest-boilerplate.postman_environment.json) - Import these files to Postman to know about the APIs schema

## Technology

- Language - [NodeJs] 22 | [TypeScript]
- Framework - [Express]
- Containerization Software - [Docker]
- Version Control - [Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)

## Code Quality

- [ESLint]
- [Prettier]
- [CommitLint]

## Code Review

- A feature branch is created from _dev_ branch, and after completion of code, a PR is generated to _dev_ branch
- If changes are requested by a reviewer on Github, then the person who has made the PR makes appropriate changes. The reviewer reviews again and marks the comments as resolved
- If there are no new changes required, then PR is merged with _dev_ branch

## Managing Credentials

- Credentials live in `.env` file

<!---
## Hosting

 - [Heroku]
-->

<!---
## Environments

Create three new heroku apps in the `nodejs-typescript-rest-boilerplate` pipeline:

- Development
- UAT/Staging
- Production

In app's settings, set correctly all required config variables

**Note**: Development server is used to run Test Cases before deploying on Staging
-->

## Git Workflow

- A branch is created for each ticket from _dev_ branch
- Example of Branch Name:
  - feature/{ticket_number}
  - bugfix/{ticket_number}
  - hotfix/{ticket_number}
  - dev
  - staging
  - master
- Read next section for more information

<!--
## CI and Deployment

- Auto deployment is triggered on Heroku CI itself when code is pushed to respective branches. If all the test cases (feature, unit, postman, http, console etc.) doesn't pass, then build won't be deployed
- On pushing the code to `dev` branch, test cases will run. On passing all the tests, the build
  will deploy on `Development` environment
- On pushing the code to `staging` branch, test cases will run. On passing all the tests, the build will deploy on `Staging` environment
- On pushing the code to `master` branch, test cases will run. On passing all the tests, the build will deploy on `Production` environment
-->

## Error Logging

- [New Relic]

## Application Performance Monitoring

- [New Relic]

## Log Monitoring

- [New Relic]

<!---
## Backups

- Database backups are made every 24 hours at 2100 hours UTC time by Heroku for Staging and Production environment
-->

## Folder Structure

      📦nodejs-typescript-rest-boilerplate
      ┣ 📂.husky
      ┃ ┣ 📂\_
      ┃ ┃ ┣ 📜.gitignore
      ┃ ┃ ┗ 📜husky.sh
      ┃ ┣ 📜commit-msg
      ┃ ┣ 📜pre-commit
      ┃ ┗ 📜pre-push
      ┣ 📂Postman
      ┃ ┣ 📜nodejs-typescript-rest-boilerplate.postman_collection.json
      ┃ ┗ 📜nodejs-typescript-rest-boilerplate.postman_environment.json
      ┣ 📂src
      ┃ ┣ 📂app
      ┃ ┃ ┣ 📂mongo-server
      ┃ ┃ ┃ ┣ 📜Dockerfile
      ┃ ┃ ┃ ┗ 📜index.ts
      ┃ ┃ ┣ 📂mongo-server-test
      ┃ ┃ ┃ ┗ 📜Dockerfile
      ┃ ┃ ┣ 📂node-server
      ┃ ┃ ┃ ┣ 📜Dockerfile
      ┃ ┃ ┃ ┗ 📜index.ts
      ┃ ┃ ┗ 📜index.ts
      ┃ ┣ 📂config
      ┃ ┃ ┣ 📜index.ts
      ┃ ┃ ┗ 📜mongo-config.ts
      ┃ ┣ 📂controller
      ┃ ┃ ┣ 📜auth.ts
      ┃ ┃ ┣ 📜index.ts
      ┃ ┃ ┣ 📜loan.ts
      ┃ ┃ ┗ 📜repayment.ts
      ┃ ┣ 📂error
      ┃ ┃ ┣ 📜authentication.ts
      ┃ ┃ ┣ 📜authorization.ts
      ┃ ┃ ┣ 📜custom.ts
      ┃ ┃ ┣ 📜index.ts
      ┃ ┃ ┣ 📜notFound.ts
      ┃ ┃ ┗ 📜validation.ts
      ┃ ┣ 📂middleware
      ┃ ┃ ┣ 📜index.ts
      ┃ ┃ ┣ 📜logRequestResponse.ts
      ┃ ┃ ┣ 📜validateAccessToken.ts
      ┃ ┃ ┣ 📜validateIsAdmin.ts
      ┃ ┃ ┗ 📜validateSchema.ts
      ┃ ┣ 📂model
      ┃ ┃ ┣ 📜index.ts
      ┃ ┃ ┣ 📜loan.ts
      ┃ ┃ ┣ 📜repayment.ts
      ┃ ┃ ┣ 📜token.ts
      ┃ ┃ ┗ 📜user.ts
      ┃ ┣ 📂route
      ┃ ┃ ┣ 📜auth.ts
      ┃ ┃ ┣ 📜home.ts
      ┃ ┃ ┣ 📜index.ts
      ┃ ┃ ┣ 📜loan.ts
      ┃ ┃ ┗ 📜repayment.ts
      ┃ ┣ 📂schema
      ┃ ┃ ┣ 📜auth.ts
      ┃ ┃ ┣ 📜index.ts
      ┃ ┃ ┣ 📜loan.ts
      ┃ ┃ ┗ 📜repayment.ts
      ┃ ┣ 📂test
      ┃ ┃ ┣ 📂e2e
      ┃ ┃ ┃ ┣ 📜auth.e2e.test.ts
      ┃ ┃ ┃ ┗ 📜loan.e2e.test.ts
      ┃ ┃ ┗ 📂unit
      ┃ ┃ ┃ ┗ 📂util
      ┃ ┃ ┃ ┃ ┣ 📜enum.unit.test.ts
      ┃ ┃ ┃ ┃ ┣ 📜money.unit.test.ts
      ┃ ┃ ┃ ┃ ┗ 📜password.unit.test.ts
      ┃ ┣ 📂type
      ┃ ┃ ┣ 📂express
      ┃ ┃ ┃ ┗ 📜index.d.ts
      ┃ ┃ ┣ 📜Loan.ts
      ┃ ┃ ┣ 📜LoanRepayment.ts
      ┃ ┃ ┣ 📜Repayment.ts
      ┃ ┃ ┣ 📜ResponseHandler.ts
      ┃ ┃ ┣ 📜Token.ts
      ┃ ┃ ┣ 📜User.ts
      ┃ ┃ ┗ 📜index.ts
      ┃ ┣ 📂util
      ┃ ┃ ┣ 📜enum.ts
      ┃ ┃ ┣ 📜index.ts
      ┃ ┃ ┣ 📜logger.ts
      ┃ ┃ ┣ 📜money.ts
      ┃ ┃ ┣ 📜pagination.ts
      ┃ ┃ ┣ 📜password.ts
      ┃ ┃ ┗ 📜responseHandler.ts
      ┃ ┗ 📜index.ts
      ┣ 📜.commitlintrc.json
      ┣ 📜.dockerignore
      ┣ 📜.env
      ┣ 📜.env.sample
      ┣ 📜.env.test
      ┣ 📜eslint.config.mjs
      ┣ 📜.gitignore
      ┣ 📜.nvmrc
      ┣ 📜.prettierrc.json
      ┣ 📜LICENSE
      ┣ 📜PROBLEM.md
      ┣ 📜README.md
      ┣ 📜SOLUTION.md
      ┣ 📜docker-compose.sample.yml
      ┣ 📜docker-compose.test.yml
      ┣ 📜docker-compose.yml
      ┣ 📜jest.config.js
      ┣ 📜newrelic.js
      ┣ 📜newrelic_agent.log
      ┣ 📜package-lock.json
      ┣ 📜package.json
      ┗ 📜tsconfig.json

## Project Specific Knowledge

- [JWT]

<!---
## Production Setup

## External Services/API Reference

## FAQ
-->

## License

- AGPL-3.0-or-later

## Meet The Maker

[Vishal Kumar] - Software Engineer 👨‍💻 and an Aspiring Entrepreneur👨‍💼

[Vishal Kumar]: https://www.linkedin.com/in/the-vishal-kumar/
[NodeJs]: https://nodejs.org/en
[TypeScript]: https://www.typescriptlang.org/
[Express]: https://expressjs.com/
[MongoDB]: https://mongodb.com/
[Mongoose]: https://mongoosejs.com/
[Joi]: https://joi.dev/
[Docker]: https://www.docker.com/
[Docker-Compose]: https://docs.docker.com/compose/
[ESLint]: https://eslint.org/
[Prettier]: https://prettier.io/
[CommitLint]: https://commitlint.js.org/
[Husky]: https://typicode.github.io/husky/
[Jest]: https://jestjs.io/
[Heroku]: https://www.heroku.com/
[Winston]: https://github.com/winstonjs/winston
[New Relic]: https://newrelic.com
[JWT]: https://jwt.io/
[Git]: https://git-scm.com/book/en/v2/Getting-Started-Installing-Git
