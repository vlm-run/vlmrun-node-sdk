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
