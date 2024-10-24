const express = require('express');
const next = require('next');
const http = require('http');
const { Server } = require('socket.io');
const { 
  TranscribeStreamingClient,
  StartStreamTranscriptionCommand
} = require("@aws-sdk/client-transcribe-streaming");

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const transcribeClient = new TranscribeStreamingClient({
  region: "us-west-2", // Ensure this matches your AWS region
});

app.prepare().then(() => {
  const server = express();
  const httpServer = http.createServer(server);
  const io = new Server(httpServer);

  io.on('connection', (socket) => {
    console.log('A user connected');

    let audioStream;
    let lastTranscript = '';
    let isTranscribing = false;

    socket.on('startTranscription', async () => {
      console.log('Starting transcription');
      isTranscribing = true;
      let buffer = Buffer.from('');

      audioStream = async function* () {
        while (isTranscribing) {
          const chunk = await new Promise(resolve => socket.once('audioData', resolve));
          if (chunk === null) break;
          buffer = Buffer.concat([buffer, Buffer.from(chunk)]);
          while(buffer.length >= 1024) {
            yield { AudioEvent: { AudioChunk: buffer.slice(0, 1024) } };
            buffer = buffer.slice(1024);
          }
        }
      };

      const command = new StartStreamTranscriptionCommand({
        LanguageCode: "en-US",
        MediaSampleRateHertz: 44100,
        MediaEncoding: 'pcm',
        AudioStream: audioStream()
      });

      try {
        console.log('Sending command to AWS Transcribe');
        const response = await transcribeClient.send(command);
        console.log('Received response from AWS Transcribe');

        for await (const event of response.TranscriptResultStream) {
          if (!isTranscribing) break;
          if (event.TranscriptEvent) {
            console.log('Received TranscriptEvent:', JSON.stringify(event.TranscriptEvent));
            const results = event.TranscriptEvent.Transcript.Results;
            if (results.length > 0 && results[0].Alternatives.length > 0) {
              const transcript = results[0].Alternatives[0].Transcript;
              const isFinal = !results[0].IsPartial;
              
              if (isFinal) {
                console.log('Emitting final transcription: ', transcript);
                console.log("++++++++++++++++++++++++ Transcript", transcript);
                socket.emit('transcription', { text: transcript, isFinal: true });
                lastTranscript = transcript;
                console.log("++++++++++++++++++++++++ Last Transcript", lastTranscript);
              } else  {
                const newPart = transcript.substring(lastTranscript.length);
                console.log("++++++++++++++++++++++++ New Part", newPart);
                if (newPart.trim() !== '') {
                  console.log('Emitting partial transcription:', newPart);
                  socket.emit('transcription', { text: newPart, isFinal: false });
                }
              }
            }
          }
        }
      } catch (error) {
        console.error("Transcription error:", error);
        socket.emit('error', 'Transcription error occurred: ' + error.message);
      }
    });

    socket.on('audioData', (data) => {
      if (isTranscribing) {
        socket.emit('audioData', data);
      }
    })

    socket.on('stopTranscription', () => {
      console.log('Stopping transcription');
      isTranscribing = false;
      audioStream = null;
      lastTranscript = '';
    })

    socket.on('disconnect', () => {
      console.log('User disconnected');
      isTranscribing = false;
      audioStream = null;
    });
  });

  server.all('*', (req, res) => {
    return handle(req, res);
  });

  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${PORT}`);
  });
});
