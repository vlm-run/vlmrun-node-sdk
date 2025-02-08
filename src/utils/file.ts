export const readFileFromPathAsFile = async (filePath: string): Promise<File> => {
    try {
        if (typeof window === 'undefined') {
            const fs = require("fs/promises");
            const path = require('path');

            const fileBuffer = await fs.readFile(filePath);
            const fileName = path.basename(filePath);
            return new File([fileBuffer], fileName, {
                type: 'application/pdf',
            });
        } else {
            throw new Error('File reading is not supported in the browser');
        }
    } catch (error: any) {
        throw new Error(`Error reading file at ${filePath}: ${error.message}`);
    }
}