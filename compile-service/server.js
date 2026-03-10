/**
 * LaTeX Compile Service for Xolo LaTeX Editor
 * Uses MiKTeX on Windows to compile LaTeX to PDF
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const os = require('os');

const PORT = process.env.PORT || 3001;

// Find pdflatex executable
function findPdfLatex() {
  const possiblePaths = [
    'pdflatex',
    path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'MiKTeX', 'miktex', 'bin', 'x64', 'pdflatex.exe'),
    'C:\\Program Files\\MiKTeX\\miktex\\bin\\x64\\pdflatex.exe',
    'C:\\Program Files (x86)\\MiKTeX\\miktex\\bin\\x64\\pdflatex.exe',
  ];
  
  for (const p of possiblePaths) {
    try {
      if (p === 'pdflatex') {
        execSync('pdflatex --version', { stdio: 'ignore' });
        return 'pdflatex';
      } else if (fs.existsSync(p)) {
        return `"${p}"`;
      }
    } catch (e) {
      // Continue to next
    }
  }
  return null;
}

const PDFLATEX = findPdfLatex();

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok',
      latexInstalled: !!PDFLATEX,
      latexPath: PDFLATEX || 'not found'
    }));
    return;
  }

  // Compile endpoint
  if (req.method === 'POST' && req.url === '/compile') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const { files = [] } = JSON.parse(body);
        
        if (!files.length) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'No files provided' }));
          return;
        }

        if (!PDFLATEX) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'LaTeX not found. Please install MiKTeX.' }));
          return;
        }

        // Find main .tex file
        const mainFile = files.find(f => f.path.endsWith('.tex'));
        if (!mainFile) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'No .tex file provided' }));
          return;
        }

        // Create temp directory
        const tmpDir = path.join(os.tmpdir(), `latex-${Date.now()}`);
        fs.mkdirSync(tmpDir, { recursive: true });

        // Write all files to temp dir
        for (const file of files) {
          // Decode escaped newlines if present (handle JSON serialization issues)
          let content = file.content;
          if (content.includes('\\n')) {
            content = content.replace(/\\n/g, '\n');
          }
          if (content.includes('\\r\\n')) {
            content = content.replace(/\\r\\n/g, '\n');
          }
          
          const filePath = path.join(tmpDir, file.path);
          const fileDir = path.dirname(filePath);
          if (!fs.existsSync(fileDir)) {
            fs.mkdirSync(fileDir, { recursive: true });
          }
          fs.writeFileSync(filePath, file.content);
        }

        const texFileName = path.basename(mainFile.path);
        const texFilePath = path.join(tmpDir, texFileName);

        console.log(`Compiling ${texFileName} in ${tmpDir}...`);

        // Run pdflatex
        try {
          execSync(`${PDFLATEX} -interaction=nonstopmode -halt-on-error "${texFilePath}"`, {
            cwd: tmpDir,
            stdio: 'pipe',
            timeout: 60000
          });

          // Try to find the PDF
          const pdfBaseName = texFileName.replace('.tex', '.pdf');
          const pdfPath = path.join(tmpDir, pdfBaseName);

          if (fs.existsSync(pdfPath)) {
            const pdfBuffer = fs.readFileSync(pdfPath);
            
            // Clean up
            fs.rmSync(tmpDir, { recursive: true, force: true });

            res.writeHead(200, { 'Content-Type': 'application/pdf' });
            res.end(pdfBuffer);
            console.log('PDF compiled successfully');
          } else {
            // Check for log file for errors
            const logFile = path.join(tmpDir, texFileName.replace('.tex', '.log'));
            let errorMsg = 'PDF not generated';
            if (fs.existsSync(logFile)) {
              const log = fs.readFileSync(logFile, 'utf8');
              const errorLines = log.split('\n').filter(l => l.includes('Error') || l.includes('!'));
              if (errorLines.length > 0) {
                errorMsg = errorLines.slice(0, 5).join('\n');
              }
            }
            
            fs.rmSync(tmpDir, { recursive: true, force: true });
            
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: errorMsg }));
          }
        } catch (compileError) {
          console.error('Compile error:', compileError.message);
          
          // Try to get log file
          const logFile = path.join(tmpDir, texFileName.replace('.tex', '.log'));
          let errorDetails = compileError.message;
          
          if (fs.existsSync(logFile)) {
            const log = fs.readFileSync(logFile, 'utf8');
            const lines = log.split('\n');
            const errorStart = lines.findIndex(l => l.includes('Here is how much of TeX'));
            if (errorStart >= 0) {
              errorDetails = lines.slice(errorStart, errorStart + 20).join('\n');
            }
          }
          
          fs.rmSync(tmpDir, { recursive: true, force: true });
          
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            error: 'Compilation failed',
            details: errorDetails
          }));
        }

      } catch (error) {
        console.error('Server error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          error: 'Internal server error',
          message: error.message 
        }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`LaTeX compile service running on port ${PORT}`);
  console.log(`LaTeX executable: ${PDFLATEX || 'NOT FOUND'}`);
});
