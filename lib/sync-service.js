import { getDb, withRetry } from './database.js';
import { isSupabaseConfigured, supabase, SYNC_CONFIG } from './supabase.js';

class SyncService {
  constructor() {
    this.isOnline = true;
    this.syncInProgress = false;
    this.lastSyncTime = null;
    this.syncListeners = new Set();
  }

  // Add listener for sync status changes
  addSyncListener(callback) {
    this.syncListeners.add(callback);
    return () => this.syncListeners.delete(callback);
  }

  // Notify all listeners of sync status changes
  notifyListeners(status, data = {}) {
    this.syncListeners.forEach(callback => {
      try {
        callback({ status, ...data });
      } catch (error) {
        console.error('Error in sync listener:', error);
      }
    });
  }

  // Check if Supabase is configured and online
  async checkConnection() {
    console.log('🔍 Checking Supabase connection...');
    
    if (!isSupabaseConfigured()) {
      console.error('❌ Supabase not configured - missing URL or API key');
      throw new Error('Supabase not configured');
    }

    console.log('✅ Supabase configuration found');
    console.log('📡 Testing connection to Supabase...');

    try {
      const startTime = Date.now();
      const { data, error } = await supabase.from('projects').select('count').limit(1);
      const responseTime = Date.now() - startTime;
      
      if (error) {
        console.error('❌ Supabase connection test failed:', error);
        throw error;
      }
      
      console.log(`✅ Supabase connection successful (${responseTime}ms)`);
      console.log('📊 Connection test response:', data);
      this.isOnline = true;
      return true;
    } catch (error) {
      console.error('❌ Connection check failed:', error);
      console.error('🔍 Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      this.isOnline = false;
      return false;
    }
  }

  // Get pending changes from SQLite
  async getPendingChanges() {
    return await withRetry(async () => {
      const db = getDb();
      try {
        const changes = await db.getAllAsync(`
          SELECT sm.*, sm.table_name, sm.record_id, sm.sync_status, sm.supabase_id
          FROM sync_metadata sm
          WHERE sm.sync_status IN ('pending', 'error')
          ORDER BY sm.last_modified ASC
          LIMIT ?
        `, [SYNC_CONFIG.BATCH_SIZE]);
        return changes;
      } catch (error) {
        console.log('Sync metadata table not available, returning empty changes');
        return [];
      }
    });
  }

  // Get local record data
  async getLocalRecord(tableName, recordId) {
    return await withRetry(async () => {
      const db = getDb();
      const record = await db.getFirstAsync(`SELECT * FROM ${tableName} WHERE id = ?`, [recordId]);
      return record;
    });
  }

  // Update sync metadata
  async updateSyncMetadata(tableName, recordId, updates) {
    return await withRetry(async () => {
      const db = getDb();
      const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const values = [...Object.values(updates), tableName, recordId];
      
      await db.runAsync(`
        UPDATE sync_metadata 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE table_name = ? AND record_id = ?
      `, values);
    });
  }

  // Insert sync metadata
  async insertSyncMetadata(tableName, recordId, supabaseId = null) {
    return await withRetry(async () => {
      const db = getDb();
      try {
        await db.runAsync(`
          INSERT OR REPLACE INTO sync_metadata 
          (table_name, record_id, sync_status, supabase_id, last_modified, created_at, updated_at)
          VALUES (?, ?, 'pending', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [tableName, recordId, supabaseId]);
      } catch (error) {
        console.log('Sync metadata table not available, skipping metadata tracking');
      }
    });
  }

  // Log sync operation
  async logSyncOperation(syncType, status, message, recordsSynced = 0, errorDetails = null) {
    return await withRetry(async () => {
      const db = getDb();
      try {
        await db.runAsync(`
          INSERT INTO sync_log (sync_type, status, message, records_synced, error_details, started_at, completed_at)
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [syncType, status, message, recordsSynced, errorDetails]);
      } catch (error) {
        console.log('Sync log table not available, skipping log entry');
      }
    });
  }

  // Upload local changes to Supabase
  async uploadToSupabase() {
    console.log('📤 Starting upload to Supabase...');
    const changes = await this.getPendingChanges();
    console.log(`📤 Found ${changes.length} pending changes to upload`);
    
    if (changes.length === 0) {
      console.log('📤 No pending changes to upload');
      return 0;
    }
    
    let uploadedCount = 0;
    let errorCount = 0;

    for (const change of changes) {
      try {
        console.log(`📤 Processing ${change.table_name}:${change.record_id} (sync_status: ${change.sync_status})`);
        
        const localRecord = await this.getLocalRecord(change.table_name, change.record_id);
        console.log(`📤 Local record data:`, localRecord);
        
        if (!localRecord) {
          // Record was deleted locally, mark for deletion on Supabase
          console.log(`📤 Record deleted locally, marking for deletion on Supabase`);
          if (change.supabase_id) {
            console.log(`📤 Deleting record ${change.supabase_id} from Supabase table ${change.table_name}`);
            const deleteResult = await supabase
              .from(change.table_name)
              .delete()
              .eq('id', change.supabase_id);
            
            console.log(`📤 Delete result:`, deleteResult);
            if (deleteResult.error) throw deleteResult.error;
            
            console.log(`✅ Successfully deleted record ${change.supabase_id} from Supabase`);
          }
          
          await this.updateSyncMetadata(change.table_name, change.record_id, {
            sync_status: 'synced'
          });
          uploadedCount++;
          continue;
        }

        // Prepare data for Supabase (exclude local id, use supabase_id if exists)
        const supabaseData = { ...localRecord };
        delete supabaseData.id;
        console.log(`📤 Prepared data for Supabase upload:`, supabaseData);

        let result;
        const startTime = Date.now();
        
        if (change.supabase_id) {
          // Update existing record
          console.log(`📤 Updating existing record ${change.supabase_id} in table ${change.table_name}`);
          result = await supabase
            .from(change.table_name)
            .update(supabaseData)
            .eq('id', change.supabase_id)
            .select()
            .single();
        } else {
          // Create new record
          console.log(`📤 Creating new record in table ${change.table_name}`);
          result = await supabase
            .from(change.table_name)
            .insert(supabaseData)
            .select()
            .single();
        }

        const responseTime = Date.now() - startTime;
        console.log(`📤 Supabase response (${responseTime}ms):`, result);
        
        if (result.error) {
          console.error(`❌ Supabase operation failed:`, result.error);
          throw result.error;
        }

        console.log(`✅ Successfully ${change.supabase_id ? 'updated' : 'created'} record in Supabase:`, result.data);

        // Update sync metadata with Supabase ID
        await this.updateSyncMetadata(change.table_name, change.record_id, {
          sync_status: 'synced',
          supabase_id: result.data.id
        });

        uploadedCount++;
        console.log(`✅ Uploaded ${change.table_name}:${change.record_id} -> Supabase ID: ${result.data.id}`);
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Error uploading ${change.table_name}:${change.record_id}:`, error);
        console.error(`🔍 Error details:`, {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          status: error.status
        });
        
        await this.updateSyncMetadata(change.table_name, change.record_id, {
          sync_status: 'error'
        });
      }
    }

    console.log(`📤 Upload completed: ${uploadedCount} successful, ${errorCount} errors`);
    return uploadedCount;
  }

  // Download changes from Supabase
  async downloadFromSupabase() {
    console.log('📥 Starting download from Supabase...');
    let downloadedCount = 0;
    let errorCount = 0;

    for (const tableName of SYNC_CONFIG.TABLES) {
      try {
        console.log(`📥 Downloading from table: ${tableName}`);
        
        // For now, we'll download all records since we don't have updated_at columns
        // In a production app, you'd want to add updated_at columns to Supabase
        const startTime = Date.now();
        const { data, error } = await supabase.from(tableName).select('*');
        const responseTime = Date.now() - startTime;
        
        console.log(`📥 Supabase query response (${responseTime}ms):`, { data, error });
        
        if (error) {
          console.error(`❌ Error querying Supabase table ${tableName}:`, error);
          throw error;
        }

        if (!data || data.length === 0) {
          console.log(`📥 No data found in table ${tableName}`);
          continue;
        }

        console.log(`📥 Found ${data.length} records in table ${tableName}`);

        // Process each record
        for (const supabaseRecord of data) {
          try {
            console.log(`📥 Processing record ${supabaseRecord.id} from table ${tableName}:`, supabaseRecord);
            
            await withRetry(async () => {
              const db = getDb();
              
              // Check if record exists locally
              const existingRecord = await db.getFirstAsync(
                `SELECT id FROM ${tableName} WHERE id = ?`,
                [supabaseRecord.id]
              );

              if (existingRecord) {
                console.log(`📥 Updating existing local record ${supabaseRecord.id}`);
                // Update existing record - only update fields that exist in local schema
                const localColumns = await this.getLocalTableColumns(tableName);
                const updateFields = Object.keys(supabaseRecord)
                  .filter(key => key !== 'id' && localColumns.includes(key))
                  .map(key => `${key} = ?`)
                  .join(', ');
                
                const updateValues = Object.keys(supabaseRecord)
                  .filter(key => key !== 'id' && localColumns.includes(key))
                  .map(key => supabaseRecord[key]);

                console.log(`📥 Update fields: ${updateFields}`);
                console.log(`📥 Update values:`, updateValues);

                if (updateFields) {
                  await db.runAsync(
                    `UPDATE ${tableName} SET ${updateFields} WHERE id = ?`,
                    [...updateValues, supabaseRecord.id]
                  );
                  console.log(`✅ Updated local record ${supabaseRecord.id}`);
                }
              } else {
                console.log(`📥 Inserting new local record ${supabaseRecord.id}`);
                // Insert new record - only insert fields that exist in local schema
                const localColumns = await this.getLocalTableColumns(tableName);
                const fieldsToInsert = Object.keys(supabaseRecord)
                  .filter(key => localColumns.includes(key));
                
                console.log(`📥 Fields to insert:`, fieldsToInsert);
                
                if (fieldsToInsert.length > 0) {
                  const fields = fieldsToInsert.join(', ');
                  const placeholders = fieldsToInsert.map(() => '?').join(', ');
                  const values = fieldsToInsert.map(key => supabaseRecord[key]);

                  console.log(`📥 Insert query: INSERT INTO ${tableName} (${fields}) VALUES (${placeholders})`);
                  console.log(`📥 Insert values:`, values);

                  await db.runAsync(
                    `INSERT INTO ${tableName} (${fields}) VALUES (${placeholders})`,
                    values
                  );
                  console.log(`✅ Inserted new local record ${supabaseRecord.id}`);
                }
              }

              // Update sync metadata
              await this.updateSyncMetadata(tableName, supabaseRecord.id, {
                sync_status: 'synced',
                supabase_id: supabaseRecord.id
              });
            });

            downloadedCount++;
            console.log(`✅ Successfully processed record ${supabaseRecord.id} from ${tableName}`);
            
          } catch (error) {
            errorCount++;
            console.error(`❌ Error processing ${tableName} record ${supabaseRecord.id}:`, error);
            console.error(`🔍 Error details:`, {
              message: error.message,
              code: error.code,
              details: error.details,
              hint: error.hint
            });
          }
        }
        
        console.log(`📥 Completed processing table ${tableName}: ${downloadedCount} successful, ${errorCount} errors`);
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Error downloading from ${tableName}:`, error);
        console.error(`🔍 Error details:`, {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
      }
    }

    console.log(`📥 Download completed: ${downloadedCount} successful, ${errorCount} errors`);
    return downloadedCount;
  }

  // Helper method to get local table columns
  async getLocalTableColumns(tableName) {
    return await withRetry(async () => {
      const db = getDb();
      const result = await db.getAllAsync(`PRAGMA table_info(${tableName})`);
      return result.map(col => col.name);
    });
  }

  // Main sync function
  async sync(force = false) {
    const syncStartTime = Date.now();
    console.log('🔄 Starting sync operation...');
    
    if (this.syncInProgress && !force) {
      console.log('⚠️ Sync already in progress, skipping');
      return { success: false, message: 'Sync already in progress' };
    }

    this.syncInProgress = true;
    this.notifyListeners(SYNC_CONFIG.SYNC_STATUS.SYNCING, { message: 'Starting sync...' });

    try {
      console.log('🔍 Step 1: Checking Supabase connection...');
      // Check connection
      const isConnected = await this.checkConnection();
      if (!isConnected) {
        throw new Error('No internet connection or Supabase unavailable');
      }

      let uploadedCount = 0;
      let downloadedCount = 0;

      console.log('📤 Step 2: Uploading local changes to Supabase...');
      // Upload local changes
      this.notifyListeners(SYNC_CONFIG.SYNC_STATUS.SYNCING, { message: 'Uploading changes...' });
      uploadedCount = await this.uploadToSupabase();

      console.log('📥 Step 3: Downloading changes from Supabase...');
      // Download remote changes
      this.notifyListeners(SYNC_CONFIG.SYNC_STATUS.SYNCING, { message: 'Downloading changes...' });
      downloadedCount = await this.downloadFromSupabase();

      this.lastSyncTime = new Date();
      const totalSyncTime = Date.now() - syncStartTime;
      
      console.log(`✅ Sync completed successfully in ${totalSyncTime}ms`);
      console.log(`📊 Sync summary: Uploaded ${uploadedCount}, Downloaded ${downloadedCount}`);
      
      // Log successful sync
      await this.logSyncOperation(
        'full_sync',
        'success',
        `Sync completed successfully. Uploaded: ${uploadedCount}, Downloaded: ${downloadedCount}`,
        uploadedCount + downloadedCount
      );

      this.notifyListeners(SYNC_CONFIG.SYNC_STATUS.SUCCESS, {
        message: `Sync completed. Uploaded: ${uploadedCount}, Downloaded: ${downloadedCount}`,
        uploadedCount,
        downloadedCount,
        lastSyncTime: this.lastSyncTime
      });

      return {
        success: true,
        uploadedCount,
        downloadedCount,
        lastSyncTime: this.lastSyncTime,
        syncDuration: totalSyncTime
      };

    } catch (error) {
      const totalSyncTime = Date.now() - syncStartTime;
      console.error(`❌ Sync failed after ${totalSyncTime}ms:`, error);
      console.error('🔍 Sync error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        status: error.status,
        stack: error.stack
      });
      
      // Log failed sync
      await this.logSyncOperation(
        'full_sync',
        'error',
        `Sync failed: ${error.message}`,
        0,
        error.stack
      );

      this.notifyListeners(SYNC_CONFIG.SYNC_STATUS.ERROR, {
        message: `Sync failed: ${error.message}`,
        error: error.message
      });

      return {
        success: false,
        error: error.message,
        syncDuration: totalSyncTime
      };
    } finally {
      this.syncInProgress = false;
      console.log('🔄 Sync operation completed');
    }
  }

  // Get sync status
  getSyncStatus() {
    return {
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress,
      lastSyncTime: this.lastSyncTime,
      isConfigured: isSupabaseConfigured()
    };
  }

  // Debug function to check Supabase data directly
  async debugSupabaseData() {
    console.log('🔍 Debugging Supabase data...');
    
    if (!isSupabaseConfigured()) {
      console.error('❌ Supabase not configured');
      return null;
    }

    try {
      const results = {};
      
      for (const tableName of SYNC_CONFIG.TABLES) {
        console.log(`🔍 Checking table: ${tableName}`);
        const startTime = Date.now();
        
        const { data, error } = await supabase.from(tableName).select('*');
        const responseTime = Date.now() - startTime;
        
        if (error) {
          console.error(`❌ Error querying ${tableName}:`, error);
          results[tableName] = { error: error.message, records: 0 };
        } else {
          console.log(`✅ Table ${tableName}: ${data?.length || 0} records (${responseTime}ms)`);
          results[tableName] = { 
            records: data?.length || 0, 
            data: data,
            responseTime 
          };
          
          // Log sample data for each table
          if (data && data.length > 0) {
            console.log(`📊 Sample data from ${tableName}:`, data[0]);
          }
        }
      }
      
      console.log('📊 Supabase data summary:', results);
      return results;
      
    } catch (error) {
      console.error('❌ Error debugging Supabase data:', error);
      return { error: error.message };
    }
  }

  // Export all SQLite data to Supabase
  async exportAllDataToSupabase(options = {}) {
    const {
      clearSupabaseFirst = false,
      skipExisting = true,
      batchSize = 10,
      onProgress = null
    } = options;

    console.log('📤 Starting complete data export to Supabase...');
    console.log('📋 Export options:', { clearSupabaseFirst, skipExisting, batchSize });

    const exportStartTime = Date.now();
    let totalExported = 0;
    let totalErrors = 0;
    const results = {};

    try {
      // Check connection first
      const isConnected = await this.checkConnection();
      if (!isConnected) {
        throw new Error('No connection to Supabase');
      }

      // Clear Supabase data if requested
      if (clearSupabaseFirst) {
        console.log('🗑️ Clearing existing Supabase data...');
        for (const tableName of SYNC_CONFIG.TABLES.reverse()) { // Reverse to handle foreign keys
          try {
            const { error } = await supabase.from(tableName).delete().neq('id', 0); // Delete all records
            if (error) throw error;
            console.log(`✅ Cleared table: ${tableName}`);
          } catch (error) {
            console.error(`❌ Error clearing table ${tableName}:`, error);
          }
        }
      }

      // Export data table by table
      for (const tableName of SYNC_CONFIG.TABLES) {
        console.log(`📤 Exporting table: ${tableName}`);
        
        try {
          const tableResults = await this.exportTableToSupabase(tableName, {
            skipExisting,
            batchSize,
            onProgress: (progress) => {
              if (onProgress) {
                onProgress({
                  table: tableName,
                  exported: progress.exported,
                  total: progress.total,
                  errors: progress.errors
                });
              }
            }
          });

          results[tableName] = tableResults;
          totalExported += tableResults.exported;
          totalErrors += tableResults.errors;

          console.log(`✅ Table ${tableName} export completed: ${tableResults.exported} exported, ${tableResults.errors} errors`);

        } catch (error) {
          console.error(`❌ Error exporting table ${tableName}:`, error);
          results[tableName] = { error: error.message, exported: 0, errors: 1 };
          totalErrors++;
        }
      }

      const totalTime = Date.now() - exportStartTime;
      console.log(`📤 Export completed in ${totalTime}ms`);
      console.log(`📊 Export summary: ${totalExported} records exported, ${totalErrors} errors`);

      return {
        success: true,
        totalExported,
        totalErrors,
        results,
        duration: totalTime
      };

    } catch (error) {
      const totalTime = Date.now() - exportStartTime;
      console.error(`❌ Export failed after ${totalTime}ms:`, error);
      
      return {
        success: false,
        error: error.message,
        totalExported,
        totalErrors,
        results,
        duration: totalTime
      };
    }
  }

  // Export a single table to Supabase
  async exportTableToSupabase(tableName, options = {}) {
    const { skipExisting = true, batchSize = 10, onProgress = null } = options;
    
    console.log(`📤 Exporting table ${tableName}...`);
    
    return await withRetry(async () => {
      const db = getDb();
      
      // Get all records from local table
      const localRecords = await db.getAllAsync(`SELECT * FROM ${tableName}`);
      console.log(`📤 Found ${localRecords.length} records in local table ${tableName}`);

      if (localRecords.length === 0) {
        console.log(`📤 No records to export from ${tableName}`);
        return { exported: 0, errors: 0, skipped: 0 };
      }

      let exported = 0;
      let errors = 0;
      let skipped = 0;

      // Process records in batches
      for (let i = 0; i < localRecords.length; i += batchSize) {
        const batch = localRecords.slice(i, i + batchSize);
        console.log(`📤 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(localRecords.length/batchSize)} (${batch.length} records)`);

        for (const record of batch) {
          try {
            // Check if record already exists in Supabase (if skipExisting is true)
            if (skipExisting) {
              const { data: existing } = await supabase
                .from(tableName)
                .select('id')
                .eq('id', record.id)
                .single();

              if (existing) {
                console.log(`⏭️ Skipping existing record ${record.id} in ${tableName}`);
                skipped++;
                continue;
              }
            }

            // Prepare data for Supabase (remove local-specific fields if any)
            const supabaseData = { ...record };
            
            console.log(`📤 Uploading record ${record.id} to ${tableName}:`, supabaseData);

            // Insert record to Supabase
            const { data, error } = await supabase
              .from(tableName)
              .insert(supabaseData)
              .select()
              .single();

            if (error) {
              console.error(`❌ Error uploading record ${record.id}:`, error);
              errors++;
            } else {
              console.log(`✅ Successfully uploaded record ${record.id} to Supabase`);
              exported++;
            }

            // Update progress
            if (onProgress) {
              onProgress({
                exported: exported + errors + skipped,
                total: localRecords.length,
                errors
              });
            }

          } catch (error) {
            console.error(`❌ Error processing record ${record.id}:`, error);
            errors++;
          }
        }
      }

      console.log(`📤 Table ${tableName} export completed: ${exported} exported, ${skipped} skipped, ${errors} errors`);
      return { exported, skipped, errors };
    });
  }

  // Simple function to immediately send all SQLite data to Supabase
  async sendAllDataToSupabase() {
    console.log('🚀 SENDING ALL SQLITE DATA TO SUPABASE...');
    
    try {
      // First, let's check what data we have locally
      console.log('📊 Checking local SQLite data...');
      const localData = await this.debugLocalData();
      console.log('📊 Local data summary:', {
        projects: localData.projects?.length || 0,
        tasks: localData.tasks?.length || 0,
        tags: localData.tags?.length || 0
      });

      // Check Supabase connection
      console.log('🔍 Checking Supabase connection...');
      const isConnected = await this.checkConnection();
      if (!isConnected) {
        throw new Error('Cannot connect to Supabase');
      }

      // Send data table by table
      const results = {};
      
      // Send projects first
      if (localData.projects && localData.projects.length > 0) {
        console.log(`📤 Sending ${localData.projects.length} projects to Supabase...`);
        for (const project of localData.projects) {
          console.log(`📤 Sending project:`, project);
          const { data, error } = await supabase
            .from('projects')
            .insert({
              id: project.id,
              name: project.name
            })
            .select()
            .single();
          
          if (error) {
            console.error(`❌ Error sending project ${project.id}:`, error);
            results.projects = { error: error.message };
          } else {
            console.log(`✅ Project sent successfully:`, data);
            results.projects = { success: true, count: localData.projects.length };
          }
        }
      }

      // Send tasks
      if (localData.tasks && localData.tasks.length > 0) {
        console.log(`📤 Sending ${localData.tasks.length} tasks to Supabase...`);
        for (const task of localData.tasks) {
          console.log(`📤 Sending task:`, task);
          const { data, error } = await supabase
            .from('tasks')
            .insert({
              id: task.id,
              project_id: task.project_id,
              title: task.title,
              description: task.description
            })
            .select()
            .single();
          
          if (error) {
            console.error(`❌ Error sending task ${task.id}:`, error);
            results.tasks = { error: error.message };
          } else {
            console.log(`✅ Task sent successfully:`, data);
            results.tasks = { success: true, count: localData.tasks.length };
          }
        }
      }

      // Send tags
      if (localData.tags && localData.tags.length > 0) {
        console.log(`📤 Sending ${localData.tags.length} tags to Supabase...`);
        for (const tag of localData.tags) {
          console.log(`📤 Sending tag:`, tag);
          const { data, error } = await supabase
            .from('tags')
            .insert({
              id: tag.id,
              name: tag.name
            })
            .select()
            .single();
          
          if (error) {
            console.error(`❌ Error sending tag ${tag.id}:`, error);
            results.tags = { error: error.message };
          } else {
            console.log(`✅ Tag sent successfully:`, data);
            results.tags = { success: true, count: localData.tags.length };
          }
        }
      }

      console.log('🎉 DATA SENDING COMPLETED!');
      console.log('📊 Results:', results);
      
      return {
        success: true,
        message: 'All data sent to Supabase',
        results
      };

    } catch (error) {
      console.error('❌ Error sending data to Supabase:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Test function to verify Supabase connectivity and data flow
  async testSupabaseConnection() {
    console.log('🧪 Testing Supabase connection and data flow...');
    
    try {
      // Test 1: Basic connection
      console.log('🧪 Test 1: Basic connection test');
      const connectionTest = await this.checkConnection();
      console.log('✅ Connection test result:', connectionTest);
      
      // Test 2: Query all tables
      console.log('🧪 Test 2: Query all tables');
      const dataTest = await this.debugSupabaseData();
      console.log('✅ Data query result:', dataTest);
      
      // Test 3: Test insert/update/delete (if we have data)
      console.log('🧪 Test 3: Testing CRUD operations');
      const testData = { name: 'Test Project ' + Date.now() };
      
      // Insert test
      console.log('🧪 Testing INSERT operation');
      const insertResult = await supabase.from('projects').insert(testData).select().single();
      console.log('📤 INSERT result:', insertResult);
      
      if (insertResult.data) {
        const testId = insertResult.data.id;
        
        // Update test
        console.log('🧪 Testing UPDATE operation');
        const updateResult = await supabase.from('projects').update({ name: testData.name + ' Updated' }).eq('id', testId).select().single();
        console.log('📤 UPDATE result:', updateResult);
        
        // Delete test
        console.log('🧪 Testing DELETE operation');
        const deleteResult = await supabase.from('projects').delete().eq('id', testId).select().single();
        console.log('📤 DELETE result:', deleteResult);
      }
      
      console.log('✅ All Supabase tests completed successfully');
      return { success: true, tests: ['connection', 'data_query', 'crud_operations'] };
      
    } catch (error) {
      console.error('❌ Supabase test failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Get sync history
  async getSyncHistory(limit = 10) {
    return await withRetry(async () => {
      const db = getDb();
      const history = await db.getAllAsync(`
        SELECT * FROM sync_log 
        ORDER BY started_at DESC 
        LIMIT ?
      `, [limit]);
      return history;
    });
  }

  // Clear sync metadata (useful for reset)
  async clearSyncMetadata() {
    return await withRetry(async () => {
      const db = getDb();
      await db.runAsync('DELETE FROM sync_metadata');
      await db.runAsync('DELETE FROM sync_log');
    });
  }

  // Debug function to check local data
  async debugLocalData() {
    console.log('📊 Debugging local SQLite data...');
    
    return await withRetry(async () => {
      const db = getDb();
      const results = {};

      for (const tableName of SYNC_CONFIG.TABLES) {
        try {
          console.log(`📊 Getting data from table: ${tableName}`);
          const data = await db.getAllAsync(`SELECT * FROM ${tableName}`);
          results[tableName] = data;
          console.log(`📊 Table ${tableName}: ${data.length} records`);
        } catch (error) {
          console.error(`❌ Failed to get local data from ${tableName}:`, error);
          results[tableName] = [];
        }
      }

      // Also get sync metadata if available
      try {
        const syncMetadata = await db.getAllAsync('SELECT * FROM sync_metadata');
        results.syncMetadata = syncMetadata;
        console.log(`📊 Sync metadata: ${syncMetadata.length} records`);
      } catch (error) {
        console.log('📊 Sync metadata table not available');
        results.syncMetadata = [];
      }

      console.log('📊 Local data debug completed:', results);
      return results;
    });
  }
}

// Export singleton instance
export const syncService = new SyncService();
export default syncService;
