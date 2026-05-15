import { google } from 'googleapis';
import fs from 'fs';

export class GoogleDriveService {
  private static driveClient: any;

  private static async getClient() {
    if (this.driveClient) return this.driveClient;

    const clientEmail = process.env.GOOGLE_DRIVE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!clientEmail || !privateKey) {
      console.warn('Google Drive credentials missing. Sync disabled.');
      return null;
    }

    try {
      console.log('Initializing Google Drive client with email:', clientEmail);
      const auth = new google.auth.JWT({
        email: clientEmail,
        key: privateKey as string,
        scopes: ['https://www.googleapis.com/auth/drive'],
      });

      this.driveClient = google.drive({ version: 'v3', auth: auth as any });
      return this.driveClient;
    } catch (error: any) {
      console.error('Failed to initialize Google Drive client:', error);
      return null;
    }
  }

  /**
   * Uploads a file to Google Drive, organized by user folder.
   */
  static async uploadFile(filePath: string, filename: string, userName: string) {
    const drive = await this.getClient();
    if (!drive) return;

    try {
      const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;
      if (!parentFolderId) {
        console.warn('GOOGLE_DRIVE_PARENT_FOLDER_ID missing. Sync disabled.');
        return;
      }

      // 1. Get or create user folder
      console.log(`Checking folder for user: "${userName}" in parent: ${parentFolderId}`);
      const userFolderId = await this.getOrCreateFolder(drive, userName, parentFolderId);

      // 2. Upload file
      console.log(`Uploading file "${filename}" to folder: ${userFolderId}`);
      const response = await drive.files.create({
        requestBody: {
          name: filename,
          parents: [userFolderId],
        },
        media: {
          body: fs.createReadStream(filePath),
        },
        fields: 'id',
        supportsAllDrives: true,
      });

      console.log(`✅ Synced to Google Drive: ${filename} (ID: ${response.data.id})`);
      return response.data.id;
    } catch (error: any) {
      console.error('❌ Google Drive Sync Error:', error.message || error);
    }
  }

  private static async getOrCreateFolder(drive: any, folderName: string, parentId: string) {
    // Search for existing folder
    const response = await drive.files.list({
      q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`,
      fields: 'files(id, name)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    if (response.data.files && response.data.files.length > 0) {
      return response.data.files[0].id;
    }

    // Create new folder
    const folderMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    };

    const folder = await drive.files.create({
      requestBody: folderMetadata,
      fields: 'id',
      supportsAllDrives: true,
    });

    return folder.data.id;
  }
}
