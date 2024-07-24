const express = require('express');
const multer = require('multer');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
// var Popup = require('popups');

const app = express();
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
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
app.post('/upload', multer({ storage: storage }).array('files'), (req, res) => {
  const files = req.files;

  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded.' });
  }

  res.json({ message: 'File uploaded successfully.' });
});
function getModFile(directory) {
  const files = fs.readdirSync(directory)
  if (files.length === 0) {
    console.log('No files uploaded!');
  }
  const fileStats = files.map(file => {
    const filePath = path.join(directory, file);
    const stats = fs.statSync(filePath);
    return { file: filePath, mtime: stats.mtime };
  });
  fileStats.sort((a, b) => b.mtime - a.mtime);
  return fileStats[0]?.file || null;
}



//Need to debug
app.post('/encrypt', (req, res) => {
  try {
    const { keyType, charKey } = req.body;

    // const files = fs.readdirSync('uploads');
    // if (files.length === 0) {
      // return res.status(400).json({ error: 'No files uploaded for encryption.' });
    // }
    // const fileStats = files.map(file =>{
    //   const filePath = path.join('uploads', file);
    //   const stats = fs.statSync(filePath);
    //   return { file: filePath, mtime: stats.mtime };
    // });
    // fileStats.sort((a, b) => b.mtime - a.mtime);
    // const inputFileName = fileStats[0]?.file || null;
    const xoutput = getModFile('uploads');
    // console.log(xoutput);
    const inputFileName = path.basename(xoutput);
    const inputFilePath = path.join('uploads', inputFileName);
    const outputFileName = 'enc_' + inputFileName;
    const outputFilePath = path.join('uploads_output', outputFileName);
    console.log(inputFileName, outputFileName, inputFilePath, outputFilePath)

    const inputs = ['1', inputFilePath, outputFilePath, keyType, charKey];

    //For input variable
    const inputArgs = inputs.join(' ') + '\n';
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
    aesProcess.stderr.on('data', (data) => {
      console.error('stderr: error', data);
    })

    //for closing the statement
    aesProcess.on('close', (code) => {
      console.log(`AES.exe process exited with code ${code} and ${res}`);
    //   Popup.alert({
    //     content: 'File is ready to download!'
    // });
      if (code !== 0) {
        return res.status(500).json({ error: 'Encryption failed.' });
      }
      res.status(200).send({ 'encryptedFile': outputFileName });
    })
  } catch (error) {
    console.log('Inside the error function', error);
    res.status(500).send(error);
  }
});

app.post('/decrypt', (req, res) => {
  try {
    const { keyType, charKey } = req.body;

    // const files = fs.readdirSync('uploads');
    // if (files.length === 0) {
    //   return res.status(400).json({ error: 'No files uploaded for decryption.' });
    // }
    // const inputFileName = files.find(file => file.startsWith('enc_'));
    // if (!inputFileName) {
    //   return res.status(400).json({ error: 'No encrypted files found for decryption.' });
    // }
    const xoutput = getModFile('uploads');
    const inputFileName = path.basename(xoutput);
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
      console.log(`AES.exe process exited with code ${code} and ${res}`);
    //   Popup.alert({
    //     content: 'File is ready to download!'
    // });
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
function getLatestFile(directory, prefix) {
  const files = fs.readdirSync(directory).filter(file => file.startsWith(prefix));
  if (files.length === 0) return null;

  const fileStats = files.map(file => {
    const filePath = path.join(directory, file);
    const stats = fs.statSync(filePath);
    return { file: filePath, mtime: stats.mtime };
  });
  fileStats.sort((a, b) => b.mtime - a.mtime);
  return fileStats[0]?.file || null;
}
app.get('/download-encrypted', (req, res) => {
  const latestEncryptedFile = getLatestFile('uploads_output', 'enc_');
  if (!latestEncryptedFile) {
      return res.status(404).json({ error: 'No encrypted file available for download.' });
  }
  else {
    console.log('file found!');
    console.log(latestEncryptedFile);
  }
  const fileName = path.basename(latestEncryptedFile);
  const path_outputfile = path.join(__dirname, latestEncryptedFile);
  res.sendFile(path_outputfile, (err) => {
    if (err) {
        console.error('Error sending file:', err);
        res.status(500).send('Error occurred while downloading the file');
    } else {
        console.log('File sent successfully');
    }
});
});
app.get('/download-decrypted', (req, res) => {
  const latestDecryptedFile = getLatestFile('uploads_output', 'dec_');
  if (!latestDecryptedFile) {
      return res.status(404).json({ error: 'No decrypted file available for download.' });
  }
  const fileName = path.basename(latestDecryptedFile);
  const path_outputfile = path.join(__dirname, latestDecryptedFile ) ;
  res.sendFile(path_outputfile, (err) => {
    if (err) {
        console.error('Error sending file:', err);
        res.status(500).send('Error occurred while downloading the file');
    } else {
        console.log('File sent successfully');
    }
});
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

