import fs from 'node:fs';
import path from 'node:path';
import express, { Request, Response } from 'express';
import { marked } from 'marked';

export default class HomeRoute {
  public router: express.Router;

  constructor() {
    this.router = express.Router();
    this.initRoutes();
  }

  private initRoutes(): void {
    this.router.get('/', this.home);
  }

  private home = async (_req: Request, res: Response): Promise<void> => {
    const markdownPath = path.join(__dirname, '..', '..', 'README.md');
    try {
      const data = fs.readFileSync(markdownPath, 'utf8');
      const html = marked(data);
      res.send(html);
    } catch (_) {
      res.send(`Hello world...👋\nWelcome to NodeJs TypeScript REST Boilerplate`);
    }
  };
}
