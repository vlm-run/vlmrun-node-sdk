import { DependencyError } from '../client/exceptions';

export const readFileFromPathAsFile = async (filePath: string): Promise<File> => {
    try {
        if (typeof window === 'undefined') {
            const fs = require("fs/promises");
            const path = require("path");
            const mime = require("mime-types");

            const fileBuffer = await fs.readFile(filePath);
            const fileName = path.basename(filePath);
            const mimeType = mime.lookup(fileName) || "application/octet-stream";

            return new File([fileBuffer], fileName, { type: mimeType });
        } else {
            throw new DependencyError("File reading is not supported in the browser", "browser_limitation", "Use server-side file operations instead");
        }
    } catch (error: any) {
        throw new DependencyError(`Error reading file at ${filePath}: ${error.message}`, "file_operation_error", "Check file permissions and path");
    }
};

export const createArchive = async (directory: string, archiveName: string): Promise<string> => {
    try {
      if (typeof window === 'undefined') {
        const fs = require('fs');
        const path = require('path');
        const os = require('os');
        const tar = require('tar');
  
        const tarPath = path.join(os.tmpdir(), `${archiveName}.tar.gz`);
  
        const files = fs.readdirSync(directory);
  
        await tar.create(
          {
            gzip: true,
            file: tarPath,
            cwd: directory,
          },
          files
        );
  
        return tarPath;
      } else {
        throw new DependencyError("createArchive is not supported in a browser environment.", "browser_limitation", "Use server-side environment to create archives");
      }
    } catch (error: any) {
      throw new DependencyError(`Error creating archive for ${directory}: ${error.message}`, "file_operation_error", "Check directory permissions and path");
    }
  };
  