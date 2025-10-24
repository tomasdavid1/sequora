#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuration
const CONVERTED_TEXTS_DIR = './converted-texts';
const DRY_RUN = false; // Set to false to actually upload
const EXCLUDE_LARGEST_FILES = 4; // Exclude top N largest files to fit within OpenAI limit

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Function to upload a text file to Supabase
async function uploadTextFile(filePath, fileName) {
  try {
    console.log(`📤 Uploading: ${fileName}`);
    
    // Read file content
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const buffer = Buffer.from(fileContent, 'utf8');
    
    if (DRY_RUN) {
      console.log(`  🧪 DRY RUN: Would upload ${buffer.length} bytes`);
      return { success: true, size: buffer.length, dryRun: true };
    }
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('kb')
      .upload(fileName, buffer, {
        contentType: 'text/plain',
        upsert: true // Overwrite if exists
      });
    
    if (error) {
      console.error(`  ❌ Upload failed:`, error.message);
      return { success: false, error: error.message };
    }
    
    console.log(`  ✅ Uploaded successfully`);
    console.log(`  📄 Size: ${buffer.length.toLocaleString()} bytes`);
    console.log(`  🔗 Path: ${data.path}`);
    
    return { success: true, size: buffer.length, path: data.path };
    
  } catch (error) {
    console.error(`  ❌ Error uploading ${fileName}:`, error.message);
    return { success: false, error: error.message };
  }
}

// Function to list existing files in KB bucket
async function listExistingFiles() {
  try {
    const { data, error } = await supabase.storage
      .from('kb')
      .list('', {
        limit: 100,
        sortBy: { column: 'name', order: 'asc' }
      });
    
    if (error) {
      console.error('❌ Error listing existing files:', error.message);
      return [];
    }
    
    return data.map(file => file.name);
  } catch (error) {
    console.error('❌ Error listing files:', error.message);
    return [];
  }
}

