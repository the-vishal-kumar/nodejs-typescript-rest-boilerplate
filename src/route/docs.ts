import express, { Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiDocument } from '../docs/openapi';

// Swagger UI's default look, tightened for small screens and with visible
// keyboard focus. Served same-origin, so the default Helmet CSP applies.
const customCss = `
  .swagger-ui .topbar { display: none; }
  .swagger-ui .information-container.wrapper { padding-top: 8px; }
  .swagger-ui .info { margin: 24px 0; }
  .swagger-ui .info .title { font-size: 1.75rem; }
  .swagger-ui .info .description p,
  .swagger-ui .opblock-description-wrapper p { font-size: 15px; line-height: 1.5; }
  .swagger-ui a:focus-visible,
  .swagger-ui button:focus-visible,
  .swagger-ui input:focus-visible,
  .swagger-ui select:focus-visible,
  .swagger-ui textarea:focus-visible { outline: 3px solid #1d4ed8; outline-offset: 2px; }
  @media (max-width: 600px) {
    .swagger-ui .wrapper { padding: 0 12px; }
    .swagger-ui .scheme-container { padding: 12px 0; }
    .swagger-ui .opblock .opblock-summary { flex-wrap: wrap; }
    .swagger-ui .opblock .opblock-summary-path { max-width: 100%; word-break: break-all; }
    .swagger-ui .opblock .opblock-summary-description { flex-basis: 100%; padding: 4px 0 0; }
    .swagger-ui table { display: block; overflow-x: auto; }
  }
`;

export default class DocsRoute {
  public router: express.Router;

  constructor() {
    this.router = express.Router();
    this.router.get('/openapi.json', (_req: Request, res: Response) => {
      res.json(openApiDocument);
    });
    this.router.use(
      '/',
      swaggerUi.serve,
      swaggerUi.setup(openApiDocument, {
        customSiteTitle: 'Loan API docs',
        customCss,
        swaggerOptions: {
          persistAuthorization: true,
          displayRequestDuration: true,
          docExpansion: 'list',
          defaultModelsExpandDepth: 0,
          tryItOutEnabled: true,
        },
      }),
    );
  }
}
