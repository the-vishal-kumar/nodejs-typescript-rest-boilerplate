/**
 * OpenAPI 3.1 description of the API, served at /docs (Swagger UI) and
 * /docs/openapi.json. The e2e suite checks that every documented route exists.
 *
 * This document is the shared contract of the loan API family. It is exported
 * to contract/openapi.json (make contract) and the e2e suite fails if the two
 * differ. Keep it free of anything specific to this stack: the other
 * implementations serve it unchanged apart from info.title and info.description.
 */
const errorResponse = (description: string): object => ({
  description,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
});

const bearer = [{ bearerAuth: [] }];

const loanIdParam = {
  name: 'id',
  in: 'path',
  required: true,
  description: 'Public loan id (UUID v4), as returned by `POST /loan`.',
  schema: { type: 'string', format: 'uuid' },
};

const jsonBody = (ref: string): object => ({
  required: true,
  content: { 'application/json': { schema: { $ref: `#/components/schemas/${ref}` } } },
});

export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'Loan API',
    version: '2.0.0',
    description: [
      'Customers request a loan with an amount and a term in weeks, an admin approves it, and the',
      'customer pays the weekly instalments. A loan becomes `PAID` when the last instalment is paid.',
      '',
      '**Try it:** sign up and sign in with `/auth/signup` and `/auth/signin`, copy `data.accessToken`,',
      'press **Authorize** and paste the token. Admin sign-up only works when the server runs with',
      '`ADMIN_SIGNUP_ENABLED=true`.',
      '',
      'Every response carries an `X-Request-Id` header. Quote it when reporting a problem.',
    ].join('\n'),
  },
  tags: [
    { name: 'Auth', description: 'Accounts and sessions' },
    { name: 'Loans', description: 'Loan requests and approval' },
    { name: 'Repayments', description: 'Weekly instalments' },
    { name: 'Health', description: 'Liveness and readiness probes' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['status', 'error'],
        properties: {
          status: { type: 'integer', examples: [422] },
          error: { type: 'string', examples: ['Validation error'] },
          errors: { type: 'array', items: { type: 'string' }, examples: [['"amount" is required']] },
          requestId: { type: 'string', description: 'Present on 500 responses.' },
        },
      },
      Signup: {
        type: 'object',
        required: ['email', 'password', 'firstName'],
        additionalProperties: false,
        properties: {
          email: { type: 'string', format: 'email', maxLength: 254, examples: ['user@example.com'] },
          password: { type: 'string', minLength: 8, maxLength: 128, examples: ['strong-password'] },
          firstName: { type: 'string', minLength: 1, maxLength: 100, examples: ['Ada'] },
          lastName: { type: 'string', maxLength: 100, examples: ['Lovelace'] },
        },
      },
      Signin: {
        type: 'object',
        required: ['email', 'password'],
        additionalProperties: false,
        properties: {
          email: { type: 'string', format: 'email', maxLength: 254, examples: ['user@example.com'] },
          password: { type: 'string', maxLength: 128, examples: ['strong-password'] },
        },
      },
      ResetPassword: {
        type: 'object',
        required: ['currentPassword', 'password'],
        additionalProperties: false,
        properties: {
          currentPassword: { type: 'string', maxLength: 128, examples: ['strong-password'] },
          password: { type: 'string', minLength: 8, maxLength: 128, examples: ['a-new-strong-password'] },
        },
      },
      AccessToken: {
        type: 'object',
        properties: {
          status: { type: 'integer', examples: [200] },
          data: {
            type: 'object',
            properties: { accessToken: { type: 'string', description: 'JWT. Users: 24 h, admins: 20 min.' } },
          },
        },
      },
      LoanRequest: {
        type: 'object',
        required: ['amount', 'term'],
        additionalProperties: false,
        properties: {
          amount: {
            type: 'number',
            minimum: 0.01,
            maximum: 1000000000,
            description: 'At most two decimal places.',
            examples: [10000],
          },
          term: { type: 'integer', minimum: 1, maximum: 520, description: 'Weeks.', examples: [3] },
        },
      },
      Payment: {
        type: 'object',
        required: ['amount'],
        additionalProperties: false,
        properties: {
          amount: {
            type: 'number',
            minimum: 0.01,
            maximum: 1000000000,
            description:
              'At most two decimal places. At least the next due instalment; any surplus pays later instalments.',
            examples: [3333.34],
          },
        },
      },
      Status: { type: 'string', enum: ['PENDING', 'APPROVED', 'PAID'] },
      Repayment: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          loanId: { type: 'string', format: 'uuid' },
          dueAmount: { type: 'number', examples: [3333.34] },
          paidAmount: { type: 'number', examples: [0] },
          isLast: { type: 'boolean' },
          status: { $ref: '#/components/schemas/Status' },
          dueDate: { type: 'string', format: 'date-time' },
          createdAt: { type: 'integer', description: 'Unix seconds' },
          updatedAt: { type: 'integer', description: 'Unix seconds' },
        },
      },
      Loan: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          amount: { type: 'number', examples: [10000] },
          term: { type: 'integer', examples: [3] },
          status: { $ref: '#/components/schemas/Status' },
          createdAt: { type: 'integer', description: 'Unix seconds' },
          updatedAt: { type: 'integer', description: 'Unix seconds' },
          repayments: { type: 'array', items: { $ref: '#/components/schemas/Repayment' } },
        },
      },
    },
  },
  paths: {
    '/auth/signup': {
      post: {
        tags: ['Auth'],
        summary: 'Create a customer account',
        requestBody: jsonBody('Signup'),
        responses: {
          204: { description: 'Account created' },
          409: errorResponse('Email already registered'),
          422: errorResponse('Invalid payload'),
          429: errorResponse('Too many authentication attempts'),
        },
      },
    },
    '/auth/signup/admin': {
      post: {
        tags: ['Auth'],
        summary: 'Create an admin account (only when ADMIN_SIGNUP_ENABLED=true)',
        requestBody: jsonBody('Signup'),
        responses: {
          204: { description: 'Admin created' },
          403: errorResponse('Admin sign-up is disabled'),
          409: errorResponse('Email already registered'),
          422: errorResponse('Invalid payload'),
          429: errorResponse('Too many authentication attempts'),
        },
      },
    },
    '/auth/signin': {
      post: {
        tags: ['Auth'],
        summary: 'Sign in and get an access token',
        requestBody: jsonBody('Signin'),
        responses: {
          200: {
            description: 'Signed in',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AccessToken' } } },
          },
          401: errorResponse('Invalid email or password'),
          422: errorResponse('Invalid payload'),
          429: errorResponse('Too many authentication attempts'),
        },
      },
    },
    '/auth/signin/admin': {
      post: {
        tags: ['Auth'],
        summary: 'Sign in as an admin (short-lived token)',
        requestBody: jsonBody('Signin'),
        responses: {
          200: {
            description: 'Signed in',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AccessToken' } } },
          },
          401: errorResponse('Invalid email or password'),
          403: errorResponse('The account is not an admin'),
          422: errorResponse('Invalid payload'),
          429: errorResponse('Too many authentication attempts'),
        },
      },
    },
    '/auth/signoff': {
      post: {
        tags: ['Auth'],
        summary: 'End the current session',
        security: bearer,
        responses: { 204: { description: 'Signed off' }, 401: errorResponse('Missing or invalid token') },
      },
    },
    '/auth/password/reset': {
      put: {
        tags: ['Auth'],
        summary: 'Change password and end all other sessions',
        security: bearer,
        requestBody: jsonBody('ResetPassword'),
        responses: {
          204: { description: 'Password changed' },
          401: errorResponse('Missing token or wrong current password'),
          403: errorResponse('New password equals the old one'),
          422: errorResponse('Invalid payload'),
          429: errorResponse('Too many authentication attempts'),
        },
      },
    },
    '/loan': {
      post: {
        tags: ['Loans'],
        summary: 'Request a loan',
        description: 'Creates the loan and its weekly schedule, both `PENDING`. Cents are spread so the sum is exact.',
        security: bearer,
        requestBody: jsonBody('LoanRequest'),
        responses: {
          201: {
            description: 'Loan created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'integer', examples: [201] },
                    data: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } } },
                  },
                },
              },
            },
          },
          401: errorResponse('Missing or invalid token'),
          422: errorResponse('Invalid payload'),
        },
      },
      get: {
        tags: ['Loans'],
        summary: 'List my loans with their schedules',
        security: bearer,
        responses: {
          200: {
            description: 'Loans of the caller',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'integer' },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Loan' } },
                  },
                },
              },
            },
          },
          401: errorResponse('Missing or invalid token'),
        },
      },
    },
    '/loan/{id}': {
      get: {
        tags: ['Loans'],
        summary: 'Get one of my loans',
        security: bearer,
        parameters: [loanIdParam],
        responses: {
          200: {
            description: 'The loan',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { status: { type: 'integer' }, data: { $ref: '#/components/schemas/Loan' } },
                },
              },
            },
          },
          401: errorResponse('Missing or invalid token'),
          403: errorResponse('The loan belongs to someone else'),
          404: errorResponse('Loan not found'),
          422: errorResponse('id is not a UUID'),
        },
      },
    },
    '/loan/{id}/approve': {
      put: {
        tags: ['Loans'],
        summary: 'Approve a pending loan (admin)',
        security: bearer,
        parameters: [loanIdParam],
        responses: {
          204: { description: 'Approved' },
          401: errorResponse('Missing or invalid token'),
          403: errorResponse('Not an admin, own loan, or loan not pending'),
          404: errorResponse('Loan not found'),
          409: errorResponse('Approved concurrently by another request'),
          422: errorResponse('id is not a UUID'),
        },
      },
    },
    '/loan/{id}/repayment': {
      put: {
        tags: ['Repayments'],
        summary: 'Pay the next instalment(s)',
        security: bearer,
        parameters: [loanIdParam],
        requestBody: jsonBody('Payment'),
        responses: {
          204: { description: 'Payment applied' },
          401: errorResponse('Missing or invalid token'),
          403: errorResponse('Not the owner, loan not approved, amount below the due instalment or above the balance'),
          404: errorResponse('Loan not found'),
          409: errorResponse('Another payment on this loan is in progress, retry'),
          422: errorResponse('Invalid payload'),
        },
      },
    },
    '/health/live': {
      get: {
        tags: ['Health'],
        summary: 'Liveness probe (no dependencies checked)',
        responses: { 200: { description: 'Process is up' } },
      },
    },
    '/health/ready': {
      get: {
        tags: ['Health'],
        summary: 'Readiness probe (database reachable, not shutting down)',
        responses: { 200: { description: 'Ready' }, 503: { description: 'Not ready' } },
      },
    },
  },
};

export default openApiDocument;