// Function to analyze character distribution
function analyzeFiles(textFiles) {
  console.log('\n📊 FILE SIZE ANALYSIS');
  console.log('=====================');
  
  let totalChars = 0;
  const fileStats = [];
  
  for (const file of textFiles) {
    const filePath = path.join(CONVERTED_TEXTS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const charCount = content.length;
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
    
    fileStats.push({
      name: file,
      chars: charCount,
      words: wordCount,
      percentage: 0 // Will be calculated after total is known
    });
    
    totalChars += charCount;
  }
  
  // Calculate percentages and sort by size
  fileStats.forEach(stat => {
    stat.percentage = ((stat.chars / totalChars) * 100).toFixed(1);
  });
  
  fileStats.sort((a, b) => b.chars - a.chars);
  
  console.log(`📋 Top 10 largest files:`);
  fileStats.slice(0, 10).forEach((stat, index) => {
    console.log(`${(index + 1).toString().padStart(2)}. ${stat.name}`);
    console.log(`    Characters: ${stat.chars.toLocaleString()} (${stat.percentage}%)`);
    console.log(`    Words: ${stat.words.toLocaleString()}`);
  });
  
  const OPENAI_LIMIT = 200000;
  console.log(`\n🤖 CONTEXT LIMIT ANALYSIS`);
  console.log(`=========================`);
  console.log(`Total characters: ${totalChars.toLocaleString()}`);
  console.log(`OpenAI limit: ${OPENAI_LIMIT.toLocaleString()}`);
  console.log(`Percentage used: ${((totalChars / OPENAI_LIMIT) * 100).toFixed(1)}%`);
  
  if (totalChars > OPENAI_LIMIT) {
    const excess = totalChars - OPENAI_LIMIT;
    console.log(`⚠️  Exceeds limit by: ${excess.toLocaleString()} characters`);
    
    // Suggest which files to exclude to get under limit
    let runningTotal = 0;
    let filesNeeded = 0;
    
    for (const stat of fileStats.reverse()) { // Start with smallest files
      runningTotal += stat.chars;
      filesNeeded++;
      if (runningTotal > OPENAI_LIMIT) {
        break;
      }
    }
    
    console.log(`\n💡 SUGGESTIONS:`);
    console.log(`- Could fit ~${filesNeeded - 1} files within limit`);
    console.log(`- Consider excluding largest files or splitting content`);
    console.log(`- Largest files to consider excluding:`);
    
    fileStats.reverse().slice(0, 5).forEach(stat => {
      console.log(`  - ${stat.name} (${stat.chars.toLocaleString()} chars, ${stat.percentage}%)`);
    });
  } else {
    console.log(`✅ Within limit! Room for ${(OPENAI_LIMIT - totalChars).toLocaleString()} more characters`);
  }
  
  return { totalChars, fileStats };
}

// Main upload function
async function main() {
  console.log('📤 Text Files to Supabase Uploader');
  console.log('===================================');
  
  if (DRY_RUN) {
    console.log('🧪 DRY RUN MODE - No actual uploads will be performed\n');
  }
  
  // Check if converted texts directory exists
  if (!fs.existsSync(CONVERTED_TEXTS_DIR)) {
    console.error(`❌ Converted texts directory not found: ${CONVERTED_TEXTS_DIR}`);
    console.log('Please run the PDF converter script first.');
    process.exit(1);
  }
  
  // Get all text files and analyze their sizes
  const allTextFiles = fs.readdirSync(CONVERTED_TEXTS_DIR)
    .filter(file => path.extname(file).toLowerCase() === '.txt');
  
  if (allTextFiles.length === 0) {
    console.error('❌ No text files found in converted texts directory');
    process.exit(1);
  }
  
  console.log(`📚 Found ${allTextFiles.length} text files total`);
  
  // Analyze file sizes first to determine which to exclude
  console.log('\n📊 ANALYZING FILE SIZES...');
  let totalChars = 0;
  const fileStats = [];
  
  for (const file of allTextFiles) {
    const filePath = path.join(CONVERTED_TEXTS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const charCount = content.length;
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
    
    fileStats.push({
      name: file,
      chars: charCount,
      words: wordCount
    });
    
    totalChars += charCount;
  }
  
  // Sort by size (largest first)
  fileStats.sort((a, b) => b.chars - a.chars);
  
  // Determine which files to exclude and which to upload
  const filesToExclude = fileStats.slice(0, EXCLUDE_LARGEST_FILES);
  const filesToUpload = fileStats.slice(EXCLUDE_LARGEST_FILES);
  
  const excludedChars = filesToExclude.reduce((sum, file) => sum + file.chars, 0);
  const uploadChars = filesToUpload.reduce((sum, file) => sum + file.chars, 0);
  
  console.log(`\n🎯 UPLOAD STRATEGY:`);
  console.log(`===================`);
  console.log(`📤 Files to upload: ${filesToUpload.length}`);
  console.log(`🚫 Files to exclude: ${filesToExclude.length}`);
  console.log(`📄 Upload size: ${uploadChars.toLocaleString()} characters`);
  console.log(`💾 Excluded size: ${excludedChars.toLocaleString()} characters`);
  
  const OPENAI_LIMIT = 200000;
  console.log(`\n🤖 OPENAI LIMIT CHECK:`);
  console.log(`======================`);
  console.log(`Upload size: ${uploadChars.toLocaleString()} / ${OPENAI_LIMIT.toLocaleString()} characters`);
  console.log(`Percentage used: ${((uploadChars / OPENAI_LIMIT) * 100).toFixed(1)}%`);
  
  if (uploadChars <= OPENAI_LIMIT) {
    console.log(`✅ Within limit! Room for ${(OPENAI_LIMIT - uploadChars).toLocaleString()} more characters`);
  } else {
    console.log(`⚠️  Still exceeds limit by ${(uploadChars - OPENAI_LIMIT).toLocaleString()} characters`);
  }
  
  if (filesToExclude.length > 0) {
    console.log(`\n🚫 EXCLUDED FILES (largest ${EXCLUDE_LARGEST_FILES}):`);
    filesToExclude.forEach((file, index) => {
      console.log(`${index + 1}. ${file.name} (${file.chars.toLocaleString()} chars)`);
    });
  }
  
  // Use only the files we want to upload
  const textFiles = filesToUpload.map(f => f.name);
  
  console.log(`\n📋 FILES TO UPLOAD (${textFiles.length}):`);
  filesToUpload.forEach((file, index) => {
    console.log(`${index + 1}. ${file.name} (${file.chars.toLocaleString()} chars)`);
  });
  
  // List existing files in bucket
  console.log('\n🔍 Checking existing files in KB bucket...');
  const existingFiles = await listExistingFiles();
  console.log(`📁 Found ${existingFiles.length} existing files in bucket`);
  
  if (existingFiles.length > 0) {
    console.log('Existing files:');
    existingFiles.forEach(file => console.log(`  - ${file}`));
  }
  
  // Check for conflicts
  const conflicts = textFiles.filter(file => existingFiles.includes(file));
  if (conflicts.length > 0) {
    console.log(`\n⚠️  Files that will be overwritten:`);
    conflicts.forEach(file => console.log(`  - ${file}`));
  }
  
  if (DRY_RUN) {
    console.log('\n🧪 DRY RUN COMPLETE');
    console.log('To perform actual upload, set DRY_RUN = false in the script');
    return;
  }
  
  // Perform uploads
  console.log(`\n📤 Uploading ${textFiles.length} files...\n`);
  
  const results = [];
  let totalBytes = 0;
  
  for (const fileName of textFiles) {
    const filePath = path.join(CONVERTED_TEXTS_DIR, fileName);
    const result = await uploadTextFile(filePath, fileName);
    results.push({ fileName, ...result });
    
    if (result.success && !result.dryRun) {
      totalBytes += result.size;
    }
    
    console.log(''); // Empty line for readability
  }
  
  // Summary
  console.log('📊 UPLOAD SUMMARY');
  console.log('=================');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful uploads: ${successful.length}`);
  console.log(`❌ Failed uploads: ${failed.length}`);
  console.log(`📦 Total data uploaded: ${totalBytes.toLocaleString()} bytes`);
  
  if (failed.length > 0) {
    console.log(`\n❌ FAILED UPLOADS:`);
    failed.forEach(result => {
      console.log(`${result.fileName}: ${result.error}`);
    });
  }
  
  console.log('\n✅ Upload process complete!');
  console.log('Files are now available in the Supabase KB bucket and will appear in the admin dashboard.');
}

// Check environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  console.error('Please check your .env file.');
  process.exit(1);
}

// Run the script
main().catch(console.error);