const express = require('express');
const multer = require('multer');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

const app = express();
const storage = multer.diskStorage({
    destination: (req,file,cb)=>{
        cb(null,'uploads/');
    },
    filename: (req,file,cb)=>{
        cb(null, file.originalname );
    }
});

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

//new code added
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});
//working correctly
app.post('/upload', multer({storage: storage}).array('files'), (req, res) => {
    const files = req.files;

    if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded.' });
    }

    res.json({ message: 'File uploaded successfully.' });
});


//Need to debug
app.post('/encrypt', (req, res) => {
    try {
        const { keyType, charKey } = req.body;

        const files = fs.readdirSync('uploads');
        if (files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded for encryption.' });
        }
        // const fileStats = files.map(file =>{
        //   const filePath = path.join('uploads', file);
        //   const stats = fs.statSync(filePath);
        //   return { file: filePath, mtime: stats.mtime };
        // });
        // fileStats.sort((a, b) => b.mtime - a.mtime);
        // const inputFileName = fileStats[0]?.file || null;
        const inputFileName = files[0];
        const inputFilePath = path.join('uploads', inputFileName);
        const outputFileName = 'enc_' + inputFileName;
        const outputFilePath = path.join('uploads_output', outputFileName);
        console.log(inputFileName, outputFileName, inputFilePath, outputFilePath)
        
        const inputs = ['1', inputFilePath, outputFilePath, keyType, charKey];
      
        //For input variable
        const inputArgs = inputs.join(' ')+'\n';
        //call AES Script
        const aesProcess = spawn('AES');
        //Sending Input Variables
        aesProcess.stdin.write(inputArgs);
        aesProcess.stdin.end();

        //for print the values
        aesProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(`stdout: ${output}\n`);
        })

        //for error
        aesProcess.stderr.on('data', (data)=>{
            console.error('stderr: error', data);
        })

        //for closing the statement
        aesProcess.on('close', (code) => {
            console.log(`AES.exe process exited with code ${code} and ${res}`);
            if (code !== 0) {
                return res.status(500).json({ error: 'Encryption failed.' });
            }
            res.status(200).send({ 'encryptedFile': outputFileName });
        })
        
    } catch (error) {
        console.log('Inside the error function',error);
        res.status(500).send(error);
    }
});

app.post('/decrypt', (req, res) => {
    try {
      const { keyType, charKey } = req.body;
  
      const files = fs.readdirSync('uploads');
      if (files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded for decryption.' });
      }
      // const fileStats = files.map(file =>{
      //   const filePath = path.join('uploads', file);
      //   const stats = fs.statSync(filePath);
      //   return { file: filePath, mtime: stats.mtime };
      // });
      // fileStats.sort((a, b) => b.mtime - a.mtime);
      // const inputFileName = fileStats[0]?.file || null;
      const inputFileName = files.find(file => file.startsWith('enc_'));
      if (!inputFileName) {
        return res.status(400).json({ error: 'No encrypted files found for decryption.' });
      }
      const inputFilePath = path.join('uploads', inputFileName);
      const outputFileName = 'dec_' + inputFileName;
      // const outputFileName = inputFileName.replace('enc_', 'dec_');
      const outputFilePath = path.join('uploads_output', outputFileName);
  
      const inputs = ['0', inputFilePath, outputFilePath, keyType, charKey];
  
      // For input variable
      const inputArgs = inputs.join(' ') + '\n';
      // Call AES Script for decryption
      const aesProcess = spawn('AES');
      // Sending Input Variables
      aesProcess.stdin.write(inputArgs);
      aesProcess.stdin.end();
  
      // For printing the values
      aesProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(`stdout: ${output}\n`);
      });
  
      // For error handling
      aesProcess.stderr.on('data', (data) => {
        console.error('stderr: error', data);
      });
  
      // For closing the statement
      aesProcess.on('close', (code) => {
        console.log(`AES.exe process exited with code ${code}`);
        if (code !== 0) {
          return res.status(500).json({ error: 'Decryption failed.' });
        }
        res.status(200).send({ 'decryptedFile': outputFileName });
      });
  
    } catch (error) {
      console.log('Inside the error function', error);
      res.status(500).send(error);
    }
  });


  function getLatestModifiedFile(directory) {
    const files = fs.readdirSync(directory);
    if (files.length === 0) return null;
    const fileStats = files.map(file => {
      const filePath = path.join(directory, file);
      const stats = fs.statSync(filePath);
      return { file: filePath, mtime: stats.mtime };
    });
    fileStats.sort((a, b) => b.mtime - a.mtime);
    return fileStats[0]?.file || null;
  }

app.get('/download/:filename', (req, res) => {
    // const filename = req.params.filename;
    const directoryPath = path.join(__dirname, 'uploads_output');
//     const filePath = path.join(__dirname, 'uploads', filename);
    const latestFile = getLatestModifiedFile(directoryPath);
    if (latestFile) {
      // Send the file for download
      res.download(latestFile, (err) => {
        if (err) {
          console.error(`Error downloading file: ${err}`);
          res.status(500).send('Error occurred during file download.');
        }
      });
    } else {
      res.status(404).send('No files available for download.');
    }
  });

//     if (fs.existsSync(filePath)) {
//         res.download(filePath);
//     } else {
//         res.status(404).send('File not found.');
//     }
// });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

