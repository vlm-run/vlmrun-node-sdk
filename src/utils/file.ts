import path from "path";
import fs from "fs/promises";

export const readFileFromPathAsFile = async (filePath: string): Promise<File> => {
    try {
        const fileBuffer = await fs.readFile(filePath);
        const fileName = path.basename(filePath);
        return new File([fileBuffer], fileName, {
            type: 'application/pdf',
        });
    } catch (error: any) {
        throw new Error(`Error reading file at ${filePath}: ${error.message}`);
    }
}