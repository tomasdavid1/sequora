const fs = require('fs');

const filePath = './app/api/thread/route.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Remove excessive logging statements
const replacements = [
  // Remove detailed logging
  [/  console\.log\('\[API\] \/api\/thread - Calculated section scores:', sectionScores\);/, ''],
  [/  console\.log\('\[API\] \/api\/thread - Section bands:', sectionBands\);/, ''],
  [/  console\.log\('\[API\] \/api\/thread - Responses by category:', Object\.keys\(responsesByCategory\)\);/, ''],
  
  // Simplify prompt logging
  [/  \/\/ Get the active treatment prompt from the database \(admin-managed\)\s+console\.log\('\[API\] \/api\/thread - Fetching active treatment prompt from database\.\.\.'\);/, '  // Get the active treatment prompt from the database (admin-managed)'],
  [/    console\.log\('\[API\] \/api\/thread - Using admin-managed prompt:', \{\s+promptId: activePrompt\.id,\s+promptName: activePrompt\.name,\s+promptLength: activePrompt\.prompt\.length\s+\}\);/, '    console.log(\'[API] /api/thread - Using prompt:\', activePrompt.name);'],
  [/    console\.log\('\[API\] \/api\/thread - No active prompt found in database, using fallback'\);/, '    console.log(\'[API] /api/thread - Using fallback prompt\');'],
  [/  console\.log\('\[API\] \/api\/thread - Final prompt sent to AI:', prompt\);/, '  console.log(\'[API] /api/thread - Generated prompt length:\', prompt.length);'],
  
  // OpenAI API calls
  [/  \/\/ Step 1: Create thread with user's message\s+console\.log\('\[API\] \/api\/thread - Creating OpenAI thread with prompt length:', prompt\.length\);\s+console\.log\('\[API\] \/api\/thread - OpenAI API request details:', \{[^}]+\}\);/, '  // Step 1: Create thread with user\'s message\n  console.log(\'[API] /api/thread - Creating OpenAI thread\');'],
  
  // Response logging
  [/  console\.log\('\[API\] \/api\/thread - OpenAI thread creation response:', \{[^}]+\}\);/, ''],
  [/    console\.error\('\[API\] \/api\/thread - OpenAI thread creation failed:', \{[^}]+\}\);/, '    console.error(\'[API] /api/thread - OpenAI thread creation failed:\', threadRes.status, err);'],
  [/  console\.log\('\[API\] \/api\/thread - OpenAI thread created successfully:', \{[^}]+\}\);/, '  console.log(\'[API] /api/thread - Thread created:\', openaiThread.id);'],
  
  // Run creation
  [/  \/\/ Step 2: Start a run on that thread with the assistant_id\s+console\.log\('\[API\] \/api\/thread - Starting OpenAI run with assistant:', \{[^}]+\}\);/, '  // Step 2: Start a run on that thread with the assistant_id\n  console.log(\'[API] /api/thread - Starting AI run\');'],
  [/  console\.log\('\[API\] \/api\/thread - OpenAI run creation response:', \{[^}]+\}\);/, ''],
  [/    console\.error\('\[API\] \/api\/thread - OpenAI run creation failed:', \{[^}]+\}\);/, '    console.error(\'[API] /api/thread - OpenAI run creation failed:\', runRes.status, err);'],
  [/  console\.log\('\[API\] \/api\/thread - OpenAI run created successfully:', \{[^}]+\}\);/, '  console.log(\'[API] /api/thread - Run started:\', openaiRun.id);']
];

// Apply all replacements
for (const [pattern, replacement] of replacements) {
  content = content.replace(pattern, replacement);
}

// Write the cleaned content back
fs.writeFileSync(filePath, content);
console.log('Logging cleanup completed for thread route');
