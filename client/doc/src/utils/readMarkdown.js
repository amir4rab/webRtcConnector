import fs from 'fs';

export const readMarkdown = async ( fileName, subPath= null ) => {
  const basePath = process.cwd();

  // /../client/

  const fullPath = subPath === null ? `${basePath}/${fileName}.md` : `${basePath}/${subPath}/${fileName}.md`;
  const fileContents = fs.readFileSync(fullPath, 'utf8');

  return fileContents;
}

export default readMarkdown