
import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

// --- Create the Gemini AI client ---
// We do this outside the handler so it's reused on subsequent calls
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// --- The POST handler for the /api/voice route ---
export async function POST(req: NextRequest) {
  if (!req.body) {
    return new Response('No request body', { status: 400 });
  }

  try {
    // --- Set up the duplex stream ---
    // A TransformStream is a perfect fit for this kind of two-way communication.
    const { readable: clientToGeminiStream, writable: clientAudioWriter } = new TransformStream();
    const { readable: geminiToClientStream, writable: geminiAudioWriter } = new TransformStream();

    // --- Start the live conversation with Gemini ---
    // This is the core of the real-time interaction.
    const historyParam = req.nextUrl.searchParams.get('history');
    const history = historyParam ? JSON.parse(historyParam) : [];

    const conversation = ai.lms.startConversation({ history });
    
    conversation.sendMessageStream(clientToGeminiStream).then(async (streamResult) => {
        for await (const chunk of streamResult.stream) {
            if (chunk.audio) {
                geminiAudioWriter.write(new Uint8Array(chunk.audio));
            } else if(chunk.text) {
                // If we get a text chunk, we'll wrap it in a simple JSON object
                // This makes it easy for the client to distinguish from audio
                const textPayload = JSON.stringify({ text: chunk.text });
                geminiAudioWriter.write(new TextEncoder().encode(textPayload));
            }
        }
        geminiAudioWriter.close();
    }).catch(e => {
        console.error("Gemini stream error:", e);
        geminiAudioWriter.abort(e);
    });

    // --- Pipe the client's audio stream into our TransformStream ---
    req.body.pipeTo(clientAudioWriter).catch(e => {
      console.error("Client stream pipe error:", e);
      clientAudioWriter.abort(e);
    });
    
    // --- Return the readable stream for the client ---
    // The client will read from this to get Gemini's audio and text responses.
    return new Response(geminiToClientStream, {
      headers: {
        'Content-Type': 'application/octet-stream',
      },
    });

  } catch (e: any) {
    console.error("Error in voice API handler:", e);
    return new Response(e.message || 'Internal Server Error', { status: 500 });
  }
}
