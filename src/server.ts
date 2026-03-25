import { AngularNodeAppEngine, createNodeRequestHandler, isMainModule, writeResponseToNodeResponse } from '@angular/ssr/node';
import express from 'express';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

app.use(express.static(browserDistFolder, {
  index: false,
  maxAge: '1y'
}));

app.use(async (req, res, next) => {
  try {
    const response = await angularApp.handle(req);
    if (response) {
      await writeResponseToNodeResponse(response, res);
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
});

if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] ? Number(process.env['PORT']) : 4000;
  app.listen(port, () => {
    console.log(`Node server listening on http://localhost:${port}`);
  });
}

export const reqHandler = createNodeRequestHandler(app);
