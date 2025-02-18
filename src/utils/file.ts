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
            throw new Error("File reading is not supported in the browser");
        }
    } catch (error: any) {
        throw new Error(`Error reading file at ${filePath}: ${error.message}`);
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
        throw new Error("createArchive is not supported in a browser environment.");
      }
    } catch (error: any) {
      throw new Error(`Error creating archive for ${directory}: ${error.message}`);
    }
  };
  