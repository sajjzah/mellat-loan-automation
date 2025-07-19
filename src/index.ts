import express, { Request, Response } from 'express';

import Logger from './lib/logger.js';
import morganMiddleware from './middleware/morganMiddleware.js';

const app = express();
const port = process.env.PORT ?? '9001';

app.use(morganMiddleware);

app.get('/', (req: Request, res: Response) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  Logger.info(`App listening on port ${port}`);
});
