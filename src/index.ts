import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import Logger from './lib/logger.js';
import morganMiddleware from './middleware/morganMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT ?? '9001';

app.use(morganMiddleware);
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.send('Hello World!');
});

app.post('/', (req: Request, res: Response) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { message } = req.body;

  if (typeof message !== 'string') {
    return res.status(400).json({ message: '"message" must be a string.' });
  }

  const match = /\b\d{7}\b/.exec(message);
  const code = match ? match[0] : null;

  if (!code) {
    return res.status(400).json({
      message: 'Invalid input. A 7-digit code must be present in "message".',
    });
  }

  const output = {
    code,
    time: new Date().toISOString(),
  };

  const filePath = path.join(__dirname, 'data.json');

  fs.writeFile(filePath, JSON.stringify(output, null, 2), (err) => {
    if (err) {
      Logger.error('Failed to write file:', err);
      return res.status(500).json({ message: 'Failed to write file.' });
    }

    res.status(200).json({
      message: 'Data saved successfully.',
      saved: output,
    });
  });
});

app.listen(port, () => {
  Logger.info(`App listening on port ${port}`);
});
