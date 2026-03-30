import { promisify } from 'util';
import { execFile } from 'child_process';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';

const execFileAsync = promisify(execFile);

export interface ResumeVisualInput {
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
  base64: string;
  source: 'image-upload' | 'pdf-preview';
}

const DIRECT_IMAGE_TYPES: Array<ResumeVisualInput['mimeType']> = ['image/png', 'image/jpeg', 'image/webp'];

const fileExists = async (filePath: string) => {
  try {
    await readFile(filePath);
    return true;
  } catch {
    return false;
  }
};

const readFirstPngFromDirectory = async (directory: string) => {
  const entries = await readdir(directory);
  const pngEntry = entries.find((entry) => entry.toLowerCase().endsWith('.png'));
  if (!pngEntry) {
    return null;
  }
  return readFile(path.join(directory, pngEntry));
};

const renderPdfPreviewWithMacTools = async (pdfBuffer: Buffer): Promise<Buffer | null> => {
  if (process.platform !== 'darwin') {
    return null;
  }

  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'resume-visual-'));
  const inputPath = path.join(tempDir, 'resume.pdf');
  const qlmanageOutputDir = path.join(tempDir, 'qlmanage');
  const sipsOutputPath = path.join(tempDir, 'resume-preview.png');

  try {
    await writeFile(inputPath, pdfBuffer);

    try {
      await execFileAsync('/usr/bin/qlmanage', ['-t', '-s', '1800', '-o', qlmanageOutputDir, inputPath]);
      const qlmanagePreview = await readFirstPngFromDirectory(qlmanageOutputDir);
      if (qlmanagePreview) {
        return qlmanagePreview;
      }
    } catch {
      // Fall through to sips.
    }

    try {
      await execFileAsync('/usr/bin/sips', ['-s', 'format', 'png', inputPath, '--out', sipsOutputPath]);
      if (await fileExists(sipsOutputPath)) {
        return readFile(sipsOutputPath);
      }
    } catch {
      return null;
    }

    return null;
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
};

export const buildResumeVisualInput = async (
  fileBuffer: Buffer,
  mimeType: string
): Promise<ResumeVisualInput | null> => {
  if (DIRECT_IMAGE_TYPES.includes(mimeType as ResumeVisualInput['mimeType'])) {
    return {
      mimeType: mimeType as ResumeVisualInput['mimeType'],
      base64: fileBuffer.toString('base64'),
      source: 'image-upload',
    };
  }

  if (mimeType === 'application/pdf') {
    const previewBuffer = await renderPdfPreviewWithMacTools(fileBuffer);
    if (!previewBuffer) {
      return null;
    }

    return {
      mimeType: 'image/png',
      base64: previewBuffer.toString('base64'),
      source: 'pdf-preview',
    };
  }

  return null;
};
