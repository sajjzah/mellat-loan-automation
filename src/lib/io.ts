import fs from 'fs';
import path from 'path';

// Resolve the file path for data.json
const filePath = path.resolve(__dirname, '..', 'data.json');

// Write data to the file
const writeToFile = async (data: {
  code: string;
  time: string;
}): Promise<void> => {
  await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
};

// Read data from the file
const readFromFile = async (): Promise<{ code: string; time: string }> => {
  const data = await fs.promises.readFile(filePath, 'utf8');
  return JSON.parse(data) as { code: string; time: string };
};

export { readFromFile, writeToFile };
